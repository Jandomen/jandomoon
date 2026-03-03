// src/components/MissionControlPanel.jsx
// Panel flotante estilo cockpit Apollo con secciones organizadas y alarmas
import React, { useState, useEffect } from 'react'
import { useMissionStore } from '../stores/missionStore'
import AudioManager from '../audio/AudioManager'

const CockpitButton = ({ label, icon, onClick, active, color = '#0af', small, disabled }) => (
    <button
        onClick={disabled ? undefined : onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            width: '100%',
            padding: small ? '6px 8px' : '8px 10px',
            background: active
                ? `linear-gradient(180deg, ${color}33, ${color}11)`
                : disabled ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${active ? color : disabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: '4px',
            color: active ? color : disabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.7)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontFamily: '"Courier New", monospace',
            fontSize: small ? '10px' : '11px',
            fontWeight: active ? 'bold' : 'normal',
            textAlign: 'left',
            transition: 'all 0.15s',
            letterSpacing: '0.5px',
            boxShadow: active ? `0 0 6px ${color}33, inset 0 1px 0 ${color}22` : 'inset 0 1px 0 rgba(255,255,255,0.05)',
            textTransform: 'uppercase',
            opacity: disabled ? 0.4 : 1,
        }}
    >
        <span style={{ fontSize: small ? '12px' : '14px', width: '18px', textAlign: 'center' }}>{icon}</span>
        <span>{label}</span>
        {active && <span style={{
            marginLeft: 'auto',
            width: '6px', height: '6px',
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 6px ${color}`,
            animation: 'blink 1s infinite'
        }} />}
    </button>
)

const SectionLabel = ({ children, color = '#555' }) => (
    <div style={{
        fontSize: '9px',
        fontFamily: '"Courier New", monospace',
        letterSpacing: '2px',
        color,
        borderBottom: `1px solid ${color}44`,
        padding: '6px 0 3px 0',
        marginTop: '8px',
        marginBottom: '4px',
        textTransform: 'uppercase'
    }}>
        {children}
    </div>
)

const AlarmLight = ({ label, active, color = '#f00', onClick }) => (
    <div
        onClick={onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 6px',
            cursor: onClick ? 'pointer' : 'default',
            borderRadius: '3px',
            background: active ? `${color}22` : 'transparent',
            border: `1px solid ${active ? color : 'rgba(255,255,255,0.08)'}`,
            transition: 'all 0.3s'
        }}
    >
        <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: active ? color : '#333',
            boxShadow: active ? `0 0 8px ${color}, 0 0 2px ${color}` : 'none',
            animation: active ? 'blink 0.5s infinite' : 'none',
            transition: 'all 0.3s'
        }} />
        <span style={{
            fontSize: '9px',
            fontFamily: '"Courier New", monospace',
            color: active ? color : '#666',
            letterSpacing: '1px'
        }}>{label}</span>
    </div>
)

export function MissionControlPanel() {
    const {
        currentScene, phase, crashed, splashed, aborted,
        startOrbit, startTLI, startLunarOrbit, startDescent, landSuccess,
        startAscent, startTEI, startReentry, splashdown,
        startExploration, resetMission, masterAlarm, silenceAlarm,
        fuel, altitude, oxygenLevel, powerLevel
    } = useMissionStore()

    const [open, setOpen] = useState(false)
    const [alarmTestType, setAlarmTestType] = useState(null)

    // Alarma automática por recursos bajos
    useEffect(() => {
        if (fuel < 10 && fuel > 0 && currentScene === 'LUNAR_DESCENT') {
            AudioManager.startAlarmLoop('fuel')
            return () => AudioManager.stopAlarmLoop()
        }
    }, [fuel, currentScene])

    useEffect(() => {
        if (masterAlarm) {
            AudioManager.startAlarmLoop('master')
            return () => AudioManager.stopAlarmLoop()
        }
    }, [masterAlarm])

    if (crashed || splashed || aborted) return null

    const doAction = (fn) => {
        AudioManager.stopAll()
        fn()
    }

    return (
        <>
            {/* Toggle button */}
            <button
                onClick={() => { setOpen(!open); AudioManager.playClick() }}
                style={{
                    position: 'fixed',
                    top: '12px',
                    left: '12px',
                    zIndex: 9999,
                    background: open ? 'rgba(50, 20, 20, 0.95)' : 'rgba(15, 25, 40, 0.95)',
                    color: open ? '#f66' : '#0af',
                    border: `1px solid ${open ? '#f44' : '#0af'}55`,
                    padding: '8px 14px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontFamily: '"Courier New", monospace',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    letterSpacing: '1px',
                    boxShadow: `0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)`,
                    transition: 'all 0.2s'
                }}
            >
                {open ? '✕ CLOSE' : '◉ FLIGHT CONTROL'}
            </button>

            {/* Panel */}
            {open && (
                <div style={{
                    position: 'fixed',
                    top: '50px',
                    left: '12px',
                    zIndex: 9999,
                    background: 'linear-gradient(180deg, rgba(15,20,30,0.98), rgba(8,12,20,0.98))',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '12px',
                    width: '240px',
                    maxHeight: 'calc(100vh - 70px)',
                    overflowY: 'auto',
                    boxShadow: '0 4px 30px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)',
                    animation: 'panelSlideIn 0.2s ease-out'
                }}>
                    {/* Header */}
                    <div style={{
                        textAlign: 'center',
                        padding: '4px 0 8px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <div style={{ fontSize: '10px', color: '#0af', fontFamily: '"Courier New", monospace', letterSpacing: '2px' }}>
                            APOLLO FLIGHT CONTROLLER
                        </div>
                        <div style={{ fontSize: '8px', color: '#555', fontFamily: '"Courier New", monospace', marginTop: '2px' }}>
                            SCENE: <span style={{ color: '#0f0' }}>{currentScene}</span>
                        </div>
                    </div>

                    {/* ═══ ALARMAS ═══ */}
                    <SectionLabel color="#f44">⚠ ALARMS & CAUTION</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px' }}>
                        <AlarmLight
                            label="MASTER"
                            active={masterAlarm}
                            color="#f00"
                            onClick={() => { silenceAlarm(); AudioManager.stopAlarmLoop() }}
                        />
                        <AlarmLight label="FUEL LOW" active={fuel < 15 && fuel > 0} color="#ff0" />
                        <AlarmLight label="O2 LOW" active={oxygenLevel < 15} color="#f80" />
                        <AlarmLight label="PWR LOW" active={powerLevel < 15} color="#f80" />
                    </div>

                    {/* Botones de test de alarma */}
                    <SectionLabel color="#888">SOUND TESTS</SectionLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '2px', marginTop: '4px' }}>
                        {['master', 'fuel', 'altitude', 'program', 'voltage', 'pressure', 'temp', 'co2'].map(type => {
                            const isCaution = ['voltage', 'pressure', 'temp', 'co2'].includes(type)
                            const baseColor = isCaution ? '#f90' : '#f00' // Yellow-orange for caution, Red for warning
                            const bgActive = isCaution ? '#d80' : '#d00'

                            return (
                                <button
                                    key={type}
                                    onClick={() => {
                                        if (alarmTestType === type) {
                                            AudioManager.stopAlarmLoop()
                                            setAlarmTestType(null)
                                        } else {
                                            AudioManager.startAlarmLoop(type)
                                            setAlarmTestType(type)
                                        }
                                    }}
                                    style={{
                                        padding: '4px 2px',
                                        fontSize: '7px',
                                        fontFamily: '"Courier New", monospace',
                                        background: alarmTestType === type ? bgActive : `transparent`,
                                        border: `1px solid ${alarmTestType === type ? baseColor : `${baseColor}55`}`,
                                        color: alarmTestType === type ? '#fff' : baseColor,
                                        borderRadius: '2px',
                                        cursor: 'pointer',
                                        letterSpacing: '0px',
                                        textTransform: 'uppercase',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    {type}
                                </button>
                            )
                        })}
                    </div>

                    {/* ═══ LAUNCH & ORBIT ═══ */}
                    <SectionLabel color="#0af">🚀 LANZAMIENTO DE SECUENCIA</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <CockpitButton
                            icon="�" label="KSC Exploration"
                            active={currentScene === 'KSC_EXPLORATION'}
                            color="#8cf"
                            onClick={() => doAction(() => {
                                const { clearAllPhases, setValues } = useMissionStore.getState()
                                AudioManager.stopAll()
                                clearAllPhases()
                                setValues({ currentScene: 'KSC_EXPLORATION', phase: 'Pre-launch' })
                                AudioManager.startAmbient('launch')
                            })}
                        />
                        <CockpitButton
                            icon="�🏠" label="Pad — Pre-Launch"
                            active={currentScene === 'LAUNCH'}
                            color="#0af"
                            onClick={() => doAction(() => {
                                const { clearAllPhases, setValues } = useMissionStore.getState()
                                AudioManager.stopAll()
                                clearAllPhases()
                                setValues({ currentScene: 'LAUNCH', phase: 'Pre-launch' })
                                AudioManager.startAmbient('launch')
                            })}
                        />
                        <CockpitButton
                            icon="🌍" label="Earth Orbit"
                            active={currentScene === 'EARTH_ORBIT'}
                            color="#0cf"
                            onClick={() => doAction(startOrbit)}
                        />
                        <CockpitButton
                            icon="➡" label="Trans-Lunar Inject"
                            active={currentScene === 'TRANSLUNAR'}
                            color="#39f"
                            onClick={() => doAction(startTLI)}
                        />
                    </div>

                    {/* ═══ LUNAR OPS ═══ */}
                    <SectionLabel color="#ff0">🌙 LUNAR OPERATIONS</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <CockpitButton
                            icon="🌑" label="Lunar Orbit"
                            active={currentScene === 'LUNAR_ORBIT'}
                            color="#cc0"
                            onClick={() => doAction(startLunarOrbit)}
                        />
                        <CockpitButton
                            icon="⬇" label="Powered Descent"
                            active={currentScene === 'LUNAR_DESCENT'}
                            color="#f90"
                            onClick={() => doAction(startDescent)}
                        />
                        <CockpitButton
                            icon="🏴" label="Surface (Landed)"
                            active={currentScene === 'LUNAR_SURFACE'}
                            color="#0f0"
                            onClick={() => doAction(landSuccess)}
                        />
                        <CockpitButton
                            icon="👨‍🚀" label="EVA Exploration"
                            active={currentScene === 'LUNAR_EXPLORATION'}
                            color="#ff0"
                            onClick={() => doAction(startExploration)}
                        />
                        <CockpitButton
                            icon="⬆" label="Lunar Ascent"
                            active={currentScene === 'LUNAR_ASCENT'}
                            color="#f60"
                            onClick={() => doAction(startAscent)}
                        />
                    </div>

                    {/* ═══ RETURN TO EARTH ═══ */}
                    <SectionLabel color="#09f">🌍 EARTH RETURN</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <CockpitButton
                            icon="↩" label="Trans-Earth Inject"
                            active={currentScene === 'TRANSEARTH'}
                            color="#09f"
                            onClick={() => doAction(startTEI)}
                        />
                        <CockpitButton
                            icon="🔥" label="Re-Entry"
                            active={currentScene === 'REENTRY'}
                            color="#f30"
                            onClick={() => doAction(startReentry)}
                        />
                        <CockpitButton
                            icon="🌊" label="Splashdown"
                            active={currentScene === 'SPLASHDOWN'}
                            color="#0ff"
                            onClick={() => doAction(splashdown)}
                        />
                    </div>

                    {/* ═══ SYSTEM ═══ */}
                    <SectionLabel color="#666">⚙ SYSTEM</SectionLabel>
                    <div style={{ display: 'flex', gap: '3px' }}>
                        <button
                            onClick={() => doAction(resetMission)}
                            style={{
                                flex: 1,
                                padding: '6px',
                                background: 'rgba(255,0,0,0.08)',
                                border: '1px solid rgba(255,0,0,0.25)',
                                color: '#f55',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontFamily: '"Courier New", monospace',
                                fontSize: '9px',
                                fontWeight: 'bold',
                                letterSpacing: '1px'
                            }}
                        >
                            ↺ RESET
                        </button>
                        <button
                            onClick={() => {
                                AudioManager.playClick()
                                AudioManager.stopAll()
                            }}
                            style={{
                                flex: 1,
                                padding: '6px',
                                background: 'rgba(255,150,0,0.08)',
                                border: '1px solid rgba(255,150,0,0.25)',
                                color: '#fa0',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontFamily: '"Courier New", monospace',
                                fontSize: '9px',
                                fontWeight: 'bold',
                                letterSpacing: '1px'
                            }}
                        >
                            🔇 MUTE
                        </button>
                    </div>

                    {/* Status readout */}
                    <div style={{
                        marginTop: '8px',
                        padding: '6px',
                        borderRadius: '3px',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.06)'
                    }}>
                        <div style={{ fontSize: '8px', color: '#555', fontFamily: '"Courier New", monospace', letterSpacing: '1px', marginBottom: '3px' }}>
                            TELEMETRY
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
                            {[
                                { label: 'ALT', value: typeof altitude === 'number' ? altitude.toFixed(0) : '0', color: '#0f0' },
                                { label: 'FUEL', value: typeof fuel === 'number' ? fuel.toFixed(0) + '%' : '100%', color: fuel < 15 ? '#f00' : '#0f0' },
                                { label: 'O2', value: typeof oxygenLevel === 'number' ? oxygenLevel.toFixed(0) + '%' : '100%', color: oxygenLevel < 15 ? '#f80' : '#0f0' },
                                { label: 'PWR', value: typeof powerLevel === 'number' ? powerLevel.toFixed(0) + '%' : '100%', color: powerLevel < 15 ? '#f80' : '#0f0' },
                            ].map((item, i) => (
                                <div key={i} style={{ fontSize: '9px', fontFamily: '"Courier New", monospace' }}>
                                    <span style={{ color: '#555' }}>{item.label}: </span>
                                    <span style={{ color: item.color }}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        @keyframes panelSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
        </>
    )
}
