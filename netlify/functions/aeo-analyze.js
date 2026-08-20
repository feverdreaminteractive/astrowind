// AEO Visibility Checker — final analysis. Reads every question/answer pair
// (plus the optional site audit) and produces the structured read: does the
// brand show up, how is it described, what's factually wrong, who's telling
// its story instead, and what to fix first.
import { callClaude, extractText } from './lib/claude-client.js';
import { checkRateLimit } from './lib/scan-helpers.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });

const SYSTEM_PROMPT = `You are analyzing how a brand shows up in AI assistant answers. You'll receive a set of buyer questions, the answers Claude actually gave (with web search), and the sources each answer cited — plus, if provided, a structural audit of the brand's own website.

Be specific and concrete. Ground every claim in the actual answer text and sources given — never invent a competitor, source, or error that isn't supported by what's in front of you. Keep every point to one or two sentences.

For each question, judge the brand's prominence in that answer: "first" (named early/prominently), "listed" (mentioned but not prominent), or "absent" (not mentioned at all).

Identify competitors: any other named company that appears across the answers, roughly ranked by how often it shows up.

Characterize how the brand is described where it does appear — positive, neutral, dated, hedged — in a sentence or two. If it never appears, say that plainly instead of guessing.

Factual errors: read the answer text for anything stated about the brand that looks wrong, outdated, or contradicts what a well-known source would say (e.g. a wrong founding year, a discontinued product described as current, a wrong pricing model, a wrong parent company). If you're not confident something is actually wrong, don't flag it — a false positive here is worse than a miss. Empty array if you find nothing you're confident about; do not manufacture an error to fill the section.

Source attribution: group the cited source domains into owned (the brand's own site), review (G2, Capterra, TrustRadius, etc.), competitor (a rival's site, e.g. a "vs" or comparison page hosted by a competitor), forum (Reddit, Quora, HN), or other. Count how often each domain appears across all answers.

Gaps: name specific questions or scenarios where the brand should plausibly appear (given its category) but didn't.

If a site audit was provided, connect it to the visibility findings explicitly — e.g. "You're absent from N of M answers, and your homepage has no Organization schema and no plain-language description above the fold. Those are related." If no site audit was provided, return an empty array for siteConnections.

Recommendations: three to five, concrete, ordered by impact. Prefer fixes that address both a site-structure gap and a visibility gap at once when the evidence supports it.

This reflects one model's answers on one run — say nothing that implies universal or permanent truth about the brand's AI visibility.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    questionResults: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          questionId: { type: 'string' },
          prominence: { type: 'string', enum: ['first', 'listed', 'absent'] },
        },
        required: ['questionId', 'prominence'],
        additionalProperties: false,
      },
    },
    competitors: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, mentionCount: { type: 'integer' } },
        required: ['name', 'mentionCount'],
        additionalProperties: false,
      },
    },
    characterization: { type: 'string' },
    factualErrors: { type: 'array', items: { type: 'string' } },
    sourceAttribution: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          domain: { type: 'string' },
          category: { type: 'string', enum: ['owned', 'review', 'competitor', 'forum', 'other'] },
          mentionCount: { type: 'integer' },
        },
        required: ['domain', 'category', 'mentionCount'],
        additionalProperties: false,
      },
    },
    gaps: { type: 'array', items: { type: 'string' } },
    siteConnections: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
  },
  required: ['questionResults', 'competitors', 'characterization', 'factualErrors', 'sourceAttribution', 'gaps', 'siteConnections', 'recommendations'],
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

  if (!checkRateLimit(ip, 'aeo-analyze')) {
    return jsonResponse({ error: 'Too many requests from this connection. Try again in a minute.' }, 429);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400);
  }

  const company = (body.company || '').trim();
  const results = Array.isArray(body.results) ? body.results : [];
  if (!company || results.length === 0) {
    return jsonResponse({ error: 'Missing company or question results to analyze.' }, 400);
  }

  const userMessage = JSON.stringify({
    company,
    results: results.map((r) => ({
      questionId: r.questionId,
      question: r.question,
      type: r.type,
      answerText: r.answerText,
      sourceDomains: (r.sources || []).map((s) => {
        try {
          return new URL(s.url).hostname.replace(/^www\./, '');
        } catch {
          return s.url;
        }
      }),
    })),
    siteAudit: body.siteAudit || null,
  });

  let data;
  try {
    data = await callClaude(
      {
        model: 'claude-sonnet-5',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
        output_config: { effort: 'low', format: { type: 'json_schema', schema: RESPONSE_SCHEMA } },
      },
      { timeoutMs: 30_000 }
    );
  } catch (err) {
    return jsonResponse({ error: err.message }, err.status || 502);
  }

  if (data.stop_reason === 'max_tokens') {
    console.error('AEO analysis hit max_tokens — response was truncated');
    return jsonResponse({ error: 'The analysis ran out of room. Try again with fewer questions.' }, 502);
  }

  let analysis;
  try {
    analysis = JSON.parse(extractText(data));
  } catch {
    console.error('Failed to parse AEO analysis JSON:', extractText(data));
    return jsonResponse({ error: 'The analysis came back malformed. Try again.' }, 502);
  }

  const appearedIn = analysis.questionResults.filter((q) => q.prominence !== 'absent').length;

  return jsonResponse({
    analysis: {
      ...analysis,
      visibility: { appearedIn, totalQuestions: results.length },
    },
  });
};
