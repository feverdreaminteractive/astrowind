// Martech Stack Auditor — analysis. Takes the structured detection result
// from stack-scan.js and asks Claude to read it the way a senior marketing
// ops architect would on day one of a new job. Stateless: the scan result is
// passed in by the client, nothing is persisted here.
import { checkRateLimit } from './lib/scan-helpers.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });

const SYSTEM_PROMPT = `You are a senior marketing operations architect. You've just been handed a scan of a company's website — the martech tools detected on it, with confidence levels and evidence, plus a few page-level signals (whether a consent manager or dataLayer is present, form endpoints found, script counts).

This is the diagnostic you'd run on day one of a new job: what does this stack say about how this company operates?

Be specific and opinionated, never hedged. "You're running LinkedIn Insight and Meta pixels without a tag manager, so any change to tracking requires a developer and a deploy" is useful. "Consider evaluating your tag management strategy" is not — never write sentences like that.

Ground every claim in the evidence you were given. Don't invent tools that weren't detected, and don't claim certainty the confidence levels don't support — a "medium" confidence detection is worth hedging on ("likely running X") while "high" confidence isn't.

Cover, in order. Keep every point to one or two sentences — density over volume:
1. Stack summary — what this setup says about how the company operates (enterprise vs. scrappy, sales-led vs. PLG, mature vs. accumulated-by-accident). Two or three sentences total.
2. Redundancies — at most 2, overlapping tools doing the same job. If there are none, say so plainly rather than inventing one.
3. Gaps — at most 3, missing pieces the detected stack implies are needed: forms with no automation platform behind them, ad pixels with no tag manager, analytics with no consent management, intent/ABM tooling with no personalization layer to act on it.
4. Data flow risks — at most 3, where attribution likely breaks, where lead routing probably has holes.
5. What I'd do first — exactly three prioritized recommendations, ordered by impact.

If almost nothing was detected, that is itself a finding — say plainly that the site is running minimal or no visible martech, and what that implies, rather than padding with speculation.`;

function buildUserMessage(scanResult) {
  return JSON.stringify({
    url: scanResult.url,
    detectedTools: scanResult.detected,
    pageSignals: scanResult.signals,
  });
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    redundancies: { type: 'array', items: { type: 'string' } },
    gaps: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'redundancies', 'gaps', 'risks', 'recommendations'],
  additionalProperties: false,
};

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

  if (!checkRateLimit(ip, 'analyze')) {
    return jsonResponse({ error: 'Too many analyses from this connection. Try again in a minute.' }, 429);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400);
  }

  if (!body.scan || !Array.isArray(body.scan.detected)) {
    return jsonResponse({ error: 'Missing scan result to analyze.' }, 400);
  }

  // Resolve AI credentials the same way the career-assistant function does:
  // prefer the Netlify AI Gateway (injected as ANTHROPIC_API_KEY / ANTHROPIC_BASE_URL),
  // then the raw gateway variables, then a directly-configured Anthropic key.
  let apiUrl;
  let authHeaders;

  if (process.env.ANTHROPIC_BASE_URL && process.env.ANTHROPIC_API_KEY) {
    apiUrl = `${process.env.ANTHROPIC_BASE_URL.replace(/\/$/, '')}/v1/messages`;
    authHeaders = { 'x-api-key': process.env.ANTHROPIC_API_KEY };
  } else if (process.env.NETLIFY_AI_GATEWAY_BASE_URL && process.env.NETLIFY_AI_GATEWAY_KEY) {
    apiUrl = `${process.env.NETLIFY_AI_GATEWAY_BASE_URL.replace(/\/$/, '')}/anthropic/v1/messages`;
    authHeaders = { Authorization: `Bearer ${process.env.NETLIFY_AI_GATEWAY_KEY}` };
  } else if (process.env.CLAUDE_API_KEY) {
    apiUrl = 'https://api.anthropic.com/v1/messages';
    authHeaders = { 'x-api-key': process.env.CLAUDE_API_KEY };
  } else {
    console.error('No AI credentials found in environment');
    return jsonResponse({ error: 'Analysis is not configured. Please contact support.' }, 500);
  }

  const claudeRequest = {
    // Opus 5 couldn't hit the brief's ~15s budget even at its fastest
    // configuration (low effort: ~30s; thinking disabled: ~45s, since the
    // model just wrote more without it). Sonnet 5 at low effort lands the
    // same specificity in ~18s, and a tighter prompt below closes the rest
    // of the gap. This is a latency call, not a quality/cost downgrade.
    model: 'claude-sonnet-5',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(body.scan) }],
    output_config: { effort: 'low', format: { type: 'json_schema', schema: RESPONSE_SCHEMA } },
  };

  let response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(claudeRequest),
    });
  } catch (err) {
    console.error('Claude API request failed:', err);
    return jsonResponse({ error: 'Could not reach the analysis service.' }, 502);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('Claude API error response:', errorText);
    return jsonResponse({ error: 'The analysis service returned an error.' }, 502);
  }

  const data = await response.json();

  if (data.stop_reason === 'refusal') {
    return jsonResponse({ error: 'The analysis was declined. Try a different URL.' }, 422);
  }

  const textBlock = data.content?.find((b) => b.type === 'text');
  if (!textBlock) {
    return jsonResponse({ error: 'The analysis service returned no output.' }, 502);
  }

  let analysis;
  try {
    analysis = JSON.parse(textBlock.text);
  } catch (err) {
    console.error('Failed to parse analysis JSON:', textBlock.text);
    return jsonResponse({ error: 'The analysis came back malformed. Try again.' }, 502);
  }

  return jsonResponse({ analysis });
};
