import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Play, Pause, RotateCcw, Download, Sparkles, Loader2 } from 'lucide-react';

interface GLSLShaderEditorProps {
  aiTeamEndpoint?: string;
}

const DEFAULT_SHADER = `#ifdef GL_ES
precision mediump float;
#endif

uniform float time;
uniform vec2 resolution;
uniform vec2 mouse;

float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), f);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main(void) {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec2 center = vec2(0.5, 0.5);
    vec2 p = uv - center;

    float dist = length(p);
    float angle = atan(p.y, p.x);

    float mouseInfluence = length(mouse - uv) * 0.5;
    float t = time * 0.5 + mouseInfluence;

    float kaleidoscope = abs(sin(angle * 6.0 + t));
    kaleidoscope = mix(kaleidoscope, abs(cos(angle * 8.0 - t * 1.3)), 0.5);

    float gooey = sin(dist * 8.0 - t) * cos(angle * 4.0 + t * 0.7);
    gooey += sin(dist * 5.0 + t * 1.5) * 0.5;
    gooey = smoothstep(-1.0, 1.0, gooey);

    float feedback = sin(time * 3.5) * 0.5 + 0.5;
    float strobe = step(0.5, mod(time * 4.0, 1.0));
    feedback = mix(feedback, strobe, 0.3);

    float pattern = kaleidoscope * gooey;
    pattern = mix(pattern, 1.0 - pattern, sin(time * 2.0) * 0.5 + 0.5);

    float hue = mod(angle / 6.28318 + dist * 2.0 - t * 0.8, 1.0);
    hue += sin(pattern * 3.14159 + t) * 0.2;

    float saturation = 0.7 + 0.3 * sin(t + dist * 5.0);
    float value = 0.5 + 0.4 * pattern + 0.1 * feedback;

    vec3 color = hsv2rgb(vec3(hue, saturation, value));

    float distortion = sin(dist * 10.0 - t * 2.0) * 0.1;
    color += vec3(distortion) * feedback;

    float vignette = smoothstep(1.0, 0.3, dist);
    color *= vignette + 0.3;

    float pulse = sin(time * 6.0) * 0.5 + 0.5;
    color = mix(color, vec3(1.0), pulse * 0.15 * strobe);

    gl_FragColor = vec4(color, 1.0);
}`;

