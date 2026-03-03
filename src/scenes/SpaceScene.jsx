// src/scenes/SpaceScene.jsx
import React, { useEffect, useRef } from 'react';
import StarField2D from '../components/StarField2D.jsx';
import { useMissionStore } from '../stores/missionStore.js';

export default function SpaceScene({ cameraMode = 'exterior' }) {
  const { altitude, velocity } = useMissionStore();

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Fondo de estrellas que se mueven según velocidad */}
      <StarField2D speed={velocity / 10} />

      {/* Tierra lejana cuando ya estás en órbita */}
      {altitude > 200 && (
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-70"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #8cf, #16b, #014)',
            boxShadow: '0 0 100px #8cf',
            transform: `translateX(-50%) scale(${Math.max(0.3, 300 / altitude)})`,
          }}
        />
      )}

      <div className="absolute top-10 left-10 text-white font-mono text-4xl">
        ORBIT INSERTED
      </div>
      <div className="absolute bottom-10 left-10 text-white/70 font-mono">
        Camera: {cameraMode}
      </div>
    </div>
  );
}