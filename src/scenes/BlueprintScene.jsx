// src/scenes/BlueprintScene.jsx
import React, { useEffect, useRef } from 'react';
import { useMissionStore } from '../stores/missionStore.js';

export default function BlueprintScene({ cameraMode }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    const drawBlueprint = () => {
      ctx.fillStyle = '#001122';
      ctx.fillRect(0, 0, w / 2, h / 2);

      ctx.strokeStyle = '#0ff';
      ctx.lineWidth = 1;

      // Grid estilo blueprint
      for (let x = 0; x < w / 2; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h / 2);
        ctx.stroke();
      }
      for (let y = 0; y < h / 2; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w / 2, y);
        ctx.stroke();
      }

      // Saturn V en plano (líneas simples)
      ctx.strokeStyle = '#0ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w / 4, h / 2 - 200);
      ctx.lineTo(w / 4, h / 2 + 200);
      ctx.stroke();

      ctx.fillStyle = '#0ff';
      ctx.font = 'bold 30px monospace';
      ctx.fillText('SATURN V', w / 4 + 20, h / 2 - 220);
      ctx.font = '20px monospace';
      ctx.fillText('APOLLO 11 - BLUEPRINT MODE', 50, 60);
    };

    drawBlueprint();
  }, []);

  return (
    <div className="w-full h-full bg-navy-900">
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute top-4 right-4 text-cyan-400 font-mono">
        CAMERA MODE: {cameraMode.toUpperCase()}
      </div>
    </div>
  );
}