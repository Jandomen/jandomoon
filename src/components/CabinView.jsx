import React, { useState, useEffect } from 'react'
import { useMissionStore } from '../stores/missionStore'
import AudioManager from '../audio/AudioManager'

export function CabinView() {
    const {
        phase, altitude, velocity, landed, ascent, lunarDescent, isExploring, onTranslunar, onTransEarth,
        fuel, throttle, setValues, cabinLights, toggleLights, masterAlarm, silenceAlarm,
        heatShield, toggleHeatShield, toggleCamera, startTLI, startTEI, abortMission, aborted,
        isDaySide, toggleDaySide, oxygenLevel, powerLevel, countdown, startCountdown, ignited,
        lmDocked, isLookingBack, toggleLookBack, reentry, reentryPhase
    } = useMissionStore()

    const isNearMoon = landed || ascent || lunarDescent || isExploring
    const inDeepSpace = onTranslunar || onTransEarth
    const isOnEarth = !isNearMoon && !inDeepSpace
    const isReentryPlasma = reentry && reentryPhase === 'PLASMA'
    const isReentryInitial = reentry && reentryPhase === 'INITIAL'
    const isReentryTerminal = reentry && (reentryPhase === 'TERMINAL' || reentryPhase === 'PARACHUTE' || reentryPhase === 'FREEFALL')
    const isReentering = reentry || (aborted && altitude > 30)
    const isLunarLiftoff = ascent && altitude < 800 && altitude > 0

    const [dskyText, setDskyText] = useState({ verb: '06', noun: '62', prog: '11' })
    const [glitch, setGlitch] = useState(false)
    const [shake, setShake] = useState(false)

    // Efecto de vibración en el lanzamiento
    useEffect(() => {
        const isLaunchShake = ignited && phase.includes('Liftoff') && altitude < 50
        const isCountdownShake = countdown !== null && countdown <= 3 && countdown > 0
        if (isLaunchShake || isCountdownShake) {
            setShake(true)
        } else {
            setShake(false)
        }
    }, [ignited, phase, altitude, countdown])

    // Teclado global
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key.toLowerCase() === 'v') toggleCamera()
            if (e.key.toLowerCase() === 'c') toggleCamera()
            if (e.key.toLowerCase() === 'b') toggleLookBack()
            if (e.key.toLowerCase() === 'a' && e.shiftKey) abortMission()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [toggleCamera, abortMission])

    // Efecto de parpadeo para alarmas y cuenta regresiva
    useEffect(() => {
        if (masterAlarm || aborted || (countdown !== null && countdown <= 5)) {
            const interval = setInterval(() => setGlitch(prev => !prev), 500)
            if (masterAlarm) AudioManager.playAlarm()
            if (aborted) AudioManager.playAbort()
            if (countdown !== null && countdown > 0) AudioManager.playBeep(1200, 0.1)
            return () => clearInterval(interval)
        } else {
            setGlitch(false)
        }
    }, [masterAlarm, aborted, countdown])

    // Los sonidos ambientales ahora los maneja AudioManager.startAmbient()

    const handleAction = (type) => {
        AudioManager.playClick()
        switch (type) {
            case 'LAUNCH':
                if (countdown === null) startCountdown()
                break
            case 'SEPARATE':
                if (phase.includes('Launch') || phase.includes('Liftoff')) {
                    useMissionStore.getState().startOrbit()
                }
                break
            case 'TLI':
                startTLI()
                break
            case 'RETURN':
                startTEI()
                break
            case 'LIGHTS':
                toggleLights()
                break
            case 'ALARM':
                silenceAlarm()
                break
            case 'HEAT_SHIELD':
                toggleHeatShield()
                break
            case 'ABORT':
                if (window.confirm("CONFIRM MISSION ABORT?")) {
                    AudioManager.playAbort()
                    abortMission()
                }
                break
            case 'DAYSIDE':
                toggleDaySide()
                break
            case 'LOOK_BACK':
                toggleLookBack()
                break
            default:
                break
        }
    }

    if (aborted) {
        return (
            <div style={{
                position: 'absolute', inset: 0, background: glitch ? '#300' : '#100',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                color: '#f00', fontFamily: 'Orbitron', zIndex: 1000
            }}>
                <h1 style={{ fontSize: '72px' }}>MISSION ABORTED</h1>
                <p style={{ fontSize: '24px' }}>EMERGENCY PROCEDURES INITIATED</p>
                <button onClick={() => location.reload()} style={{
                    marginTop: '40px', padding: '15px 40px', background: '#f00', color: '#000', border: 'none',
                    fontSize: '20px', cursor: 'pointer', fontWeight: 'bold'
                }}>RESTART MISSION</button>
            </div>
        )
    }

    const shakeStyle = shake ? {
        animation: `shaking ${0.1 / (throttle + 0.5)}s infinite alternate`,
        filter: `blur(${throttle * 0.5}px)` // Efecto de vibración visual
    } : {}

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            background: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontFamily: '"Orbitron", "Courier New", monospace',
            transition: 'background 0.5s',
            pointerEvents: 'auto',
            zIndex: 50,
            transform: shake ? `translate(${Math.random() * throttle}px, ${Math.random() * throttle}px)` : 'none',
            ...shakeStyle
        }}>
            {/* Marco de la ventana - SIN SOMBRAS QUE TAPEN EL EXTERIOR */}
            {!isLookingBack ? (
                <div style={{
                    width: '80%',
                    height: '45%',
                    border: '20px solid #222',
                    borderRadius: '60px 60px 20px 20px',
                    background: 'transparent',
                    marginBottom: '20px',
                    position: 'relative',
                    boxShadow: 'inset 0 0 100px rgba(0,0,0,0.9)', // Sombra INTERNA
                    transition: 'all 2s',
                    // Creamos el "agujero" con un borde masivo pero sin que la sombra sea el problema
                    outline: `2000px solid ${cabinLights ? '#151515' : '#020205'}`
                }}>
                    {/* Brillo solar en el cristal - Diferente en Tierra vs Espacio/Luna */}
                    {(isDaySide && !isReentering && !isLunarLiftoff) && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: isOnEarth
                                ? 'linear-gradient(135deg, rgba(255,255,200,0.15) 0%, transparent 60%)' // Tierra
                                : 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 40%)', // Luna/Espacio (Brillo Crudo)
                            pointerEvents: 'none',
                            mixBlendMode: 'plus-lighter'
                        }} />
                    )}

                    {/* LUNAR LANDING / ASCENT EFFECTS */}
                    {isNearMoon && !isExploring && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: isDaySide ? 'rgba(200,200,210,0.05)' : 'rgba(0,0,0,0.4)',
                            zIndex: 1, pointerEvents: 'none'
                        }}>
                            {/* Faint window reflections of the moon surface */}
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
                                mixBlendMode: 'plus-lighter'
                            }} />
                        </div>
                    )}

                    {/* DUST PARTICLES during touchdown or liftoff */}
                    {(isLunarLiftoff || (lunarDescent && altitude < 100)) && (
                        <div style={{
                            position: 'absolute', inset: -20,
                            zIndex: 6, pointerEvents: 'none'
                        }}>
                            {/* Improved dust cloud */}
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'radial-gradient(circle at center, rgba(160,150,140,0.7) 0%, rgba(100,90,80,0.4) 60%, transparent 100%)',
                                filter: 'blur(30px)',
                                animation: 'shaking 0.05s infinite alternate'
                            }} />
                            {/* Flying dust specks */}
                            {[...Array(15)].map((_, i) => (
                                <div key={i} style={{
                                    position: 'absolute',
                                    width: Math.random() * 8 + 2 + 'px',
                                    height: '2px',
                                    background: 'rgba(255,255,255,0.6)',
                                    left: Math.random() * 100 + '%',
                                    top: Math.random() * 100 + '%',
                                    filter: 'blur(1px)',
                                    animation: `dustFly ${Math.random() * 0.5 + 0.2}s infinite linear`,
                                    animationDelay: `-${Math.random()}s`
                                }} />
                            ))}
                        </div>
                    )}

                    {/* RE-ENTRY — Window content synced to actual reentry phase */}
                    {isReentryPlasma && (
                        <div style={{
                            position: 'absolute', inset: -20,
                            background: 'radial-gradient(circle at center, rgba(255,100,0,0.9) 0%, rgba(255,50,0,0.7) 40%, rgba(150,0,0,0.5) 100%)',
                            borderRadius: '40px',
                            animation: 'shaking 0.1s infinite alternate, plasmaPulse 0.5s infinite ease-in-out',
                            zIndex: 5,
                            mixBlendMode: 'plus-lighter',
                            boxShadow: '0 0 150px #f50'
                        }} />
                    )}

                    {/* RE-ENTRY INITIAL — Earth glow approaching, no fire yet */}
                    {isReentryInitial && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'radial-gradient(ellipse at center bottom, rgba(60,140,255,0.3) 0%, rgba(0,0,0,0) 70%)',
                            zIndex: 5,
                            pointerEvents: 'none'
                        }} />
                    )}

                    {/* RE-ENTRY TERMINAL — Fire is GONE, sky clearing */}
                    {isReentryTerminal && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(to bottom, rgba(60,120,200,0.4) 0%, rgba(130,180,245,0.3) 100%)',
                            zIndex: 5,
                            pointerEvents: 'none'
                        }} />
                    )}
                </div>
            ) : (
                <div style={{
                    width: '80%',
                    height: '40%',
                    background: '#111',
                    border: '15px solid #333',
                    borderRadius: '20px',
                    marginBottom: '20px',
                    display: 'flex',
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '80px', filter: shake ? 'blur(1px)' : 'none' }}>👨‍🚀</div>
                        <div style={{ fontSize: '10px', color: '#555', marginTop: '10px' }}>ARMSTRONG</div>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <div style={{ fontSize: '80px', filter: shake ? 'blur(1px)' : 'none' }}>👨‍🚀</div>
                        <div style={{ fontSize: '10px', color: '#555', marginTop: '10px' }}>COLLINS</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '80px', filter: shake ? 'blur(1px)' : 'none' }}>👨‍🚀</div>
                        <div style={{ fontSize: '10px', color: '#555', marginTop: '10px' }}>ALDRIN</div>
                    </div>
                    {/* Hatch and details */}
                    <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '60px', height: '40px', border: '2px solid #222', borderRadius: '5px' }} />
                </div>
            )}

            {/* Estilos para animaciones */}
            <style>{`
@keyframes sunMove { from { transform: translate(-20%, -20%); } to { transform: translate(20%, 20%); } }
@keyframes shaking { from { transform: translate(2px, 2px); } to { transform: translate(-2px, -2px); } }
@keyframes plasmaPulse { 0% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } 100% { opacity: 0.7; transform: scale(1); } }
@keyframes dustPulse { 0% { opacity: 0.3; } 50% { opacity: 0.7; } 100% { opacity: 0.3; } }
@keyframes dustFly { 
    0% { transform: translate(0, 0) opacity(0); }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translate(500px, 200px); opacity: 0; }
}
`}</style>

            {/* Panel Principal */}
            <div style={{
                width: '90%',
                height: '50%',
                background: '#1a1a1a',
                border: '1px solid #444',
                borderRadius: '5px',
                padding: '20px',
                display: 'grid',
                gridTemplateColumns: '1.2fr 2fr 1.2fr',
                gap: '20px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                position: 'relative'
            }}>

                {/* Lado Izquierdo: Switches Auténticos Apollo */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'flex-start', background: '#111', padding: '10px', borderRadius: '5px', overflowY: 'auto' }}>
                    <div style={{ fontSize: '9px', color: '#666', borderBottom: '1px solid #333', paddingBottom: '3px', marginBottom: '5px', letterSpacing: '1px' }}>PANEL 1 — SYSTEMS</div>

                    <ToggleButton label="CABIN PRESS" active={cabinLights} onClick={() => handleAction('LIGHTS')} color="#0f0" />
                    <ToggleButton label="SUIT COMPRESSOR" active={true} onClick={() => AudioManager.playClick()} color="#0f0" />
                    <ToggleButton label="ECS GLYCOL" active={true} onClick={() => AudioManager.playClick()} color="#0f0" />

                    <div style={{ fontSize: '9px', color: '#666', borderBottom: '1px solid #333', paddingBottom: '3px', marginTop: '8px', marginBottom: '5px', letterSpacing: '1px' }}>PROPULSION</div>
                    <ToggleButton label="SPS ENGINE ARM" active={useMissionStore.getState().ignited} onClick={() => AudioManager.playClick()} color="#f50" />
                    <ToggleButton label="RCS CMD" active={true} onClick={() => AudioManager.playClick()} color="#0f0" />
                    <ToggleButton label="SM RCS HEATER" active={true} onClick={() => AudioManager.playClick()} color="#0f0" />

                    <div style={{ fontSize: '9px', color: '#666', borderBottom: '1px solid #333', paddingBottom: '3px', marginTop: '8px', marginBottom: '5px', letterSpacing: '1px' }}>GUIDANCE</div>
                    <ToggleButton label="CMC MODE FREE" active={false} onClick={() => AudioManager.playClick()} color="#0af" />
                    <ToggleButton label="SCS TVC" active={true} onClick={() => AudioManager.playClick()} color="#0af" />
                    <ToggleButton label="RADAR ALT" active={useMissionStore.getState().lunarDescent} onClick={() => AudioManager.playClick()} color="#ff0" />

                    <div style={{ fontSize: '9px', color: '#666', borderBottom: '1px solid #333', paddingBottom: '3px', marginTop: '8px', marginBottom: '5px', letterSpacing: '1px' }}>COMM & NAV</div>
                    <ToggleButton label="S-BAND AUX" active={true} onClick={() => AudioManager.playClick()} color="#0f0" />
                    <ToggleButton label="VHF AM" active={true} onClick={() => AudioManager.playClick()} color="#0f0" />
                    <ToggleButton label="UP TLM CMD" active={true} onClick={() => AudioManager.playClick()} color="#0f0" />

                    <div style={{
                        margin: '8px 0 4px 0',
                        padding: '6px',
                        background: '#191919',
                        borderRadius: '3px',
                        border: '1px solid #333',
                        boxShadow: isLookingBack ? '0 0 8px #0af' : 'none'
                    }}>
                        <ToggleButton label="REAR VIEW" active={isLookingBack} onClick={() => handleAction('LOOK_BACK')} color="#0af" />
                        <div style={{ fontSize: '7px', color: '#555', marginTop: '3px', textAlign: 'center' }}>[ KEY: B ]</div>
                    </div>

                    <ToggleButton label={`TIME WARP ${useMissionStore.getState().timeWarp > 1 ? useMissionStore.getState().timeWarp + 'X' : 'OFF'}`} active={useMissionStore.getState().timeWarp > 1} onClick={() => {
                        const current = useMissionStore.getState().timeWarp;
                        setValues({ timeWarp: current >= 8 ? 1 : current * 2 });
                        AudioManager.playClick()
                    }} color="#fff" />

                    <ToggleButton label="HEAT SHIELD" active={heatShield} onClick={() => handleAction('HEAT_SHIELD')} color="#f00" />

                    {/* Alarma */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', marginTop: '4px' }}>
                        <div style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: (fuel < 10 && fuel > 0 && Math.floor(Date.now() / 500) % 2 === 0) ? '#f00' : (fuel < 10 && fuel > 0) ? '#800' : '#300',
                            boxShadow: (fuel < 10 && fuel > 0) ? '0 0 6px #f00' : 'none',
                        }} />
                        <span style={{ fontSize: '8px', color: fuel < 10 ? '#f00' : '#555' }}>PROPELLANT QTY</span>
                    </div>

                    <div style={{ marginTop: 'auto' }}>
                        <button
                            onClick={() => handleAction('ABORT')}
                            style={{
                                width: '100%', padding: '7px', background: '#300', color: '#f00', border: '2px solid #f00',
                                borderRadius: '3px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer',
                                letterSpacing: '1px', fontFamily: '"Courier New", monospace'
                            }}
                        >
                            ⚠ ABORT
                        </button>
                    </div>
                </div>

                {/* Centro: DSKY */}
                <div style={{
                    background: '#0a0a0a',
                    border: '10px solid #222',
                    borderRadius: '5px',
                    padding: '15px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <div style={{ color: '#fff', fontSize: '12px', marginBottom: '5px' }}>COMPUTER SUBSYSTEM - BLOCK II</div>
                    <div style={{ color: '#0f0', fontSize: '9px', marginBottom: '10px', height: '15px' }}>
                        {phase.toUpperCase()} - {lmDocked ? 'DOCKED' : 'STANDALONE'}
                    </div>

                    <div style={{
                        background: '#002200',
                        width: '100%',
                        height: '120px',
                        border: '2px solid #0f0',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        padding: '10px',
                        fontFamily: 'monospace',
                        color: masterAlarm && glitch ? '#f00' : '#0f0',
                        fontSize: '24px'
                    }}>
                        <div>PROG<br />{dskyText.prog}</div>
                        <div>VERB<br />{dskyText.verb}</div>
                        <div>NOUN<br />{dskyText.noun}</div>
                        <div style={{ gridColumn: 'span 3', borderTop: '1px solid #0f0', marginTop: '5px', paddingTop: '5px', fontSize: '18px' }}>
                            R1: {altitude.toFixed(0).padStart(5, '0')}<br />
                            R2: {(velocity * 1000).toFixed(0).padStart(5, '0')}<br />
                            R3: {fuel.toFixed(0).padStart(5, '0')}
                        </div>
                        {phase.includes('Descent') && (
                            <div style={{ gridColumn: 'span 3', color: '#ff0', fontSize: '14px', marginTop: '5px', textAlign: 'center', borderTop: '1px dashed #ff0', paddingTop: '5px' }}>
                                LR ALT: {altitude.toFixed(1)} FT<br />
                                LR VEL: {(velocity * 10).toFixed(1)} FPS
                            </div>
                        )}
                    </div>

                    {/* Decorative Status Lights */}
                    <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                        <StatusLight label="S-IC" active={phase === 'Liftoff!'} color="#f00" />
                        <StatusLight label="S-II" active={phase.includes('Stage 1')} color="#f50" />
                        <StatusLight label="S-IVB" active={phase.includes('Stage 2') || onTranslunar} color="#0af" />
                        <StatusLight label="LM" active={lmDocked} color="#ffd700" />
                        <StatusLight label="UPLINK" active={true} color="#0f0" />
                        <StatusLight label="TEMP" active={true} color="#0f0" />
                        <StatusLight label="GDC" active={false} color="#f00" />
                        <StatusLight label="O2" active={true} color="#0f0" />
                    </div>

                    {/* Teclado DSKY */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '5px',
                        marginTop: '15px',
                        width: '100%'
                    }}>
                        {['VERB', 'NOUN', 'PROG', '7', '8', '9', '4', '5', '6', '1', '2', '3', 'CLR', '0', 'ENT'].map(key => (
                            <button key={key} style={{
                                background: '#333', color: '#fff', border: 'none', padding: '10px', borderRadius: '3px', cursor: 'pointer',
                                fontSize: '12px', fontWeight: 'bold', borderBottom: '3px solid #000'
                            }}>{key}</button>
                        ))}
                    </div>
                </div>

                {/* Lado Derecho: Alarma y Otros */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', justifyContent: 'center' }}>

                    {/* FDAI / Gyroscope (Attitude Indicator) */}
                    <div style={{
                        width: '100px', height: '100px', borderRadius: '50%', background: '#222',
                        border: '5px solid #444', position: 'relative', overflow: 'hidden',
                        boxShadow: 'inset 0 0 20px #000, 0 0 10px rgba(0, 150, 255, 0.2)'
                    }}>
                        <div style={{
                            position: 'absolute', width: '100%', height: '50%', background: '#333',
                            top: 0, transform: `rotate(${velocity * 1.5}deg) translateY(${Math.sin(altitude * 0.01) * 20}px)`,
                            transition: 'all 0.5s linear', borderBottom: '1px solid #fff'
                        }} />
                        <div style={{
                            position: 'absolute', width: '100%', height: '50%', background: '#888',
                            bottom: 0, transform: `rotate(${velocity * 1.5}deg) translateY(${Math.sin(altitude * 0.01) * 20}px)`,
                            transition: 'all 0.5s linear'
                        }} />
                        {/* Crosshairs */}
                        <div style={{ position: 'absolute', width: '100%', height: '1px', background: 'rgba(255,255,0,0.5)', top: '50%', zIndex: 10 }} />
                        <div style={{ position: 'absolute', height: '100%', width: '1px', background: 'rgba(255,255,0,0.5)', left: '50%', zIndex: 10 }} />
                        <div style={{
                            position: 'absolute', bottom: '5px', width: '100%', textAlign: 'center',
                            fontSize: '8px', color: '#fff', zIndex: 15, fontWeight: 'bold'
                        }}>FDAI 1</div>
                    </div>

                    <div
                        onClick={() => handleAction('ALARM')}
                        style={{
                            width: '60px',
                            height: '60px',
                            background: masterAlarm ? (glitch ? '#f00' : '#800') : '#222',
                            border: '4px solid #444',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#fff',
                            fontSize: '9px',
                            textAlign: 'center',
                            boxShadow: masterAlarm ? '0 0 20px #f00' : 'none',
                            transition: 'all 0.1s'
                        }}>
                        MASTER<br />ALARM
                    </div>

                    <div style={{ textAlign: 'center', width: '100%', fontSize: '10px' }}>
                        <div style={{ color: '#888', marginBottom: '5px' }}>TELEMETRY</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                            <div style={{ background: '#000', padding: '5px', border: '1px solid #333' }}>
                                <div style={{ color: oxygenLevel < 20 ? '#f00' : '#0f0' }}>O2</div>
                                <div>{oxygenLevel.toFixed(1)}%</div>
                            </div>
                            <div style={{ background: '#000', padding: '5px', border: '1px solid #333' }}>
                                <div style={{ color: powerLevel < 20 ? '#f00' : '#0f0' }}>PWR</div>
                                <div>{powerLevel.toFixed(1)}%</div>
                            </div>
                            <div style={{ background: '#000', padding: '5px', border: '1px solid #333' }}>
                                <div style={{ color: '#0f0' }}>TEMP</div>
                                <div>72°F</div>
                            </div>
                            <div style={{ background: '#000', padding: '5px', border: '1px solid #333' }}>
                                <div style={{ color: '#0f0' }}>RAD</div>
                                <div>0.1 mSv</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', width: '100%' }}>
                        <div style={{ fontSize: '10px', color: '#888' }}>THROTTLE</div>
                        <div style={{ height: '60px', width: '25px', background: '#000', border: '2px solid #555', margin: '5px auto', position: 'relative' }}>
                            <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${throttle * 100}%`, background: '#0af' }} />
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', width: '100%', borderTop: '1px solid #333', paddingTop: '10px' }}>
                        <div style={{ fontSize: '8px', color: '#888', marginBottom: '5px' }}>FLOW RATES</div>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                            <div style={{ width: '10px', height: '40px', background: '#111', border: '1px solid #333', position: 'relative' }}>
                                <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${throttle * 80}%`, background: '#f50' }} />
                                <div style={{ fontSize: '6px', color: '#555', marginTop: '42px' }}>FUEL</div>
                            </div>
                            <div style={{ width: '10px', height: '40px', background: '#111', border: '1px solid #333', position: 'relative' }}>
                                <div style={{
                                    position: 'absolute', bottom: 0, width: '100%',
                                    height: `${70 + Math.sin(Date.now() * 0.005) * 10}%`,
                                    background: '#0ff',
                                    transition: 'height 0.1s linear'
                                }} />
                                <div style={{ fontSize: '6px', color: '#555', marginTop: '42px' }}>O2</div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}

function ToggleButton({ label, active, onClick, color }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
                onClick={onClick}
                style={{
                    width: '40px',
                    height: '20px',
                    background: active ? color : '#333',
                    border: '2px solid #555',
                    borderRadius: '10px',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                }}
            >
                <div style={{
                    position: 'absolute',
                    left: active ? '20px' : '2px',
                    top: '2px',
                    width: '12px',
                    height: '12px',
                    background: '#fff',
                    borderRadius: '50%',
                    transition: 'all 0.3s'
                }} />
            </button>
            <span style={{ fontSize: '10px', color: '#ccc' }}>{label}</span>
        </div>
    )
}

function StatusLight({ label, active, color }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '40px' }}>
            <div style={{
                width: '10px',
                height: '10px',
                background: active ? color : '#222',
                borderRadius: '50%',
                boxShadow: active ? `0 0 10px ${color}` : 'none',
                border: '1px solid #444',
                marginBottom: '4px'
            }} />
            <span style={{ fontSize: '7px', color: '#888' }}>{label}</span>
        </div>
    )
}
