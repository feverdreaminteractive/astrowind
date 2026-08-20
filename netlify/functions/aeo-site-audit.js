// AEO Visibility Checker — site-side structural audit endpoint. No LLM
// involved; pure signal extraction. See lib/aeo-site-audit.js.
import { normalizeAndValidateUrl, checkRateLimit } from './lib/scan-helpers.js';
import { auditSite } from './lib/aeo-site-audit.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });

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

  if (!checkRateLimit(ip, 'scan')) {
    return jsonResponse({ error: 'Too many requests from this connection. Try again in a minute.' }, 429);
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

  try {
    const audit = await auditSite(targetUrl);
    return jsonResponse({ url: targetUrl, ...audit });
  } catch (err) {
    const message = err.name === 'AbortError' ? 'That site took too long to respond.' : err.message;
    return jsonResponse({ error: message }, 502);
  }
};
