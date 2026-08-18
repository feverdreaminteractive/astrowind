// Martech Stack Auditor — scanner. Fetches a page server-side and matches it
// against the signature library. Detection only — no AI analysis here (see
// stack-analyze.js). Stateless: nothing is persisted beyond a short in-memory
// cache to survive a traffic spike on one warm function instance.
import { SIGNATURES } from './lib/martech-signatures.js';
import {
  normalizeAndValidateUrl,
  fetchPage,
  extractSignals,
  checkRateLimit,
  getCached,
  setCached,
} from './lib/scan-helpers.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });

function truncate(str, max = 80) {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

const CONFIDENCE_RANK = { medium: 1, high: 2 };

function matchSignatures(signals, cookieNames, rawHtml) {
  const detected = [];

  for (const signature of SIGNATURES) {
    const evidence = [];
    let bestConfidence = null;

    for (const rule of signature.rules) {
      let matched = false;
      let matchDetail = '';

      switch (rule.type) {
        case 'scriptHost': {
          for (const hostVal of signals.scriptHosts) {
            if (hostVal === rule.value || hostVal.endsWith(`.${rule.value}`)) {
              matched = true;
              matchDetail = hostVal;
              break;
            }
          }
          break;
        }
        case 'urlSubstring': {
          const hit = signals.allUrls.find((u) => u.includes(rule.value));
          if (hit) {
            matched = true;
            matchDetail = hit;
          }
          break;
        }
        case 'inlineRegex': {
          const m = signals.inlineScriptText.match(rule.value);
          if (m) {
            matched = true;
            matchDetail = m[0];
          }
          break;
        }
        case 'domRegex': {
          const m = rawHtml.match(rule.value);
          if (m) {
            matched = true;
            matchDetail = m[0];
          }
          break;
        }
        case 'cookieName': {
          if (cookieNames.has(rule.value)) {
            matched = true;
            matchDetail = rule.value;
          }
          break;
        }
        default:
          break;
      }

      if (matched) {
        evidence.push({ type: rule.type, match: truncate(matchDetail) });
        if (!bestConfidence || CONFIDENCE_RANK[rule.confidence] > CONFIDENCE_RANK[bestConfidence]) {
          bestConfidence = rule.confidence;
        }
      }
    }

    if (bestConfidence) {
      detected.push({
        id: signature.id,
        name: signature.name,
        category: signature.category,
        vendor: signature.vendor,
        confidence: bestConfidence,
        evidence: evidence.slice(0, 3),
      });
    }
  }

  return detected.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

export default async (req, context) => {
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  const ip = req.headers.get('x-nf-client-connection-ip')
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';

  if (!checkRateLimit(ip)) {
    return jsonResponse({ error: 'Too many scans from this connection. Try again in a minute.' }, 429);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400);
  }

  let targetUrl;
  try {
    targetUrl = await normalizeAndValidateUrl(body.url);
  } catch (err) {
    return jsonResponse({ error: err.message }, 400);
  }

  const cached = getCached(targetUrl);
  if (cached) {
    return jsonResponse({ ...cached, cached: true });
  }

  let html;
  let finalUrl;
  let cookieNames;
  try {
    ({ html, finalUrl, cookieNames } = await fetchPage(targetUrl));
  } catch (err) {
    const message = err.name === 'AbortError' ? 'That site took too long to respond.' : err.message;
    return jsonResponse({ error: message }, 502);
  }

  const signals = extractSignals(html);
  const detected = matchSignatures(signals, cookieNames, html);

  const hasConsentManager = detected.some((d) => d.category === 'Consent');

  const result = {
    url: finalUrl,
    scannedAt: new Date().toISOString(),
    detected,
    signals: {
      hasConsentManager,
      hasDataLayer: signals.hasDataLayer,
      formEndpoints: signals.formActions,
      scriptCount: signals.externalScriptCount + signals.inlineScriptCount,
      externalScriptCount: signals.externalScriptCount,
      inlineScriptCount: signals.inlineScriptCount,
      inlineScriptBytes: signals.inlineScriptBytes,
    },
    caveat: 'This scan reads the server-rendered HTML only. Tools injected client-side after page load (e.g. via Google Tag Manager) may not appear here.',
  };

  setCached(targetUrl, result);

  return jsonResponse(result);
};
