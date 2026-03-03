// src/components/CountdownOverlay.jsx
import { useEffect } from 'react';
import { useMissionStore } from '../stores/missionStore';
import { AudioManager } from '../audio/AudioManager';

export default function CountdownOverlay() {
  const { missionTime } = useMissionStore();

  useEffect(() => {
    // Beeps durante cuenta atrás
    if (missionTime > 0 && missionTime < 10 && Math.floor(missionTime * 10) % 2 === 0) {
      AudioManager.playBeep();
    }
  }, [missionTime]);

  const timeLeft = Math.ceil(10 - missionTime);
  const isLiftoff = missionTime >= 10;

  return (
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center pointer-events-none">
      <div className="text-8xl font-mono text-green-400 mb-20 animate-pulse">
        {isLiftoff ? 'LIFTOFF!' : `T-${timeLeft}`}
      </div>
      {!isLiftoff && (
        <div className="text-2xl text-gray-400 font-mono tracking-widest">
          SECONDS
        </div>
      )}
    </div>
  );
}