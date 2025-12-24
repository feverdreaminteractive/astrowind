import React, { useEffect, useRef } from 'react';

const AmbientBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Swirl ambient background animation
    let time = 0;

    class SwirlParticle {
      x: number;
      y: number;
      angle: number;
      radius: number;
      centerX: number;
      centerY: number;
      speed: number;
      size: number;
      alpha: number;
      hue: number;

      constructor() {
        this.centerX = Math.random() * canvas.width;
        this.centerY = Math.random() * canvas.height;
        this.angle = Math.random() * Math.PI * 2;
        this.radius = Math.random() * 100 + 50;
        this.speed = (Math.random() - 0.5) * 0.02;
        this.size = Math.random() * 2 + 1;
        this.alpha = Math.random() * 0.5 + 0.1;
        this.hue = Math.random() * 60 + 270; // Purple to blue range
        this.updatePosition();
      }

      updatePosition() {
        this.x = this.centerX + Math.cos(this.angle) * this.radius;
        this.y = this.centerY + Math.sin(this.angle) * this.radius;
      }

      update() {
        this.angle += this.speed;

        // Add swirl effect with time
        const swirl = Math.sin(time * 0.001 + this.angle * 3) * 0.5;
        this.radius += swirl;

        // Gentle drift of center points
        this.centerX += Math.sin(time * 0.0005 + this.angle) * 0.1;
        this.centerY += Math.cos(time * 0.0005 + this.angle) * 0.1;

        // Wrap around screen
        if (this.centerX < -100) this.centerX = canvas.width + 100;
        if (this.centerX > canvas.width + 100) this.centerX = -100;
        if (this.centerY < -100) this.centerY = canvas.height + 100;
        if (this.centerY > canvas.height + 100) this.centerY = -100;

        this.updatePosition();

        // Pulsing alpha
        this.alpha = (Math.sin(time * 0.002 + this.angle * 2) + 1) * 0.15 + 0.05;
      }

      draw() {
        const gradient = ctx.createRadialGradient(
          this.x, this.y, 0,
          this.x, this.y, this.size * 3
        );

        const color = `hsla(${this.hue}, 70%, 60%, ${this.alpha})`;
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Create swirl particles
    const particles: SwirlParticle[] = [];
    const particleCount = Math.floor((canvas.width * canvas.height) / 20000);

    for (let i = 0; i < particleCount; i++) {
      particles.push(new SwirlParticle());
    }

    // Animation loop
    const animate = () => {
      time++;

      // Clear canvas with subtle trailing effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      // Draw swirling connections
      ctx.strokeStyle = `hsla(280, 60%, 70%, 0.1)`;
      ctx.lineWidth = 0.5;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            const alpha = (1 - distance / 150) * 0.08;
            const swirl = Math.sin(time * 0.005 + distance * 0.01) * 0.5 + 0.5;

            ctx.strokeStyle = `hsla(${280 + swirl * 20}, 60%, 70%, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);

            // Create curved lines for swirl effect
            const midX = (particles[i].x + particles[j].x) / 2;
            const midY = (particles[i].y + particles[j].y) / 2;
            const offset = Math.sin(time * 0.01 + distance * 0.02) * 20;

            ctx.quadraticCurveTo(
              midX + offset,
              midY + offset,
              particles[j].x,
              particles[j].y
            );
            ctx.stroke();
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-60"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.02) 0%, transparent 80%)'
      }}
    />
  );
};

export default AmbientBackground;