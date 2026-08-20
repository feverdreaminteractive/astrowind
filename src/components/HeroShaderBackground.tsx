import React, { useEffect, useRef, useState } from 'react';
import { HERO_SHADERS } from '../shaders/hero-shader';

interface HeroShaderBackgroundProps {
  className?: string;
  intensity?: number;
}

export const HeroShaderBackground: React.FC<HeroShaderBackgroundProps> = ({
  className = '',
  intensity = 1.0
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const startTimeRef = useRef(performance.now());
  const rafRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const [shaderIndex, setShaderIndex] = useState(0);

  // A quiet, undocumented interaction rather than a visible control — click
  // anywhere on the background (not on the actual content sitting above it)
  // to cycle to the next variant. Not persisted — a refresh always starts
  // back at the default.
  const handleBackgroundClick = () => {
    setShaderIndex((prev) => (prev + 1) % HERO_SHADERS.length);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('Canvas not found');
      return;
    }

    // Initialize WebGL
    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      powerPreference: 'low-power'
    });

    if (!gl) {
      console.warn('WebGL not supported');
      return;
    }

    console.log('WebGL initialized successfully');

    glRef.current = gl;

    // Create shaders
    const createShader = (source: string, type: number) => {
      const shader = gl.createShader(type);
      if (!shader) return null;

      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }

      return shader;
    };

    // Vertex shader
    const vertexShader = createShader(
      `attribute vec2 a_position;
       void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`,
      gl.VERTEX_SHADER
    );

    // Fragment shader with intensity adjustment (only applies to shaders
    // whose final line matches this exact pattern — a no-op otherwise,
    // which is fine since every current variant is authored for full
    // strength and intensity is always passed as 1.0 today)
    const activeShader = HERO_SHADERS[shaderIndex] ?? HERO_SHADERS[0];
    const adjustedShader = activeShader.replace(
      'gl_FragColor = vec4(color, 1.0);',
      `gl_FragColor = vec4(color * ${intensity.toFixed(2)}, 1.0);`
    );

    const fragmentShader = createShader(adjustedShader, gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) return;

    // Create program
    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      return;
    }

    programRef.current = program;
    gl.useProgram(program);

    // Set up geometry
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    const timeLocation = gl.getUniformLocation(program, 'time');
    const resolutionLocation = gl.getUniformLocation(program, 'resolution');
    const mouseLocation = gl.getUniformLocation(program, 'mouse');

    // Handle resize
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const displayWidth = rect.width;
      const displayHeight = rect.height;

      // Use device pixel ratio for sharp rendering
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };

    // Handle mouse move - listen on document instead of canvas
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: 1.0 - (e.clientY - rect.top) / rect.height
      };
    };

    // Animation loop
    const render = () => {
      resize();

      const currentTime = (performance.now() - startTimeRef.current) / 1000;

      gl.uniform1f(timeLocation, currentTime);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform2f(mouseLocation, mouseRef.current.x, mouseRef.current.y);

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      rafRef.current = requestAnimationFrame(render);
    };

    // Start rendering
    resize();
    render();

    // Add event listeners - use document since canvas has pointer-events: none
    window.addEventListener('resize', resize);
    document.addEventListener('mousemove', handleMouseMove);

    // Touch support for mobile
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        mouseRef.current = {
          x: (e.touches[0].clientX - rect.left) / rect.width,
          y: 1.0 - (e.touches[0].clientY - rect.top) / rect.height
        };
      }
    });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      document.removeEventListener('mousemove', handleMouseMove);

      if (gl && program) {
        gl.deleteProgram(program);
      }
    };
  }, [intensity, shaderIndex]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleBackgroundClick}
      className={`w-full h-full ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0.6,
        pointerEvents: 'auto'
      }}
    />
  );
};
