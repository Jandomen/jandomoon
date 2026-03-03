import React, { useState, useEffect } from 'react'
import { StarField2D } from './components/StarField2D.jsx'
import { HUD } from './components/HUD.jsx'
import { CockpitPanel } from './components/CockpitPanel.jsx'
import { MissionClock } from './components/MissionClock.jsx'
import { ControlsHelp } from './components/ControlsHelp.jsx'
import { MissionProgressBar } from './components/MissionProgressBar.jsx'

import { KSCExplorationScene } from './scenes/KSCExplorationScene.jsx'
import { LaunchScene } from './scenes/LaunchScene.jsx'
import { EarthOrbitScene } from './scenes/EarthOrbitScene.jsx'
import { TranslunarScene } from './scenes/TranslunarScene.jsx'
import { LunarOrbitScene } from './scenes/LunarOrbitScene.jsx'
import { LunarDescentScene } from './scenes/LunarDescentScene.jsx'
import { LunarAscentScene } from './scenes/LunarAscentScene.jsx'
import { LunarSurfaceScene } from './scenes/LunarSurfaceScene.jsx'
import { ReentryScene } from './scenes/ReentryScene.jsx'
import { LunarExplorationScene } from './scenes/LunarExplorationScene.jsx'
import { CabinView } from './components/CabinView.jsx'
import { TutorialSystem } from './components/TutorialSystem.jsx'
import { ControlsSystem } from './systems/ControlsSystem.jsx'
import { MissionControlPanel } from './components/MissionControlPanel.jsx'
import { useMissionStore } from './stores/missionStore.js'
import AudioManager from './audio/AudioManager.js'

