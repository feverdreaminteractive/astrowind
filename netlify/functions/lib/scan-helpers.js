// Shared helpers for the stack scanner: URL validation/SSRF guarding, HTML
// extraction, and simple in-memory rate limiting / caching (best-effort —
// serverless instances are ephemeral and not shared across regions).
import { lookup } from 'node:dns/promises';

export const USER_AGENT = 'RyanClaytonStackAuditBot/1.0 (+https://ryanclayton.io/stack-audit)';
export const FETCH_TIMEOUT_MS = 10_000;
export const MAX_BYTES = 3 * 1024 * 1024; // 3MB cap on the fetched page

const PRIVATE_HOSTNAMES = new Set(['localhost', '0.0.0.0', '::1']);

function isPrivateIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b] = parts;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata)
  return false;
}

function isPrivateIPv6(ip) {
  const lower = ip.toLowerCase();
  return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80');
}

/**
 * Validates and normalizes a user-supplied URL, rejecting anything that
 * could point at internal infrastructure (SSRF guard). Resolves DNS to
 * catch hostnames that resolve to a private address (DNS rebinding).
 */
export async function normalizeAndValidateUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('A URL is required.');
  }

  let candidate = rawUrl.trim();
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('That doesn\'t look like a valid URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http/https URLs are supported.');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (PRIVATE_HOSTNAMES.has(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('That host isn\'t scannable.');
  }

  try {
    const { address } = await lookup(hostname);
    if (isPrivateIPv4(address) || isPrivateIPv6(address)) {
      throw new Error('That host isn\'t scannable.');
    }
  } catch (err) {
    if (err.message === 'That host isn\'t scannable.') throw err;
    throw new Error('Could not resolve that host.');
  }

  return parsed.toString();
}

/** Fetches a URL with a timeout and a hard cap on response size. */
export async function fetchPage(targetUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
    });

    if (!res.ok) {
      throw new Error(`Site responded with ${res.status}.`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('xhtml')) {
      throw new Error('That URL didn\'t return an HTML page.');
    }

    const cookieNames = new Set();
    const setCookie = typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : []);
    for (const entry of setCookie) {
      const name = entry.split('=')[0]?.trim();
      if (name) cookieNames.add(name);
    }

    const reader = res.body.getReader();
    const chunks = [];
    let received = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      if (received > MAX_BYTES) {
        controller.abort();
        throw new Error('That page is too large to scan.');
      }
      chunks.push(value);
    }

    const html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf-8');
    return { html, cookieNames, finalUrl: res.url || targetUrl };
  } finally {
    clearTimeout(timer);
  }
}

function extractAttr(tag, attr) {
  const match = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match ? match[1] : null;
}

/** Pulls scripts, links, iframes, images, and forms out of raw HTML via regex (no DOM dependency). */
export function extractSignals(html) {
  const scriptTags = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const externalScriptUrls = [];
  const inlineScriptChunks = [];

  for (const [, attrs, body] of scriptTags) {
    const src = extractAttr(attrs, 'src');
    if (src) externalScriptUrls.push(src);
    else if (body.trim()) inlineScriptChunks.push(body);
  }

  const linkUrls = [...html.matchAll(/<link\b([^>]*)>/gi)]
    .map(([, attrs]) => extractAttr(attrs, 'href'))
    .filter(Boolean);
  const iframeUrls = [...html.matchAll(/<iframe\b([^>]*)>/gi)]
    .map(([, attrs]) => extractAttr(attrs, 'src'))
    .filter(Boolean);
  const imgUrls = [...html.matchAll(/<img\b([^>]*)>/gi)]
    .map(([, attrs]) => extractAttr(attrs, 'src'))
    .filter(Boolean);

  const formActions = [...html.matchAll(/<form\b([^>]*)>/gi)]
    .map(([, attrs]) => extractAttr(attrs, 'action'))
    .filter((action) => action && action !== '#' && !action.startsWith('javascript:'));

  const allUrls = [...externalScriptUrls, ...linkUrls, ...iframeUrls, ...imgUrls];

  const scriptHosts = new Set();
  for (const src of externalScriptUrls) {
    try {
      scriptHosts.add(new URL(src, 'https://placeholder.invalid').hostname.toLowerCase());
    } catch {
      // relative/malformed URL — ignore for host matching, it still counts toward urlSubstring
    }
  }

  return {
    inlineScriptText: inlineScriptChunks.join('\n'),
    inlineScriptBytes: inlineScriptChunks.reduce((sum, c) => sum + Buffer.byteLength(c, 'utf-8'), 0),
    externalScriptCount: externalScriptUrls.length,
    inlineScriptCount: inlineScriptChunks.length,
    scriptHosts,
    allUrls,
    formActions: [...new Set(formActions)],
    hasDataLayer: /window\.dataLayer\s*=|dataLayer\.push\(/.test(html),
  };
}

// ---- Best-effort in-memory rate limiting + short cache (per warm instance) ----

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = { scan: 6, analyze: 4 };
const rateLimitHits = new Map();

export function checkRateLimit(ip, bucket = 'scan') {
  const key = `${bucket}:${ip}`;
  const max = RATE_LIMIT_MAX[bucket] ?? 6;
  const now = Date.now();
  const hits = (rateLimitHits.get(key) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (hits.length >= max) return false;
  hits.push(now);
  rateLimitHits.set(key, hits);
  return true;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const scanCache = new Map();

export function getCached(key) {
  const entry = scanCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) return entry.data;
  return null;
}

export function setCached(key, data) {
  scanCache.set(key, { data, timestamp: Date.now() });
}