const GLSLShaderEditor = ({ aiTeamEndpoint = '/.netlify/functions/ai-shader' }: GLSLShaderEditorProps) => {
  const [code, setCode] = useState(DEFAULT_SHADER);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [Editor, setEditor] = useState<any>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const startTimeRef = useRef(performance.now());
  const rafRef = useRef<number>(0);

  // Dynamically import Monaco Editor (client-side only)
  useEffect(() => {
    import('@monaco-editor/react').then((module) => {
      setEditor(() => module.default);
    });
  }, []);

  // AI Generation using your existing AI team
  const generateWithAI = async () => {
    if (!aiPrompt.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      const response = await fetch(aiTeamEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'generate-shader',
          prompt: `Create a GLSL fragment shader: ${aiPrompt}. Include uniforms for time, resolution, and mouse. Make it visually interesting.`
        })
      });

      const data = await response.json();
      if (data.code || data.result) {
        setCode(data.code || data.result);
      }
    } catch (error) {
      console.error('AI generation failed:', error);
      setError('Failed to generate shader with AI');
    } finally {
      setIsGenerating(false);
    }
  };

  // Compile shader
  const compileShader = useCallback((source: string, type: number) => {
    const gl = glRef.current;
    if (!gl) return null;

    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(info || 'Shader compilation failed');
    }

    return shader;
  }, []);

  // Create program
  const createProgram = useCallback((fragSource: string) => {
    const gl = glRef.current;
    if (!gl) return;

    const vertexShader = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    try {
      const vs = compileShader(vertexShader, gl.VERTEX_SHADER);
      const fs = compileShader(fragSource, gl.FRAGMENT_SHADER);

      if (!vs || !fs) throw new Error('Failed to compile shaders');

      const program = gl.createProgram();
      if (!program) throw new Error('Failed to create program');

      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'Failed to link program');
      }

      if (programRef.current) {
        gl.deleteProgram(programRef.current);
      }

      programRef.current = program;
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Compilation failed');
    }
  }, [compileShader]);

  // Initialize WebGL
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: false,
      premultipliedAlpha: false,
    });

    if (!gl) {
      setError('WebGL not supported');
      return;
    }

    glRef.current = gl;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    return () => {
      if (programRef.current) {
        gl.deleteProgram(programRef.current);
      }
    };
  }, []);

  // Compile on code change
  useEffect(() => {
    const timer = setTimeout(() => {
      createProgram(code);
    }, 500);

    return () => clearTimeout(timer);
  }, [code, createProgram]);

  // Render loop
  useEffect(() => {
    if (!isPlaying) return;

    const render = () => {
      const gl = glRef.current;
      const program = programRef.current;
      const canvas = canvasRef.current;

      if (!gl || !program || !canvas) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth * dpr;
      const height = canvas.clientHeight * dpr;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      const time = (performance.now() - startTimeRef.current) / 1000;
      const timeLocation = gl.getUniformLocation(program, 'time');
      if (timeLocation) gl.uniform1f(timeLocation, time);

      const resLocation = gl.getUniformLocation(program, 'resolution');
      if (resLocation) gl.uniform2f(resLocation, width, height);

      const mouseLocation = gl.getUniformLocation(program, 'mouse');
      if (mouseLocation) gl.uniform2f(mouseLocation, mousePos.x, mousePos.y);

      const posLoc = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isPlaying, mousePos]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: 1.0 - (e.clientY - rect.top) / rect.height,
    });
  };

  const handleExport = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shader.glsl';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ height: '100vh', width: '100%', display: 'flex', background: '#1a1a1a' }}>
      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative', background: 'black', minHeight: 0 }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%' }}
          onMouseMove={handleMouseMove}
        />

        {/* Error overlay */}
        {error && (
          <div className="absolute bottom-4 left-4 right-4 bg-red-900/90 text-red-100 p-3 rounded-lg font-mono text-xs max-w-xl">
            {error}
          </div>
        )}

        {/* Controls overlay */}
        <div style={{ position: 'absolute', top: '1rem', left: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)', color: 'white', padding: '0.5rem', borderRadius: '0.25rem', border: 'none', cursor: 'pointer' }}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button
            onClick={() => { startTimeRef.current = performance.now(); }}
            style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)', color: 'white', padding: '0.5rem', borderRadius: '0.25rem', border: 'none', cursor: 'pointer' }}
            title="Reset time"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={handleExport}
            style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)', color: 'white', padding: '0.5rem', borderRadius: '0.25rem', border: 'none', cursor: 'pointer' }}
            title="Export"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div style={{ width: '600px', background: '#2d2d2d', display: 'flex', flexDirection: 'column' }}>
        {/* AI Generator */}
        <div style={{ padding: '1rem', background: '#1a1a1a', borderBottom: '1px solid #444' }}>
          <div style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: '#999', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={14} />
            AI Shader Generator
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generateWithAI()}
              placeholder="Describe your visual effect..."
              style={{ flex: 1, padding: '0.5rem 0.75rem', background: '#2d2d2d', color: 'white', fontSize: '0.875rem', borderRadius: '0.25rem', border: '1px solid #555' }}
              disabled={isGenerating}
            />
            <button
              onClick={generateWithAI}
              disabled={isGenerating}
              style={{ padding: '0.5rem 1rem', background: isGenerating ? '#555' : '#3b82f6', color: 'white', fontSize: '0.875rem', borderRadius: '0.25rem', border: 'none', cursor: isGenerating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={14} />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>

        {/* Monaco Editor */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {Editor ? (
            <Editor
              defaultLanguage="glsl"
              theme="vs-dark"
              value={code}
              onChange={(value: string | undefined) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
              }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#1e1e1e', color: '#666' }}>
              Loading editor...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GLSLShaderEditor;
