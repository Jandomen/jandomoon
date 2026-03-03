// src/scenes/SaturnVScene.jsx
import { useEffect, useRef } from 'react'
import { useMissionStore } from '../stores/missionStore'
import { AudioManager } from '../audio/AudioManager'
import MissionCanvas2D from '../components/MissionCanvas2D'
import HUD from '../components/HUD'
import StarField2D from '../components/StarField2D'
import CockpitPanel from '../components/CockpitPanel'

export default function SaturnVScene({ onLaunchComplete }) {
  const {
    missionTime,
    setMissionTime,
    updateTelemetry,
    altitude = 0,
    velocity = 0,
    fuel = 100,
    stage = 'PRELAUNCH'
  } = useMissionStore()

  const launched = useRef(false)

  const handleLaunch = () => {
    if (launched.current || missionTime > 0) return
    launched.current = true
    AudioManager.playLiftoff?.()
    setMissionTime(0.1)
  }

  // Teclado + botón
  useEffect(() => {
    const key = (e) => e.code === 'Space' && handleLaunch()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  // Simulación
  useEffect(() => {
    if (!launched.current) return

    const interval = setInterval(() => {
      setMissionTime(prev => {
        const t = prev + 0.1

        if (t < 178) {
          updateTelemetry({
            altitude: Math.round((t - 10) * 0.52),
            velocity: Math.round((t - 10) * 16.2),
            fuel: Math.max(0, Math.round(100 - (t - 10) / 1.68 * 100)),
            stage: 'S-IC',
            isEngineOn: true
          })
        } else if (t < 720) {
          updateTelemetry({
            altitude: Math.round(67 + (t - 178) * 0.21),
            velocity: Math.round(2400 + (t - 178) * 9.8),
            fuel: Math.max(0, Math.round(100 - (t - 178) / 5.5 * 100)),
            stage: 'S-II → ORBIT',
            isEngineOn: true
          })
        } else {
          updateTelemetry({
            altitude: 185,
            velocity: 7790,
            fuel: 22,
            stage: 'ORBIT',
            isEngineOn: false
          })
          onLaunchComplete?.()
        }
        return t
      })
    }, 100)

    return () => clearInterval(interval)
  }, [launched.current])

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <MissionCanvas2D />
      {altitude > 80 && <StarField2D speed={velocity / 600} />}
      <HUD />
      <CockpitPanel />

      {/* BOTÓN FLOTANTE + PANTALLA INICIO */}
      {missionTime === 0 && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-50">
          <h1 className="text-8xl font-bold text-green-400 mb-8">APOLLO 11</h1>
          <p className="text-5xl text-green-300 mb-16">SATURN V READY</p>

          <button
            onClick={handleLaunch}
            className="px-20 py-12 bg-red-600 hover:bg-red-500 text-white text-6xl font-bold rounded-3xl shadow-2xl transform hover:scale-110 transition-all duration-200"
          >
            LAUNCH
          </button>

          <p className="mt-12 text-3xl text-gray-400">o pulsa ESPACIO</p>
        </div>
      )}

      {/* CUENTA ATRÁS */}
      {missionTime > 0 && missionTime < 10 && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-40 pointer-events-none">
          <div className="text-9xl font-mono text-red-600 animate-pulse">
            T-{Math.ceil(10 - missionTime)}
          </div>
        </div>
      )}
    </div>
  )
}