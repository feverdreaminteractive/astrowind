// AEO Visibility Checker — site-side structural audit. No LLM involved here;
// this is pure extraction of the signals that determine whether a model can
// cleanly lift facts about a company off its site. Fetches at most four URLs
// (homepage, /robots.txt, /llms.txt, /sitemap.xml) — no crawling beyond that.
// Deliberately the fast, always-fast tier of the checker (see AeoChecker.tsx)
// — every signal here comes from HTML/text already fetched, no LLM calls.
import { USER_AGENT, FETCH_TIMEOUT_MS } from './scan-helpers.js';

const AI_CRAWLERS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended'];

// Schema.org types that actually matter for AEO — the ones that let a model
// (or Google's AI Overviews) lift structured facts directly instead of
// guessing from prose. Any JSON-LD block can declare dozens of types; this
// is just what to call out as present/missing.
const KEY_SCHEMA_TYPES = ['Organization', 'FAQPage', 'Product', 'SoftwareApplication', 'WebSite', 'BreadcrumbList'];

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractJsonLdTypes(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const types = new Set();
  let parsedOk = 0;

  for (const [, raw] of blocks) {
    try {
      const parsed = JSON.parse(raw.trim());
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      for (const entry of entries) {
        const graph = entry['@graph'] ? entry['@graph'] : [entry];
        for (const node of graph) {
          if (node && node['@type']) {
            const t = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
            t.forEach((x) => types.add(x));
          }
        }
      }
      parsedOk += 1;
    } catch {
      // malformed JSON-LD block — skip it, still counts toward "markup present" below
    }
  }

  return { types: [...types], blockCount: blocks.length, parsedOk };
}

function extractHeadingStructure(html) {
  const headings = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map(([, level, text]) => ({ level: Number(level), text: text.replace(/<[^>]+>/g, '').trim() }));

  const h1s = headings.filter((h) => h.level === 1);

  let skippedLevel = false;
  let prevLevel = 0;
  for (const h of headings) {
    if (prevLevel && h.level > prevLevel + 1) skippedLevel = true;
    prevLevel = h.level;
  }

  return { h1Count: h1s.length, h1Text: h1s[0]?.text || null, totalHeadings: headings.length, skippedLevel };
}

function extractAboveFoldDescription(html) {
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*)/i);
  const bodyStart = bodyMatch ? bodyMatch[1].slice(0, 4000) : html.slice(0, 4000);
  const firstParaMatch = bodyStart.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
  const text = firstParaMatch ? firstParaMatch[1].replace(/<[^>]+>/g, '').trim() : null;

  const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
    || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);

  return {
    metaDescription: metaDescMatch ? metaDescMatch[1].trim() : null,
    firstParagraph: text && text.length > 20 ? text : null,
  };
}

function extractComparisonSignals(html) {
  const anchors = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const faqLinks = [];
  const comparisonLinks = [];

  for (const [, href, inner] of anchors) {
    const text = inner.replace(/<[^>]+>/g, '').trim().toLowerCase();
    const combined = `${href} ${text}`.toLowerCase();
    if (/faq|frequently[- ]asked/.test(combined)) faqLinks.push(href);
    else if (/\bvs\b|compare|comparison|alternatives?/.test(combined)) comparisonLinks.push(href);
  }

  return {
    hasFaqLink: faqLinks.length > 0,
    hasComparisonLink: comparisonLinks.length > 0,
  };
}

function extractCanonical(html) {
  const match = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)
    || html.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  return { present: !!match, url: match ? match[1] : null };
}

function extractOpenGraph(html) {
  const has = (prop) => new RegExp(`<meta\\s+[^>]*property=["']og:${prop}["'][^>]*content=["']([^"']*)["']`, 'i').test(html)
    || new RegExp(`<meta\\s+[^>]*content=["']([^"']*)["'][^>]*property=["']og:${prop}["']`, 'i').test(html);
  return { titlePresent: has('title'), descriptionPresent: has('description'), imagePresent: has('image') };
}

function extractFreshnessSignals(html, lastModifiedHeader) {
  const dateMatches = html.match(/\b(20[2-9]\d)[-/]\d{1,2}[-/]\d{1,2}\b/g) || [];
  const updatedTextMatch = html.match(/\b(updated|last updated|published)\s*[:\-]?\s*[A-Za-z0-9 ,]{4,20}/i);

  return {
    httpLastModified: lastModifiedHeader || null,
    visibleDateFound: dateMatches.length > 0,
    updatedLabelFound: !!updatedTextMatch,
  };
}

export async function auditSite(siteUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let html;
  let lastModified;
  try {
    const res = await fetch(siteUrl, { signal: controller.signal, headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' } });
    if (!res.ok) throw new Error(`Site responded with ${res.status}.`);
    lastModified = res.headers.get('last-modified');
    html = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const origin = new URL(siteUrl).origin;
  const [robotsTxt, llmsTxt, sitemapXml] = await Promise.all([
    fetchText(`${origin}/robots.txt`),
    fetchText(`${origin}/llms.txt`),
    fetchText(`${origin}/sitemap.xml`),
  ]);

  const crawlerAccess = {};
  if (robotsTxt) {
    for (const bot of AI_CRAWLERS) {
      const blockPattern = new RegExp(`User-agent:\\s*${bot}\\s*\\n(?:Disallow:\\s*/\\s*\\n?)+`, 'i');
      const sectionMatch = robotsTxt.match(new RegExp(`User-agent:\\s*${bot}[\\s\\S]*?(?=User-agent:|$)`, 'i'));
      if (!sectionMatch) {
        crawlerAccess[bot] = 'not mentioned';
      } else if (/Disallow:\s*\/\s*$/im.test(sectionMatch[0])) {
        crawlerAccess[bot] = 'blocked';
      } else {
        crawlerAccess[bot] = 'allowed';
      }
    }
  }

  const jsonLd = extractJsonLdTypes(html);
  const headings = extractHeadingStructure(html);
  const description = extractAboveFoldDescription(html);
  const comparison = extractComparisonSignals(html);
  const freshness = extractFreshnessSignals(html, lastModified);
  const canonical = extractCanonical(html);
  const openGraph = extractOpenGraph(html);

  return {
    schema: {
      types: jsonLd.types,
      present: jsonLd.blockCount > 0,
      keyTypesPresent: KEY_SCHEMA_TYPES.filter((t) => jsonLd.types.includes(t)),
    },
    headings,
    description,
    comparison,
    freshness,
    canonical,
    openGraph,
    llmsTxtPresent: !!llmsTxt,
    robotsTxtPresent: !!robotsTxt,
    sitemapPresent: !!sitemapXml,
    aiCrawlerAccess: robotsTxt ? crawlerAccess : null,
  };
}
