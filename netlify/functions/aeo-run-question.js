// AEO Visibility Checker — runs a single buyer question through Perplexity's
// web-search-augmented sonar model, so the answer reflects current
// retrievable content rather than training data alone. One question per
// call; the frontend fires several of these concurrently (capped) so
// results stream in as they land.
//
// This was Claude with the web_search tool until the switch to Perplexity —
// Claude's agentic search loop regularly took 15-25s end to end for a
// single question (confirmed live: a direct call clocked 20.4s even at
// max_uses 1), close enough to Netlify's synchronous function ceiling that
// runs kept timing out. Perplexity's sonar models are purpose-built for
// search+answer in one pass instead of an agentic tool loop, so this should
// be meaningfully faster — question generation and final analysis stay on
// Claude (lib/claude-client.js), since neither needs live search.
import { callPerplexity, extractPerplexityText, extractPerplexitySources } from './lib/perplexity-client.js';
import { checkRateLimit } from './lib/scan-helpers.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });

const SYSTEM_PROMPT = `You are a helpful research assistant answering a question from someone evaluating options in a market. Search the web as needed and answer naturally and normally, the way you'd answer anyone — don't skew toward or away from any particular company. Be concise: a few sentences to a short paragraph, mentioning specific vendors by name where relevant, as you normally would. Plain conversational prose only — no markdown formatting, no bold text, no headers, no bullet lists; this gets displayed as plain text, not rendered markdown.`;

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

  if (!checkRateLimit(ip, 'aeo-question-run')) {
    return jsonResponse({ error: 'Too many requests from this connection. Try again in a minute.' }, 429);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400);
  }

  const question = (body.question || '').trim();
  if (!question) {
    return jsonResponse({ error: 'A question is required.' }, 400);
  }

  let data;
  try {
    data = await callPerplexity(
      {
        model: 'sonar',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: question },
        ],
      },
      // Generous safety net, not the expected case — sonar should typically
      // answer in a few seconds, well under this. Still kept comfortably
      // under Netlify's 26s synchronous ceiling so a genuinely slow call
      // fails via our own clean JSON error instead of racing a raw 504.
      { timeoutMs: 20_000 }
    );
  } catch (err) {
    return jsonResponse({ error: err.message }, err.status || 502);
  }

  const answerText = extractPerplexityText(data);
  const sources = extractPerplexitySources(data);

  return jsonResponse({ questionId: body.questionId ?? null, question, answerText, sources });
};
