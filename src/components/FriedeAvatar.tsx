import { useEffect, useRef } from 'react';

interface FriedeAvatarProps {
  isSpeaking: boolean;
  isListening: boolean;
}

export default function FriedeAvatar({ isSpeaking, isListening }: FriedeAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    let phase = 0;
    const bars = 40;

    const animate = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, width, height);

      if (isSpeaking) {
        // Active speaking animation
        const barWidth = width / bars;

        for (let i = 0; i < bars; i++) {
          const barHeight = isSpeaking
            ? Math.sin(phase + i * 0.5) * (height * 0.3) + height * 0.4
            : height * 0.1;

          const gradient = ctx.createLinearGradient(0, height / 2 - barHeight / 2, 0, height / 2 + barHeight / 2);
          gradient.addColorStop(0, '#3b82f6');
          gradient.addColorStop(0.5, '#2563eb');
          gradient.addColorStop(1, '#1d4ed8');

          ctx.fillStyle = gradient;
          ctx.fillRect(
            i * barWidth + barWidth * 0.2,
            height / 2 - barHeight / 2,
            barWidth * 0.6,
            barHeight
          );
        }

        phase += isSpeaking ? 0.15 : 0.05;
      } else if (isListening) {
        // Listening pulse animation
        const centerX = width / 2;
        const centerY = height / 2;
        const pulseRadius = 60 + Math.sin(phase) * 15;

        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseRadius);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
        gradient.addColorStop(0.7, 'rgba(37, 99, 235, 0.4)');
        gradient.addColorStop(1, 'rgba(29, 78, 216, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
        ctx.fill();

        phase += 0.08;
      } else {
        // Idle state - gentle wave
        const barWidth = width / bars;

        for (let i = 0; i < bars; i++) {
          const barHeight = Math.sin(phase + i * 0.3) * 15 + 20;

          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(
            i * barWidth + barWidth * 0.3,
            height / 2 - barHeight / 2,
            barWidth * 0.4,
            barHeight
          );
        }

        phase += 0.03;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSpeaking, isListening]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      {/* FRIEDE Title */}
      <div className="mb-8 text-center">
        <h1 className="text-6xl font-bold text-white mb-2 tracking-wider">
          FRIEDE
        </h1>
        <p className="text-blue-300 text-lg">AI Interviewer</p>
      </div>

      {/* Wave Animation */}
      <div className="relative w-full max-w-md h-64">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Status Indicator */}
      <div className="mt-8 flex items-center gap-3">
        <div
          className={`w-3 h-3 rounded-full transition-all duration-300 ${
            isSpeaking
              ? 'bg-green-400 animate-pulse'
              : isListening
              ? 'bg-blue-400 animate-pulse'
              : 'bg-gray-500'
          }`}
        />
        <span className="text-white text-sm font-medium">
          {isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : 'Ready'}
        </span>
      </div>
    </div>
  );
}
