import type { APIRoute } from 'astro';

export const prerender = false;

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const { prompt, task = 'generate-shader' } = await request.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get Claude API key from environment
    const apiKey = import.meta.env.CLAUDE_API_KEY || import.meta.env.VITE_CLAUDE_API_KEY || process.env.CLAUDE_API_KEY;

    if (!apiKey) {
      console.error('Claude API key not configured. Checked: import.meta.env.CLAUDE_API_KEY, import.meta.env.VITE_CLAUDE_API_KEY, process.env.CLAUDE_API_KEY');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
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
      return new Response(JSON.stringify({ error: 'Failed to generate shader' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const shaderCode = data.content?.[0]?.text;

    if (!shaderCode) {
      return new Response(JSON.stringify({ error: 'No shader generated' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Clean up the shader code (remove any markdown formatting if present)
    const cleanedCode = shaderCode
      .replace(/```glsl\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return new Response(JSON.stringify({
      code: cleanedCode,
      task: task,
      prompt: prompt
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Shader generation error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};