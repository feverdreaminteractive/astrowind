// Shared Claude API credential resolution + request helper. Mirrors the
// cascade used by claude.js / stack-analyze.js: prefer the Netlify AI
// Gateway (injected as ANTHROPIC_API_KEY / ANTHROPIC_BASE_URL), then the raw
// gateway variables, then a directly-configured Anthropic key.
export function resolveClaudeCredentials() {
  if (process.env.ANTHROPIC_BASE_URL && process.env.ANTHROPIC_API_KEY) {
    return {
      apiUrl: `${process.env.ANTHROPIC_BASE_URL.replace(/\/$/, '')}/v1/messages`,
      authHeaders: { 'x-api-key': process.env.ANTHROPIC_API_KEY },
    };
  }
  if (process.env.NETLIFY_AI_GATEWAY_BASE_URL && process.env.NETLIFY_AI_GATEWAY_KEY) {
    return {
      apiUrl: `${process.env.NETLIFY_AI_GATEWAY_BASE_URL.replace(/\/$/, '')}/anthropic/v1/messages`,
      authHeaders: { Authorization: `Bearer ${process.env.NETLIFY_AI_GATEWAY_KEY}` },
    };
  }
  if (process.env.CLAUDE_API_KEY) {
    return {
      apiUrl: 'https://api.anthropic.com/v1/messages',
      authHeaders: { 'x-api-key': process.env.CLAUDE_API_KEY },
    };
  }
  return null;
}

/**
 * Calls the Messages API with the resolved credentials. Returns the parsed
 * response body on success. Throws a plain Error with a user-safe message on
 * any failure (network, non-2xx, refusal) — callers turn that into a JSON
 * error response.
 */
export async function callClaude(request, { timeoutMs } = {}) {
  const creds = resolveClaudeCredentials();
  if (!creds) {
    const err = new Error('AI service is not configured.');
    err.status = 500;
    throw err;
  }

  const controller = timeoutMs ? new AbortController() : null;
  const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;

  let response;
  try {
    response = await fetch(creds.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...creds.authHeaders, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(request),
      signal: controller?.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error('The AI service took too long to respond.');
      e.status = 504;
      throw e;
    }
    console.error('Claude API request failed:', err);
    const e = new Error('Could not reach the AI service.');
    e.status = 502;
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(
      'Claude API error response:', response.status,
      'retry-after:', response.headers.get('retry-after'),
      'ratelimit-remaining:', response.headers.get('anthropic-ratelimit-requests-remaining'),
      errorText
    );
    const e = new Error(response.status === 429 ? 'AI service rate limit hit — try again shortly.' : 'The AI service returned an error.');
    e.status = 502;
    throw e;
  }

  const data = await response.json();

  if (data.stop_reason === 'refusal') {
    const e = new Error('The request was declined by the AI service.');
    e.status = 422;
    throw e;
  }

  return data;
}

/** Extracts and joins all text blocks from a Messages API response. */
export function extractText(data) {
  return (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

/** Extracts unique {title, url} sources from web_search_tool_result blocks. */
export function extractWebSearchSources(data) {
  const seen = new Set();
  const sources = [];
  for (const block of data.content || []) {
    if (block.type !== 'web_search_tool_result') continue;
    const results = Array.isArray(block.content) ? block.content : [];
    for (const result of results) {
      if (result.type !== 'web_search_result' || !result.url) continue;
      if (seen.has(result.url)) continue;
      seen.add(result.url);
      sources.push({ title: result.title || result.url, url: result.url });
    }
  }
  return sources;
}
