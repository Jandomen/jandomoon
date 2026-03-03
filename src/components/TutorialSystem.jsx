import React, { useEffect, useState } from 'react'
import { useMissionStore } from '../stores/missionStore'
import AudioManager from '../audio/AudioManager'

export function TutorialSystem() {
    const {
        tutorialStep,
        nextTutorialStep,
        isTutorialActive,
        setValues,
        cameraMode,
        cabinLights,
        countdown,
        throttle,
        ignited,
        altitude,
        onTranslunar,
        inOrbit,
        lunarApproach,
        lunarDescent,
        landed,
        ascent,
        reentry,
        parachutesDeployed,
        splashed
    } = useMissionStore()

    const [message, setMessage] = useState('')

    useEffect(() => {
        // Iniciar tutorial al cargar
        if (isTutorialActive && tutorialStep === 0) {
            setTimeout(() => setValues({ tutorialStep: 1 }), 1000)
        }
    }, [isTutorialActive, tutorialStep])

    // Auto-Advance based on Phase (Catch-up mechanism)
    useEffect(() => {
        if (!isTutorialActive) return

        // Catch-up mapping
        if (reentry && tutorialStep < 12) {
            setValues({ tutorialStep: 12 })
        } else if (onTranslunar && altitude > 300000 && tutorialStep < 8) {
            setValues({ tutorialStep: 8 })
        } else if (onTranslunar && tutorialStep < 6) {
            setValues({ tutorialStep: 6 })
        } else if (inOrbit && tutorialStep < 5) {
            setValues({ tutorialStep: 5 })
        }
    }, [tutorialStep, isTutorialActive, reentry, onTranslunar, altitude, inOrbit])

    useEffect(() => {
        switch (tutorialStep) {
            case 1:
                setMessage("BIENVENIDO COMANDANTE. SU MISIÓN: ALUNIZAR EN LA LUNA. PRIMERO, VAYA A LA CABINA. PRESIONE 'V' O 'C' PARA CAMBIAR DE VISTA.")
                if (cameraMode === 'cabin') {
                    AudioManager.playBeep(1200, 0.2)
                    nextTutorialStep()
                }
                break
            case 2:
                setMessage("BUEN TRABAJO. LOS SISTEMAS DE LA CABINA ESTÁN DESACTIVADOS. ACTIVE EL INTERRUPTOR 'CABIN LIGHTS' (ARRIBA A LA IZQUIERDA) PARA ENCENDERLOS.")
                // El listener de subscribe se encarga del paso 2
                break
            case 3:
                setMessage("INSTRUMENTOS EN LÍNEA. AHORA, 'ARME' LA MISIÓN (O PRESIONE ESPACIO) PARA INICIAR LA CUENTA REGRESIVA AUTOMÁTICA.")
                if (countdown !== null || ignited) {
                    AudioManager.playBeep(1200, 0.2)
                    nextTutorialStep()
                }
                break
            case 4:
                setMessage("¡CUENTA REGRESIVA ACTIVA! EL COHETE NECESITA POTENCIA. USE LA TECLA 'FLECHA DERECHA' PARA SUBIR EL ACELERADOR AL 100%.")
                if (throttle >= 0.9) {
                    AudioManager.playBeep(1400, 0.3)
                    setMessage("POTENCIA MÁXIMA ALCANZADA. ¡PREPÁRESE PARA EL DESPEGUE!")
                    if (altitude > 10) nextTutorialStep()
                }
                break
            case 5:
                setMessage("ESTAMOS ASCENDIENDO. MANTENGA LA POTENCIA HASTA ALCANZAR LOS 180 KM DE ALTITUD PARA ENTRAR EN ÓRBITA.")
                if (altitude > 180) {
                    setMessage("¡ÓRBITA ALCANZADA! YA PUEDE REDUCIR LA POTENCIA SI DESEA.")
                    setTimeout(() => nextTutorialStep(), 4000)
                }
                break
            case 6:
                setMessage("PARA SALIR HACIA LA LUNA, NECESITAMOS LA INYECCIÓN TRANS-LUNAR. PRESIONE LA TECLA 'T' PARA INICIAR EL TLI.")
                if (onTranslunar) {
                    AudioManager.playBeep(1600, 0.4)
                    nextTutorialStep()
                }
                break
            case 7:
                setMessage("EN TRÁNSITO HACIA LA LUNA. PUEDE USAR 'W' PARA ADELANTAR EL TIEMPO. CUANDO ESTÉ CERCA, APARECERÁ LA OPCIÓN DE ALUNIZAR.")
                if (lunarApproach) nextTutorialStep()
                break
            case 8:
                setMessage("APROXIMACIÓN LUNAR. PRESIONE 'L' PARA EMPEZAR EL DESCENSO POWERED O 'F' PARA RETORNO LIBRE.")
                if (lunarDescent) nextTutorialStep()
                break
            case 9:
                setMessage("DESCENSO LUNAR: CONTROLE LA VELOCIDAD CON LAS FLECHAS. DEBE ATERRIZAR A MENOS DE 5 m/s.")
                if (landed) nextTutorialStep()
                break
            case 10:
                setMessage("¡EL EAGLE HA ATERRIZADO! DISFRUTE LA VISTA. CUANDO ESTÉ LISTO, PRESIONE 'L' PARA VOLVER A LA ÓRBITA.")
                if (ascent) nextTutorialStep()
                break
            case 11:
                setMessage("REGRESANDO A LA TIERRA. UNA VEZ ACOPLADO, PRESIONE 'R' PARA INICIAR EL REGRESO (TEI).")
                if (reentry) nextTutorialStep()
                break
            case 12:
                setMessage("RE-ENTRADA: MANTENGA LA CÁPSULA NIVELADA CON LAS FLECHAS. ¡NO PERMITA QUE EL CALOR NOS QUEME!")
                if (parachutesDeployed) nextTutorialStep()
                break
            case 13:
                setMessage("¡DESPLIEGUE LOS PARACAÍDAS! PRESIONE 'P' PARA ABRIRLOS ANTES DE IMPACTAR EL MAR.")
                if (splashed) nextTutorialStep()
                break
            default:
                setMessage('')
        }
    }, [tutorialStep, cameraMode, cabinLights, countdown, throttle, ignited, altitude, onTranslunar, lunarApproach, lunarDescent, landed, ascent, reentry, parachutesDeployed, splashed])

    // Listener para el paso de luces (paso 2)
    useEffect(() => {
        if (tutorialStep === 2) {
            const unsub = useMissionStore.subscribe(
                (state) => state.cabinLights,
                () => {
                    if (tutorialStep === 2) nextTutorialStep()
                }
            )
            return () => unsub()
        }
    }, [tutorialStep])

    if (!isTutorialActive || tutorialStep === 0) return null

    return (
        <div style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 10, 30, 0.95)',
            border: '2px solid #0af',
            padding: '20px 40px',
            borderRadius: '10px',
            color: '#fff',
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '18px',
            textAlign: 'center',
            zIndex: 2000,
            boxShadow: '0 0 30px rgba(0, 150, 255, 0.4)',
            maxWidth: '600px',
            pointerEvents: 'none',
            animation: 'pulse 2s infinite'
        }}>
            <div style={{ fontSize: '12px', color: '#0af', marginBottom: '10px', letterSpacing: '2px' }}>CONTROL DE MISIÓN: APOLLO 11</div>
            {message}

            <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 10px rgba(0, 150, 255, 0.3); }
          50% { box-shadow: 0 0 30px rgba(0, 150, 255, 0.6); }
          100% { box-shadow: 0 0 10px rgba(0, 150, 255, 0.3); }
        }
      `}</style>
        </div>
    )
}
