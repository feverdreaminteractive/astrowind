// AEO Visibility Checker — runs a single buyer question through Claude with
// web search enabled, so the answer reflects current retrievable content
// rather than training data alone. One question per call; the frontend fires
// several of these concurrently (capped) so results stream in as they land.
import { callClaude, extractText, extractWebSearchSources } from './lib/claude-client.js';
import { checkRateLimit } from './lib/scan-helpers.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });

const SYSTEM_PROMPT = `You are a helpful research assistant answering a question from someone evaluating options in a market. Search the web as needed and answer naturally and normally, the way you'd answer anyone — don't skew toward or away from any particular company. Be concise: a few sentences to a short paragraph, mentioning specific vendors by name where relevant, as you normally would.`;

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
    data = await callClaude(
      {
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: question }],
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 2 }],
        output_config: { effort: 'low' },
      },
      // Web search latency is inherently variable — even a single sequential
      // call occasionally exceeds 20s. This bounds the true worst case (a
      // hung request) without punishing normal variance; the frontend treats
      // a timeout as a soft per-question failure and keeps the rest running.
      { timeoutMs: 35_000 }
    );
  } catch (err) {
    return jsonResponse({ error: err.message }, err.status || 502);
  }

  const answerText = extractText(data);
  const sources = extractWebSearchSources(data);

  return jsonResponse({ questionId: body.questionId ?? null, question, answerText, sources });
};
