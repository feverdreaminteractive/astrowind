// Perplexity API client for the AEO checker's per-question web-search step.
// Swapped in for Claude's web_search tool (see aeo-run-question.js) because
// Perplexity's sonar models are purpose-built for fast search+answer —
// Claude's agentic web_search tool call regularly took 15-25s end to end
// (confirmed live), close enough to Netlify's synchronous function ceiling
// to cause real timeouts. Question generation and final analysis stay on
// Claude (lib/claude-client.js) — neither needs live search, just reasoning
// and structured output, which Claude already does well.
const API_URL = 'https://api.perplexity.ai/chat/completions';

export function resolvePerplexityCredentials() {
  if (!process.env.PERPLEXITY_API_KEY) return null;
  return { authHeaders: { Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}` } };
}

/**
 * Calls Perplexity's chat completions endpoint (OpenAI-compatible request
 * shape). Returns the parsed response body on success. Throws a plain Error
 * with a user-safe message on any failure — callers turn that into a JSON
 * error response, same convention as callClaude.
 */
export async function callPerplexity(request, { timeoutMs } = {}) {
  const creds = resolvePerplexityCredentials();
  if (!creds) {
    const err = new Error('Web search service is not configured.');
    err.status = 500;
    throw err;
  }

  const controller = timeoutMs ? new AbortController() : null;
  const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;

  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...creds.authHeaders },
      body: JSON.stringify(request),
      signal: controller?.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error('The web search service took too long to respond.');
      e.status = 504;
      throw e;
    }
    console.error('Perplexity API request failed:', err);
    const e = new Error('Could not reach the web search service.');
    e.status = 502;
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('Perplexity API error response:', response.status, errorText);
    const e = new Error(response.status === 429 ? 'Web search rate limit hit — try again shortly.' : 'The web search service returned an error.');
    e.status = 502;
    throw e;
  }

  return response.json();
}

/**
 * Extracts the answer text from a Perplexity chat completion response,
 * stripping inline [1][2] citation markers — sources are shown separately
 * as plain links (see extractPerplexitySources), not numbered to match, so
 * the bracket markers would just be confusing noise in the answer text.
 */
export function extractPerplexityText(data) {
  const text = data?.choices?.[0]?.message?.content || '';
  return text.replace(/\[\d+\]/g, '').replace(/ {2,}/g, ' ').trim();
}

/**
 * Extracts {title, url} sources. Perplexity has shipped a couple of shapes
 * over time — `search_results` (objects with title/url/date) is preferred
 * when present; `citations` (bare URL strings) is the older fallback.
 */
export function extractPerplexitySources(data) {
  if (Array.isArray(data?.search_results)) {
    return data.search_results.filter((r) => r?.url).map((r) => ({ title: r.title || r.url, url: r.url }));
  }
  if (Array.isArray(data?.citations)) {
    return data.citations.filter(Boolean).map((url) => ({ title: url, url }));
  }
  return [];
}
