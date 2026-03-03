import { useEffect } from 'react'
import { useMissionStore } from '../stores/missionStore'
import AudioManager from '../audio/AudioManager'

export function ControlsSystem() {
    useEffect(() => {
        // Track held keys for continuous input (B key brake, arrow thrust)
        const heldKeys = {}

        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
            heldKeys[e.code] = true

            const state = useMissionStore.getState()
            const { setValues, currentScene } = state

            // KSC Exploration handles its own input entirely
            if (currentScene === 'KSC_EXPLORATION') return
            // Lunar exploration handles WASD too
            if (currentScene === 'LUNAR_EXPLORATION') return

            switch (e.code) {
                case 'ArrowUp':
                    if (currentScene === 'LAUNCH') {
                        setValues({ throttle: Math.min(1, state.throttle + 0.1) })
                    } else if (currentScene === 'LUNAR_DESCENT') {
                        setValues({ throttle: Math.min(1.0, state.throttle + 0.08) })
                    }
                    break
                case 'ArrowDown':
                    if (currentScene === 'LAUNCH') {
                        setValues({ throttle: Math.max(0, state.throttle - 0.1) })
                    } else if (currentScene === 'LUNAR_DESCENT') {
                        setValues({ throttle: Math.max(0.0, state.throttle - 0.08) })
                    }
                    break
                case 'KeyW':
                    // Time Warp — allowed during parachute phase of reentry, but NOT during plasma
                    if (currentScene !== 'KSC_EXPLORATION' &&
                        currentScene !== 'LUNAR_EXPLORATION' &&
                        currentScene !== 'LUNAR_DESCENT') {
                        // Block warp only during plasma reentry
                        const reentryPhase = state.reentryPhase
                        if (currentScene === 'REENTRY' && (reentryPhase === 'PLASMA' || reentryPhase === 'INITIAL')) {
                            // No warp during critical plasma phase
                            AudioManager.playBeep(300, 0.1) // Error beep
                            break
                        }
                        const nextWarp = state.timeWarp >= 8 ? 1 : state.timeWarp * 2
                        setValues({ timeWarp: nextWarp })
                        AudioManager.playClick()
                    }
                    break
                case 'Space':
                    e.preventDefault()
                    if (currentScene === 'LAUNCH' && state.phase === 'Pre-launch' && !state.ignited && state.countdown === null) {
                        setValues({ ignited: true, phase: 'Liftoff!' })
                        AudioManager.setEnginePower(state.throttle, state.cameraMode)
                    }
                    // SPACE ignites lunar ascent engine or triggers it from surface
                    if (currentScene === 'LUNAR_ASCENT' && state.waitingForIgnition) {
                        AudioManager.playClick()
                        AudioManager.playExplosiveLiftoff()
                        setValues({ waitingForIgnition: false, velocity: 12, throttle: 1.0 })
                    } else if (currentScene === 'LUNAR_SURFACE' && state.landed && !state.ascent) {
                        // User wants 'jump' to launch the ship
                        useMissionStore.getState().startAscent()
                    }
                    break
                case 'KeyB':
                    // Max brake during lunar descent
                    if (currentScene === 'LUNAR_DESCENT') {
                        setValues({ throttle: 1.0 })
                    }
                    break
                case 'KeyJ':
                    // J = Jump during lunar exploration (handled there)
                    break
                case 'KeyT':
                    if (currentScene === 'EARTH_ORBIT' && state.inOrbit) {
                        useMissionStore.getState().startTLI()
                    } else if (currentScene === 'LUNAR_ASCENT' && state.docked) {
                        AudioManager.playClick()
                        useMissionStore.getState().startTEI()
                    }
                    break
                case 'KeyS':
                    // Stage separation and orbit insertion during LAUNCH
                    if (currentScene === 'LAUNCH' && state.ignited && !state.aborted) {
                        const met = state.met
                        const stage = state.currentStage
                        // Allow staging if timer reached OR fuel is completely empty
                        const readyToStage = (stage === 0 && (met >= 140 || state.fuel < 1)) ||
                            (stage === 1 && (met >= 340 || state.fuel < 1))
                        const readyForOrbit = (stage === 2 && (met >= 440 || state.fuel < 1)) && !state.inOrbit

                        if (readyToStage || readyForOrbit) {
                            // Signal the scene via a global flag so it can do visual FX
                            window.__stageSepPressed = true
                            setTimeout(() => { window.__stageSepPressed = false }, 200)
                        }
                    }
                    break
                case 'KeyL':
                    if (currentScene === 'LUNAR_SURFACE' && state.landed && !state.ascent) {
                        useMissionStore.getState().startAscent()
                    } else if (state.lunarApproach && state.onTranslunar) {
                        useMissionStore.getState().startLunarOrbit()
                    }
                    break
                case 'KeyF':
                    if (state.lunarApproach && state.onTranslunar) {
                        useMissionStore.getState().startFreeReturn()
                    }
                    break
                case 'KeyR':
                    if (state.docked && !state.onTransEarth) {
                        useMissionStore.getState().startTEI()
                    }
                    break
                case 'KeyP':
                    // Deploy parachutes during REENTRY
                    if (currentScene === 'REENTRY' && !state.parachutesDeployed) {
                        setValues({ parachutesDeployed: true })
                        AudioManager.playBeep(1000, 0.2)
                    }
                    break
                case 'KeyC':
                case 'KeyV':
                    if (currentScene !== 'KSC_EXPLORATION' && currentScene !== 'LUNAR_EXPLORATION') {
                        useMissionStore.getState().toggleCamera()
                    }
                    break
                case 'KeyM':
                    // Silence alarms (always available)
                    AudioManager.stopAlarmLoop()
                    AudioManager.playClick()
                    if (state.masterAlarm) {
                        setValues({ masterAlarm: false })
                    }
                    break
                case 'KeyH':
                    // Toggle HUD panels visibility
                    useMissionStore.getState().toggleHud()
                    break
                case 'KeyE':
                    if (currentScene === 'LUNAR_SURFACE' && state.landed && !state.ascent) {
                        useMissionStore.getState().startExploration()
                    }
                    break
                default:

                    break
            }
        }

        const handleKeyUp = (e) => {
            heldKeys[e.code] = false
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)

        // Expose heldKeys globally so p5 scenes can read it
        window.__heldKeys = heldKeys

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
            delete window.__heldKeys
        }
    }, [])

    return null
}
