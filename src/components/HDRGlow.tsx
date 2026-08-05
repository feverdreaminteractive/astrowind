import React, { useEffect, useRef } from 'react';

interface HDRGlowProps {
  children: React.ReactNode;
  intensity?: number;
  colorSpace?: 'rec2020' | 'p3' | 'srgb';
}

export const HDRGlow: React.FC<HDRGlowProps> = ({
  children,
  intensity = 1.0,
  colorSpace = 'rec2020'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', {
      colorSpace: colorSpace === 'rec2020' ? 'rec2020' : colorSpace === 'p3' ? 'display-p3' : 'srgb',
    });

    if (!ctx) return;

    // PQ EOTF constants (SMPTE ST 2084)
    const M1 = 2610 / 16384;
    const M2 = (2523 / 4096) * 128;
    const C1 = 3424 / 4096;
    const C2 = (2413 / 4096) * 32;
    const C3 = (2392 / 4096) * 32;

    // PQ EOTF (Electro-Optical Transfer Function)
    const pqEOTF = (v: number): number => {
      const vPow = Math.pow(Math.max(v, 0), 1 / M2);
      const num = Math.max(vPow - C1, 0);
      const den = C2 - C3 * vPow;
      if (den <= 0) return 10000;
      return 10000 * Math.pow(num / den, 1 / M1);
    };

    // Inverse PQ (OETF)
    const pqOETF = (L: number): number => {
      const Ln = L / 10000; // Normalize to [0, 1]
      const LnPowM1 = Math.pow(Ln, M1);
      const num = C1 + C2 * LnPowM1;
      const den = 1 + C3 * LnPowM1;
      return Math.pow(num / den, M2);
    };

    // Animation loop for HDR glow effect
    let animationId: number;
    let time = 0;

    const animate = () => {
      time += 0.01;

      // Clear canvas with transparency
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Create HDR glow gradient
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const maxRadius = Math.max(canvas.width, canvas.height) * 0.7;

      // Multiple glow layers for HDR depth
      for (let layer = 0; layer < 3; layer++) {
        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, maxRadius * (1 + layer * 0.3)
        );

        // Calculate HDR luminance values
        const baseLuminance = 1000 * intensity; // nits
        const peakLuminance = 4000 * intensity; // nits

        // Apply PQ curve for smooth HDR transitions
        const innerAlpha = pqOETF(peakLuminance) * (0.6 - layer * 0.15);
        const outerAlpha = pqOETF(baseLuminance) * 0.1;

        // Animated color shift for dynamic effect
        const hue = (360 * time + layer * 120) % 360;
        const saturation = 100 - layer * 20;

        gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, 70%, ${innerAlpha})`);
        gradient.addColorStop(0.3, `hsla(${hue + 30}, ${saturation - 10}%, 60%, ${innerAlpha * 0.5})`);
        gradient.addColorStop(0.7, `hsla(${hue + 60}, ${saturation - 20}%, 50%, ${innerAlpha * 0.2})`);
        gradient.addColorStop(1, `hsla(${hue + 90}, ${saturation - 30}%, 40%, ${outerAlpha})`);

        ctx.fillStyle = gradient;
        ctx.globalCompositeOperation = layer === 0 ? 'source-over' : 'screen';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Add specular highlights for HDR sparkle
      const numSparkles = 8;
      for (let i = 0; i < numSparkles; i++) {
        const angle = (Math.PI * 2 * i) / numSparkles + time;
        const distance = 30 + Math.sin(time * 2 + i) * 10;
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;

        const sparkleGradient = ctx.createRadialGradient(x, y, 0, x, y, 10);
        sparkleGradient.addColorStop(0, `rgba(255, 255, 255, ${0.8 * intensity})`);
        sparkleGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = sparkleGradient;
        ctx.globalCompositeOperation = 'screen';
        ctx.fillRect(x - 10, y - 10, 20, 20);
      }

      animationId = requestAnimationFrame(animate);
    };

    // Start animation
    const resizeObserver = new ResizeObserver(() => {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
    });

    resizeObserver.observe(container);
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  }, [intensity, colorSpace]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          mixBlendMode: 'screen',
          filter: 'blur(2px)',
          zIndex: -1,
        }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

// CSS-only fallback for browsers without HDR support
export const HDRGlowCSS: React.FC<{ children: React.ReactNode; intensity?: number }> = ({
  children,
  intensity = 1
}) => {
  return (
    <div className="hdr-glow-wrapper">
      {children}
      <style jsx>{`
        .hdr-glow-wrapper {
          position: relative;
          display: inline-block;
        }

        .hdr-glow-wrapper::before {
          content: '';
          position: absolute;
          inset: -20px;
          background: radial-gradient(
            circle at center,
            color(display-p3 1 0.5 0 / ${0.4 * intensity}),
            color(display-p3 0.8 0.3 1 / ${0.2 * intensity}),
            transparent 70%
          );
          filter: blur(20px);
          z-index: -1;
          animation: hdr-pulse 3s ease-in-out infinite;
          mix-blend-mode: screen;
        }

        @supports not (background: color(display-p3 1 0 0)) {
          .hdr-glow-wrapper::before {
            background: radial-gradient(
              circle at center,
              rgba(255, 100, 50, ${0.4 * intensity}),
              rgba(200, 100, 255, ${0.2 * intensity}),
              transparent 70%
            );
          }
        }

        @keyframes hdr-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};