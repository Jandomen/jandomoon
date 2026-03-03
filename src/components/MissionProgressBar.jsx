import React from 'react'
import { useMissionStore } from '../stores/missionStore'

export function MissionProgressBar() {
    const { altitude, onTranslunar, inOrbit, lunarOrbit, lunarDescent, landed, crashed, reentry, onTransEarth, ascent } = useMissionStore()

    // Distancia total aproximada a la Luna: 384,400 km
    // Proporción visual: Tierra (0) -> Órbita (180 km) -> Luna (384k km)

    let progress = 0
    let stageName = "PRE-LANZAMIENTO"

    if (reentry) {
        progress = 5
        stageName = "RE-ENTRY INTERFACE"
    } else if (onTransEarth) {
        progress = 30 + (altitude / 384400) * 55
        stageName = "TRANS-EARTH COAST"
    } else if (ascent) {
        progress = 92
        stageName = "LUNAR ASCENT / RENDEZVOUS"
    } else if (landed) {
        progress = 100
        stageName = "LUNAR SURFACE"
    } else if (lunarDescent) {
        progress = 85 + (1 - (altitude / 15000)) * 15
        stageName = "POWERED DESCENT"
    } else if (lunarOrbit) {
        progress = 82
        stageName = "LUNAR ORBIT"
    } else if (onTranslunar) {
        progress = 30 + (altitude / 384400) * 55
        stageName = "TRANSLUNAR COAST"
    } else if (inOrbit) {
        progress = 25
        stageName = "EARTH ORBIT"
    } else if (altitude > 0) {
        progress = Math.min(25, (altitude / 185) * 25)
        stageName = "ASCENT"
    }

    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60%',
            zIndex: 1000,
            fontFamily: 'Orbitron, sans-serif'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: '#0af',
                fontSize: '10px',
                marginBottom: '5px'
            }}>
                <span>EARTH</span>
                <span style={{ color: '#fff' }}>{stageName}</span>
                <span>MOON</span>
            </div>
            <div style={{
                height: '4px',
                background: 'rgba(0, 150, 255, 0.2)',
                borderRadius: '2px',
                position: 'relative'
            }}>
                <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${Math.min(100, progress)}%`,
                    background: 'linear-gradient(90deg, #0af, #0ff)',
                    boxShadow: '0 0 15px #0af',
                    borderRadius: '2px',
                    transition: 'width 0.5s linear'
                }} />

                {/* Marcadores de etapa */}
                <div style={{ position: 'absolute', left: '30%', top: '-3px', width: '2px', height: '10px', background: '#444' }} />
                <div style={{ position: 'absolute', left: '60%', top: '-3px', width: '2px', height: '10px', background: '#444' }} />

                {/* Icono del Cohete */}
                <div style={{
                    position: 'absolute',
                    left: `${Math.min(100, progress)}%`,
                    top: '-15px',
                    transform: 'translateX(-50%)',
                    transition: 'left 0.5s linear'
                }}>
                    <div style={{ color: '#fff', fontSize: '14px' }}>▲</div>
                </div>
            </div>
        </div>
    )
}
