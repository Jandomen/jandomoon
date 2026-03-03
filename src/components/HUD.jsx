import { useState } from 'react'
import { useMissionStore } from '../stores/missionStore.js'

export function HUD() {
  const {
    altitude, velocity, fuel, throttle, phase, toggleCamera, cameraMode, timeWarp,
    lunarDescent, isLookingBack, toggleLookBack, currentScene
  } = useMissionStore()

  const [showHelp, setShowHelp] = useState(false)

  // Instrucciones por fase
  const phaseHelp = {
    'KSC_EXPLORATION': ['[WASD] Walk/Strafe', '[←→] Rotate', '[Q/Z] Look up/down', '[E] Interact', '[N] Day/Night', '[ENTER] Skip'],
    'LAUNCH': ['[SPACE] Ignition', '[↑/↓] Throttle', '[S] Manual Staging', '[C/V] Camera', '[W] Time Warp'],
    'EARTH_ORBIT': ['[T] Trans-Lunar Injection', '[C/V] Camera', '[W] Time Warp', '[H] Toggle HUD'],
    'TRANSLUNAR': ['[L] Lunar Orbit Insertion', '[F] Free Return', '[W] Time Warp', '[H] Toggle HUD'],
    'LUNAR_ORBIT': ['[S] Separate LM Eagle', '[L] Begin Powered Descent', '[W] Time Warp', '[H] Toggle HUD'],
    'LUNAR_DESCENT': ['[B/SPACE] Max brake', '[↑/↓] Thrust', '[←/→] Lateral', '[M] Silence alarm', '[H] Toggle HUD'],
    'LUNAR_SURFACE': ['[E] EVA Exploration', '[L] Lunar Ascent', '[H] Toggle HUD'],
    'LUNAR_EXPLORATION': ['[WASD] Move/Strafe', '[←→] Rotate', '[Q/Z] Look up/down', '[SPACE] Jump', '[ESC] Return to LM'],
    'LUNAR_ASCENT': ['[SPACE] Ignite ascent engine', '[W] Time Warp', '[T] TEI after dock', '[C/V] Camera', '[H] Toggle HUD'],
    'TRANSEARTH': ['[W] Time Warp', 'Wait for re-entry...', '[H] Toggle HUD'],
    'REENTRY': ['[←/→] Stabilize capsule', '[P] Deploy parachutes', '[M] Silence alarm', '[H] Toggle HUD'],
    'SPLASHDOWN': ['Mission complete!', '[R] New mission'],
  }

  const helps = phaseHelp[currentScene] || []

  return (
    <>
      {/* Landing Status Widget (Top Center) */}
      {lunarDescent && (
        <div style={{
          position: 'fixed', top: '15px', left: '50%', transform: 'translateX(-50%)',
          width: '380px', background: 'rgba(0, 10, 20, 0.88)', border: '1px solid #0f0',
          padding: '12px 15px', borderRadius: '6px', color: '#0f0', textAlign: 'center', zIndex: 1000,
          fontFamily: '"Courier New", monospace'
        }}>
          <div style={{ fontSize: '9px', marginBottom: '5px', letterSpacing: '2px', color: '#0a0' }}>DESCENT GUIDANCE</div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', marginBottom: '3px' }}>ALTITUDE</div>
              <div style={{ height: '6px', background: '#030', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (altitude / 15000) * 100)}%`, height: '100%', background: '#0f0' }} />
              </div>
              <div style={{ fontSize: '14px', marginTop: '3px' }}>{altitude.toFixed(0)} FT</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', marginBottom: '3px' }}>DESCENT RATE</div>
              <div style={{
                fontSize: '18px',
                color: Math.abs(velocity * 100) < 5 ? '#0f0' : '#f50',
                fontWeight: 'bold'
              }}>
                {(velocity * 100).toFixed(1)} m/s
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Stats (Left) */}
      <div style={{
        position: 'fixed', top: '20px', left: '20px',
        color: '#0f0', zIndex: 1000,
        fontFamily: '"Courier New", monospace',
        background: 'rgba(0,5,10,0.85)',
        padding: '14px 16px',
        border: '1px solid rgba(0,255,0,0.3)',
        borderRadius: '4px',
        boxShadow: '0 2px 15px rgba(0,0,0,0.6)',
        minWidth: '220px',
        maxWidth: '240px'
      }}>
        <h3 style={{
          margin: '0 0 10px 0', borderBottom: '1px solid rgba(0,255,0,0.2)',
          paddingBottom: '6px', fontSize: '13px', letterSpacing: '0.5px'
        }}>
          {phase}
        </h3>

        <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>ALT: <span style={{ color: '#fff' }}>{altitude.toFixed(1)} {lunarDescent ? 'FT' : 'KM'}</span></div>
          <div>VEL: <span style={{ color: '#fff' }}>{(velocity * (lunarDescent ? 100 : 3.6)).toFixed(1)} {lunarDescent ? 'M/S' : 'KM/H'}</span></div>
          {timeWarp > 1 && <div style={{ color: '#ff0', fontWeight: 'bold' }}>WARP: {timeWarp}X</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            FUEL:
            <div style={{ flex: 1, height: '6px', background: '#111', border: '1px solid rgba(0,255,0,0.3)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${fuel}%`, background: fuel < 20 ? '#f00' : '#0f0', transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>

        {/* Camera Toggle */}
        <div style={{ marginTop: '10px', display: 'flex', gap: '4px' }}>
          <button
            onClick={toggleCamera}
            style={{
              flex: 1,
              background: cameraMode === 'cabin' ? '#0f0' : 'transparent',
              color: cameraMode === 'cabin' ? '#000' : '#0f0',
              border: '1px solid rgba(0,255,0,0.3)',
              padding: '4px',
              fontSize: '9px',
              fontWeight: 'bold',
              cursor: 'pointer',
              borderRadius: '2px',
              fontFamily: '"Courier New", monospace'
            }}
          >
            CABIN
          </button>
          <button
            onClick={toggleCamera}
            style={{
              flex: 1,
              background: cameraMode === 'external' ? '#0f0' : 'transparent',
              color: cameraMode === 'external' ? '#000' : '#0f0',
              border: '1px solid rgba(0,255,0,0.3)',
              padding: '4px',
              fontSize: '9px',
              fontWeight: 'bold',
              cursor: 'pointer',
              borderRadius: '2px',
              fontFamily: '"Courier New", monospace'
            }}
          >
            EXTERNAL
          </button>
        </div>

        {cameraMode === 'cabin' && (
          <button
            onClick={toggleLookBack}
            style={{
              width: '100%',
              background: isLookingBack ? 'rgba(0,170,255,0.2)' : 'transparent',
              color: '#0af',
              border: '1px solid rgba(0,170,255,0.3)',
              padding: '5px',
              fontSize: '9px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: '4px',
              borderRadius: '2px',
              fontFamily: '"Courier New", monospace'
            }}
          >
            {isLookingBack ? '← INSTRUMENTS' : 'REAR VIEW [B]'}
          </button>
        )}

        {/* Lander Controls (Only during descent) */}
        {lunarDescent && (
          <div style={{ marginTop: 10, borderTop: '1px solid rgba(0,255,0,0.15)', paddingTop: 8 }}>
            <div style={{ fontSize: 9, color: '#555', marginBottom: 6, textAlign: 'center', letterSpacing: '1px' }}>THRUST CONTROL</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3px', alignItems: 'center' }}>
              <div />
              <button
                onMouseDown={() => {
                  const current = useMissionStore.getState().throttle;
                  useMissionStore.setState({ throttle: Math.min(1, current + 0.1) });
                }}
                style={landerBtnStyle}
              >▲</button>
              <div />
              <button
                onMouseDown={() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }))}
                onMouseUp={() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft' }))}
                style={landerBtnStyle}
              >◄</button>
              <button
                onMouseDown={() => {
                  const current = useMissionStore.getState().throttle;
                  useMissionStore.setState({ throttle: Math.max(0, current - 0.1) });
                }}
                style={landerBtnStyle}
              >▼</button>
              <button
                onMouseDown={() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }))}
                onMouseUp={() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight' }))}
                style={landerBtnStyle}
              >►</button>
            </div>
            <div style={{ fontSize: '9px', color: '#0f0', textAlign: 'center', marginTop: '4px' }}>
              {(throttle * 100).toFixed(0)}%
            </div>
          </div>
        )}

        {/* Help Toggle */}
        <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6 }}>
          <button
            onClick={() => setShowHelp(!showHelp)}
            style={{
              width: '100%',
              background: showHelp ? 'rgba(0,170,255,0.1)' : 'transparent',
              color: '#0af',
              border: '1px solid rgba(0,170,255,0.2)',
              borderRadius: '2px',
              padding: '4px',
              fontSize: '9px',
              cursor: 'pointer',
              fontFamily: '"Courier New", monospace',
              letterSpacing: '0.5px'
            }}
          >
            {showHelp ? '▲ HIDE CONTROLS' : '▼ SHOW CONTROLS'}
          </button>

          {showHelp && (
            <div style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {helps.map((h, i) => (
                <div key={i} style={{
                  fontSize: '9px', color: '#888', padding: '2px 4px',
                  background: 'rgba(255,255,255,0.02)', borderRadius: '2px'
                }}>
                  {h}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

const landerBtnStyle = {
  background: 'rgba(0, 255, 0, 0.08)', color: '#0f0', border: '1px solid rgba(0,255,0,0.3)',
  fontSize: '12px', padding: '8px 4px', cursor: 'pointer', fontWeight: 'bold',
  borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: '"Courier New", monospace'
}