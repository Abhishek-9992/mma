import React, { useEffect, useRef } from 'react';
import { AgentStatus } from '../../hooks/useVoiceAgent.js';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  status: AgentStatus;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ analyser, isActive, status }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const bufferLength = analyser ? analyser.frequencyBinCount : 64;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameId = requestAnimationFrame(render);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (analyser && isActive) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        // Idle ambient gentle wave
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = Math.sin(Date.now() / 300 + i * 0.2) * 15 + 15;
        }
      }

      // Draw modern rounded spectrum bars
      const numBars = 32;
      const barWidth = (width / numBars) - 3;
      const step = Math.floor(bufferLength / numBars);

      for (let i = 0; i < numBars; i++) {
        const val = dataArray[i * step] || 0;
        const normalized = val / 255;
        const barHeight = Math.max(4, normalized * (height * 0.85));
        const x = i * (barWidth + 3);
        const y = (height - barHeight) / 2;

        // Dynamic color gradient based on state
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (status === 'speaking') {
          gradient.addColorStop(0, '#818cf8');
          gradient.addColorStop(0.5, '#6366f1');
          gradient.addColorStop(1, '#4338ca');
        } else if (status === 'listening') {
          gradient.addColorStop(0, '#34d399');
          gradient.addColorStop(0.5, '#10b981');
          gradient.addColorStop(1, '#059669');
        } else {
          gradient.addColorStop(0, '#64748b');
          gradient.addColorStop(1, '#334155');
        }

        ctx.fillStyle = gradient;
        // Rounded bar
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [analyser, isActive, status]);

  return (
    <div className="w-full flex items-center justify-center py-2">
      <canvas
        ref={canvasRef}
        width={320}
        height={56}
        className="w-full max-w-[320px] h-14 rounded-lg"
      />
    </div>
  );
};
