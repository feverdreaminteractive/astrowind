import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Play, Pause, RotateCcw, Download, Sparkles, Loader2 } from 'lucide-react';
import { DEFAULT_SHADER } from '../../shaders/default-shader';

interface GLSLShaderEditorProps {
  aiTeamEndpoint?: string;
}

const GLSLShaderEditor = ({ aiTeamEndpoint = '/.netlify/functions/ai-shader' }: GLSLShaderEditorProps) => {
  const [code, setCode] = useState(DEFAULT_SHADER);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [Editor, setEditor] = useState<any>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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
    <div style={{
      height: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      background: '#1a1a1a'
    }}>
      {/* Canvas */}
      <div style={{
        flex: isMobile ? (showEditor ? '0 0 40%' : 1) : 1,
        position: 'relative',
        background: 'black',
        minHeight: isMobile ? '40%' : 0
      }}>
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
        <div style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}>
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
          {isMobile && (
            <button
              onClick={() => setShowEditor(!showEditor)}
              style={{
                background: showEditor ? '#3b82f6' : 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(4px)',
                color: 'white',
                padding: '0.5rem',
                borderRadius: '0.25rem',
                border: 'none',
                cursor: 'pointer'
              }}
              title="Toggle Editor"
            >
              {showEditor ? 'Hide' : 'Code'}
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      {(!isMobile || showEditor) && (
      <div style={{
        width: isMobile ? '100%' : '600px',
        flex: isMobile ? 1 : 'none',
        background: '#2d2d2d',
        display: 'flex',
        flexDirection: 'column',
        position: isMobile ? 'relative' : 'static'
      }}>
        {/* AI Generator */}
        <div style={{
          padding: isMobile ? '0.75rem' : '1rem',
          background: '#1a1a1a',
          borderBottom: '1px solid #444'
        }}>
          <div style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: '#999', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={14} />
            AI Shader Generator
          </div>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            flexDirection: isMobile ? 'column' : 'row'
          }}>
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
              style={{
                padding: '0.5rem 1rem',
                background: isGenerating ? '#555' : '#3b82f6',
                color: 'white',
                fontSize: '0.875rem',
                borderRadius: '0.25rem',
                border: 'none',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
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
      )}
    </div>
  );
}

export default GLSLShaderEditor;