export default function App() {
  const {
    phase,
    inOrbit,
    onTranslunar,
    lunarOrbit,
    lunarDescent,
    landed,
    ascent,
    docked,
    onTransEarth,
    reentry,
    splashed,
    crashed,
    aborted,
    cameraMode,
    cabinLights,
    isExploring,
    showPhaseMessage,
    setShowPhaseMessage,
    instruction,
    setInstruction,
    resetMission,
    currentScene,
    hudVisible,
    toggleHud
  } = useMissionStore()

  const [showVictory, setShowVictory] = useState(false);

  // Instrucciones por escena — contextuales y realistas
  const sceneInstructions = {
    'KSC_EXPLORATION': 'Exploración KSC. [WASD] mover/strafe. [←→] girar. [Q/Z] mirar arriba/abajo. [E] interactuar. [N] día/noche.',
    'LAUNCH': 'Ignición [SPACE]. Potencia [↑/↓]. El Saturn V se desarmará por etapas. [H] ocultar paneles.',
    'EARTH_ORBIT': 'Orbita de estacionamiento. Completa 1.5 órbitas. Alinea y presiona [T] para TLI.',
    'TRANSLUNAR': 'Transposición: Gira 180° [←/→], Acerca [↑] para acoplar el LEM. Luego costa 3 días.',
    'LUNAR_ORBIT': 'Órbita lunar. Completa 2 órbitas ([W] warp). [S] separar LM, [L] descenso.',
    'LUNAR_DESCENT': 'Alunizaje! [↑] empuje, [B/SPACE] freno máximo. Velocidad < 5 m/s para aterrizar.',
    'LUNAR_SURFACE': '"The Eagle has landed!" [E] explorar Luna, [L] ascenso lunar.',
    'LUNAR_EXPLORATION': 'Caminata lunar! [WASD] mover/strafe, [←→] girar, [Q/Z] mirar arriba/abajo, [SPACE] saltar.',
    'LUNAR_ASCENT': '[SPACE] ignición. Ascenso automático. [W] warp para acelerar. [T] TEI tras acoplar.',
    'TRANSEARTH': 'Regreso a casa. [W] acelerar tiempo. 3 días de viaje.',
    'REENTRY': 'Reingreso! Estabiliza con [←/→]. El escudo térmico los protege.',
    'SPLASHDOWN': '¡Bienvenidos a casa, Apollo 11!'
  }

  useEffect(() => {
    if (currentScene) {
      setShowPhaseMessage(true);
      const bannerTimer = setTimeout(() => setShowPhaseMessage(false), 3000);

      const msg = sceneInstructions[currentScene]
      if (msg) {
        setInstruction(msg);
      }

      return () => clearTimeout(bannerTimer);
    }
  }, [currentScene]);

  useEffect(() => {
    if (splashed) {
      const timer = setTimeout(() => setShowVictory(true), 15000);
      return () => clearTimeout(timer);
    }
  }, [splashed]);

  // Start ambient on first interaction / load
  useEffect(() => {
    const startAmbient = () => {
      if (['KSC_EXPLORATION', 'LAUNCH'].includes(currentScene)) AudioManager.startAmbient('launch')
      else if (['EARTH_ORBIT', 'TRANSLUNAR', 'TRANSEARTH', 'LUNAR_ORBIT'].includes(currentScene)) AudioManager.startAmbient('space')
      else if (['LUNAR_SURFACE', 'LUNAR_EXPLORATION'].includes(currentScene)) AudioManager.startAmbient('lunar')
      else if (currentScene === 'REENTRY') AudioManager.startAmbient('reentry')
      else if (['LUNAR_DESCENT', 'LUNAR_ASCENT'].includes(currentScene)) AudioManager.startAmbient('cabin')
      window.removeEventListener('click', startAmbient)
    }
    window.addEventListener('click', startAmbient)
    return () => window.removeEventListener('click', startAmbient)
  }, [currentScene]);

  // Handle Global Restart Key
  useEffect(() => {
    const handleResetKey = (e) => {
      if (e.key.toLowerCase() === 'r' && (crashed || showVictory)) {
        resetMission();
      }
    };
    window.addEventListener('keydown', handleResetKey);
    return () => window.removeEventListener('keydown', handleResetKey);
  }, [crashed, showVictory, resetMission]);


  if (showVictory) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#000814',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        color: '#0f0', fontFamily: 'monospace', textAlign: 'center', zIndex: 1000
      }}>
        <h1 style={{ fontSize: '80px', shadow: '0 0 20px #0f0', margin: 0 }}>SPLASHDOWN!</h1>
        <h2 style={{ fontSize: '50px' }}>WELCOME HOME, APOLLO 11</h2>
        <p style={{ fontSize: '28px', marginTop: '40px', maxWidth: '800px' }}>
          Houston: "Tranquility Base, Houston. You are cleared for Earth return. Magnificent job. The world is watching."
        </p>
        <button onClick={() => {
          AudioManager.stopAll()
          const { clearAllPhases, setValues } = useMissionStore.getState()
          clearAllPhases()
          setValues({ currentScene: 'KSC_EXPLORATION', phase: 'Pre-launch' })
          setShowVictory(false)
          AudioManager.startAmbient('launch')
        }} style={{
          marginTop: '60px', padding: '20px 50px', fontSize: '24px',
          background: '#000', color: '#0f0', border: '3px solid #0f0', cursor: 'pointer',
          boxShadow: '0 0 15px #0f0'
        }}>
          VOLVER A KENNEDY SPACE CENTER
        </button>
        <button onClick={() => resetMission()} style={{
          marginTop: '15px', padding: '12px 30px', fontSize: '16px',
          background: '#000', color: '#0f0', border: '1px solid #0f0', cursor: 'pointer',
          opacity: 0.6
        }}>
          REINICIAR MISIÓN COMPLETA (R)
        </button>
      </div>
    )
  }

  if (crashed) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#220000', color: '#f00', fontFamily: 'monospace', textAlign: 'center', paddingTop: '15vh', zIndex: 1000 }}>
        <h1 style={{ fontSize: '100px', textShadow: '0 0 20px #f00' }}>MISSION FAILED</h1>
        <p style={{ fontSize: '32px', color: '#ff8a8a', letterSpacing: '2px' }}>{phase || "A major systems failure has occurred..."}</p>
        <div style={{ marginTop: '40px', color: '#fff', fontSize: '18px', opacity: 0.8 }}>
          "Houston, we have a problem... we're not coming home."
        </div>
        <button onClick={() => resetMission()} style={{
          marginTop: '60px', padding: '20px 40px', fontSize: '24px',
          background: '#300', border: '3px solid #f00', color: '#ff4444', cursor: 'pointer',
          boxShadow: '0 0 15px #f00', textTransform: 'uppercase', fontWeight: 'bold'
        }}>
          REINTENTAR MISIÓN (PULSAR R)
        </button>
      </div>
    )
  }

  // Pantalla de Aborto FINAL
  const showingAbortMessage = aborted && cameraMode === 'external' && !crashed && !splashed;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#000',
      overflow: 'hidden',
      fontFamily: 'monospace'
    }}>
      {/* Fondo de estrellas siempre visible */}
      <StarField2D />

      {/* Mission Control Panel */}
      <MissionControlPanel />

      {/* Escenas activas según currentScene */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 1,
        transition: 'opacity 0.5s',
        filter: 'none',
        zIndex: 1
      }}>
        {(() => {
          switch (currentScene) {
            case 'LUNAR_EXPLORATION': return <LunarExplorationScene />;
            case 'REENTRY': return <ReentryScene />;
            case 'LUNAR_ASCENT': return <LunarAscentScene />;
            case 'LUNAR_SURFACE': return <LunarSurfaceScene />;
            case 'LUNAR_DESCENT': return <LunarDescentScene />;
            case 'LUNAR_ORBIT': return <LunarOrbitScene />;
            case 'TRANSLUNAR':
            case 'TRANSEARTH': return <TranslunarScene key={currentScene} />;
            case 'EARTH_ORBIT': return <EarthOrbitScene />;
            case 'LAUNCH': return <LaunchScene />;
            case 'KSC_EXPLORATION':
            default: return <KSCExplorationScene />;
          }
        })()}
      </div>

      {cameraMode === 'cabin' && <CabinView />}

      {!isExploring && (
        <>
          {/* Hamburger toggle for HUD panels */}
          <button
            onClick={toggleHud}
            style={{
              position: 'fixed',
              top: '12px',
              right: '12px',
              zIndex: 10000,
              background: hudVisible ? 'rgba(15, 25, 40, 0.9)' : 'rgba(15, 25, 40, 0.6)',
              color: '#0af',
              border: `1px solid ${hudVisible ? 'rgba(0,170,255,0.4)' : 'rgba(0,170,255,0.2)'}`,
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: '"Courier New", monospace',
              fontSize: '18px',
              fontWeight: 'bold',
              letterSpacing: '1px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
              transition: 'all 0.2s',
              lineHeight: '1'
            }}
            title={hudVisible ? 'Ocultar paneles (H)' : 'Mostrar paneles (H)'}
          >
            {hudVisible ? '✕' : '☰'}
          </button>

          {hudVisible && (
            <>
              <HUD />
              <MissionClock />
              <MissionProgressBar />
              <TutorialSystem />
              <ControlsSystem />
              <ControlsHelp />
            </>
          )}

          {!hudVisible && <ControlsSystem />}

          {/* INSTRUCTION OVERLAY — bottom center */}
          {instruction.visible && (
            <div style={{
              position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0, 20, 40, 0.92)', color: '#0af',
              border: '1px solid rgba(0,170,255,0.3)',
              padding: '10px 24px', borderRadius: '4px', fontSize: '13px', zIndex: 500,
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              fontFamily: '"Courier New", monospace',
              letterSpacing: '0.5px',
              animation: 'instructionFadeIn 0.4s ease-out',
              maxWidth: '600px', textAlign: 'center', pointerEvents: 'none'
            }}>
              {instruction.text}
            </div>
          )}
        </>
      )}

      {/* Phase Banner (top) — auto-dismiss 3s */}
      {cameraMode === 'external' && phase && showPhaseMessage && (
        <div style={{
          position: 'fixed', top: '12%', left: '50%', transform: 'translate(-50%, -50%)',
          color: (aborted || phase.includes('Emergency')) ? '#f00' : ((phase?.includes('Eagle') || phase?.includes('SPLASHDOWN') || splashed) ? '#0f0' : '#0af'),
          fontSize: aborted ? '36px' : '24px', fontWeight: 'bold', textAlign: 'center',
          background: 'rgba(0,5,15,0.88)', padding: '14px 30px',
          border: `1px solid ${(aborted || phase.includes('Emergency')) ? 'rgba(255,0,0,0.4)' : 'rgba(0,255,0,0.25)'}`,
          borderRadius: '6px', pointerEvents: 'none', zIndex: 100,
          boxShadow: '0 4px 25px rgba(0,0,0,0.6)',
          fontFamily: '"Courier New", monospace', letterSpacing: '1px',
          animation: 'bannerFadeIn 0.5s ease-out'
        }}>
          {splashed ? "SPLASHDOWN SUCCESSFUL" : (aborted ? "ABORT INITIATED!" : phase.toUpperCase())}
          {aborted && !reentry && <div style={{ fontSize: '14px', marginTop: '8px', color: '#f88' }}>LAUNCH ESCAPE SYSTEM</div>}
          {reentry && phase.includes('Emergency') && <div style={{ fontSize: '14px', marginTop: '8px', color: '#f88' }}>EMERGENCY DESCENT</div>}
        </div>
      )}

      <style>{`
        @keyframes instructionFadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes bannerFadeIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: '15px', right: '30px',
        color: 'rgba(255, 255, 255, 0.4)', fontSize: '13px',
        fontFamily: 'monospace', zIndex: 200, pointerEvents: 'none',
        letterSpacing: '1px'
      }}>
        © 2026 JANDOSOFT - APOLLO 11 SIMULATOR
      </div>

    </div>
  )
}