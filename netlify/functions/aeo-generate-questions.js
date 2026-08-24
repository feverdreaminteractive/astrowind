// AEO Visibility Checker — question generation. Infers the buyer's category
// from a company name (+ optional URL) and generates realistic pre-purchase
// questions, mixing branded and unbranded so the unbranded ones can reveal
// whether the brand exists in the model's answer space at all.
import { callClaude, extractText } from './lib/claude-client.js';
import { checkRateLimit } from './lib/scan-helpers.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });

// Lower this and the run phase gets faster (each question is a real web
// search — see aeo-run-question.js): at CONCURRENCY 2 in AeoChecker.tsx,
// 4 questions is 2 sequential waves instead of 3 for 6.
const QUESTION_COUNT = 4;

const SYSTEM_PROMPT = `You generate the questions a real buyer would ask an AI assistant while researching a purchase in a category — before they've decided which vendor to use.

Given a company name (and optionally its website), infer what category it competes in, then write exactly ${QUESTION_COUNT} questions a real buyer would plausibly ask an assistant like Claude or ChatGPT during that research. Mix two kinds:

- Unbranded questions — no company name mentioned. "What's the best tool for X?", "How do I choose between options for Y?", "What are alternatives to [the category leader]?" These are the ones that reveal whether the brand exists in the model's answer space at all.
- Branded questions — name the company directly. "Is [brand] good for [specific use case]?", "How does [brand] compare to [a real competitor]?"

Never write "What is [brand]?" — that's a softball that tells you nothing. Aim for roughly half unbranded, half branded. Ground unbranded questions in the specific category and use cases this company actually serves, not generic software-buyer questions.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    category: { type: 'string' },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          type: { type: 'string', enum: ['branded', 'unbranded'] },
        },
        required: ['text', 'type'],
        additionalProperties: false,
      },
    },
  },
  required: ['category', 'questions'],
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

  if (!checkRateLimit(ip, 'aeo-questions')) {
    return jsonResponse({ error: 'Too many requests from this connection. Try again in a minute.' }, 429);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400);
  }

  const company = (body.company || '').trim();
  if (!company) {
    return jsonResponse({ error: 'A company name is required.' }, 400);
  }
  const url = (body.url || '').trim();

  const userMessage = url ? `Company: ${company}\nWebsite: ${url}` : `Company: ${company}`;

  let data;
  try {
    data = await callClaude(
      {
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
        output_config: { effort: 'low', format: { type: 'json_schema', schema: RESPONSE_SCHEMA } },
      },
      { timeoutMs: 15_000 }
    );
  } catch (err) {
    return jsonResponse({ error: err.message }, err.status || 502);
  }

  let parsed;
  try {
    parsed = JSON.parse(extractText(data));
  } catch {
    return jsonResponse({ error: 'Could not generate questions. Try again.' }, 502);
  }

  const questions = (parsed.questions || []).map((q, i) => ({
    id: `q${i}`,
    text: q.text,
    type: q.type === 'branded' ? 'branded' : 'unbranded',
  }));

  return jsonResponse({ category: parsed.category, questions });
};
