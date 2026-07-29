// Netlify Function for AI Shader Generation

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body, statusCode = 200) =>
  new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });

export default async (req, context) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('OK', { status: 200, headers: CORS_HEADERS });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405);
  }

  try {
    const { prompt, task = 'generate-shader' } = await req.json();

    if (!prompt) {
      return jsonResponse({ error: 'Prompt is required' }, 400);
    }

    // Get Claude API key from environment
    const apiKey = process.env.CLAUDE_API_KEY;

    if (!apiKey) {
      console.error('Claude API key not configured');
      return jsonResponse({ error: 'AI service not configured' }, 500);
    }

    console.log('Using Claude API with model: claude-haiku-4-5-20251001');

    // System prompt for GLSL shader generation
    const systemPrompt = `You are an expert GLSL shader developer. Generate creative fragment shaders for WebGL.
The shader MUST start with these exact lines:
#ifdef GL_ES
precision mediump float;
#endif

uniform float time;
uniform vec2 resolution;
uniform vec2 mouse;

Create a visually interesting animated pattern based on the user's description.
Return ONLY the raw GLSL shader code, no explanations, no markdown, no backticks.
The code should start with the precision declaration and end with the main function.`;

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        temperature: 0.8,
        system: systemPrompt,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      return jsonResponse({ error: 'Failed to generate shader' }, 500);
    }

    const data = await response.json();
    const shaderCode = data.content?.[0]?.text;

    if (!shaderCode) {
      return jsonResponse({ error: 'No shader generated' }, 500);
    }

    // Clean up the shader code (remove any markdown formatting if present)
    const cleanedCode = shaderCode
      .replace(/```glsl\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return jsonResponse({
      code: cleanedCode,
      task: task,
      prompt: prompt
    });

  } catch (error) {
    console.error('Shader generation error:', error);
    return jsonResponse({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
};