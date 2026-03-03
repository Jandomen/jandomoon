// src/scenes/LunarAscentScene.jsx
import { LunarModule } from '../entities/LunarModule'
import { useMissionStore } from '../stores/missionStore'
import { useEffect, useRef } from 'react'
import p5 from 'p5'
import AudioManager from '../audio/AudioManager'

export function LunarAscentScene() {
    const ref = useRef()
    const { ascent, altitude, velocity, fuel, docked, setValues, dockSuccess, startTEI, cameraMode } = useMissionStore()

    useEffect(() => {
        if (!ascent) return

        const sketch = p => {
            let lm
            let stars = []
            let moonSurfaceY
            let craters = []
            let smoke = []
            let liftoffFlash = 0
            let hasIgnitedLocal = false
            let ignitionTime = 0
            let dockTriggered = false  // Guard — only trigger docking once

            p.setup = () => {
                p.createCanvas(p.windowWidth, p.windowHeight)
                lm = new LunarModule(p)
                moonSurfaceY = p.height * 0.55

                // Create stars with depth
                for (let i = 0; i < 400; i++) {
                    stars.push({
                        x: p.random(p.width),
                        y: p.random(p.height),
                        sz: p.random(0.5, 2.5),
                        b: p.random(150, 255)
                    })
                }

                // Pre-generate craters
                for (let i = 0; i < 60; i++) {
                    craters.push({
                        x: p.random(-2000, 2000),
                        y: p.random(-400, 800),
                        sz: p.random(20, 150),
                        shade: p.random(120, 180)
                    })
                }
                p.playedSep = false
            }

            p.draw = () => {
                const { throttle, fuel, altitude, velocity, cameraMode, timeWarp, waitingForIgnition, docked } = useMissionStore.getState()
                p.background(0)

                // --- STARS ---
                p.noStroke()
                stars.forEach(s => {
                    p.fill(s.b)
                    p.circle(s.x, s.y, s.sz)
                })

                // Handle local ignition state
                if (!waitingForIgnition && !hasIgnitedLocal) {
                    hasIgnitedLocal = true
                    ignitionTime = p.frameCount
                }

                // --- DYNAMIC RECESSION logic (The Moon falls away) ---
                p.push()
                // Recede faster as we gain altitude
                let recedePower
                if (altitude < 1000) {
                    recedePower = p.map(altitude, 0, 1000, 0, p.height * 0.25)
                } else if (altitude < 10000) {
                    recedePower = p.map(altitude, 1000, 10000, p.height * 0.25, p.height * 0.8)
                } else {
                    recedePower = p.map(altitude, 10000, 60000, p.height * 0.8, p.height * 2.5)
                }
                p.translate(0, recedePower)

                // Render Moon Surface
                p.noStroke()
                const gradSteps = 120
                for (let i = 0; i < gradSteps; i++) {
                    const col = p.lerp(190, 20, i / gradSteps)
                    p.fill(col)
                    const y = moonSurfaceY + i * (p.height / gradSteps)
                    p.rect(0, y, p.width, p.height / gradSteps + 2)
                }

                // Craters with perspective
                craters.forEach(c => {
                    const cScale = p.map(p.constrain(altitude, 0, 15000), 0, 15000, 1.0, 0.05)
                    const cx = p.width / 2 + c.x * cScale
                    const cy = moonSurfaceY + 40 + c.y * cScale

                    if (cy > moonSurfaceY - 50) {
                        p.fill(c.shade, 200 * cScale)
                        p.ellipse(cx, cy, c.sz * cScale, c.sz * 0.35 * cScale)
                        p.fill(c.shade - 40, 150 * cScale)
                        p.ellipse(cx - 2 * cScale, cy - 1 * cScale, c.sz * 0.8 * cScale, c.sz * 0.25 * cScale)
                    }
                })

                // --- DESCENT STAGE (Left behind) ---
                if (altitude < 25000) {
                    p.push()
                    p.translate(p.width / 2, moonSurfaceY)
                    const sDist = p.map(p.constrain(altitude, 0, 25000), 0, 25000, 1, 0.1)
                    p.scale(sDist)

                    // Golden Legs
                    p.stroke(180, 150, 40); p.strokeWeight(6); p.noFill()
                    p.line(-35, 0, -65, 45); p.line(35, 0, 65, 45)
                    p.fill(130); p.noStroke(); p.ellipse(-65, 48, 28, 7); p.ellipse(65, 48, 28, 7)

                    // Golden Body
                    p.fill(200, 170, 50)
                    p.rect(-45, -50, 90, 50, 3)

                    // Detail
                    p.fill(100, 50)
                    p.rect(-35, -40, 70, 30)

                    // American Flag (left behind)
                    p.push()
                    p.translate(85, 0)
                    p.stroke(220); p.strokeWeight(2.5); p.line(0, 0, 0, -90)
                    p.translate(0, -90); p.noStroke()
                    const fW = p.frameCount * 0.1
                    for (let i = 0; i < 40; i++) {
                        const wave = p.sin(fW + i * 0.25) * 1.5
                        p.fill(i < 13 ? [0, 32, 91] : (Math.floor(i / 3) % 2 === 0 ? [191, 10, 48] : [255, 255, 255]))
                        p.rect(i, wave, 1, 28)
                    }
                    p.pop()
                    p.pop()
                }

                // --- BLAST EFFECTS ---
                if (hasIgnitedLocal && altitude < 400) {
                    const particleCount = altitude < 50 ? 20 : 5
                    for (let i = 0; i < particleCount; i++) {
                        smoke.push({
                            x: p.width / 2 + p.random(-60, 60),
                            y: moonSurfaceY + p.random(-5, 10),
                            vx: p.random(-12, 12),
                            vy: p.random(-4, -18),
                            sz: p.random(30, 150),
                            life: 255
                        })
                    }
                }
                smoke = smoke.filter(s => {
                    s.x += s.vx; s.y += s.vy; s.life -= 8
                    p.fill(220, 220, 220, s.life)
                    p.noStroke()
                    p.circle(s.x, s.y, s.sz)
                    return s.life > 0
                })
                p.pop()

                // --- LIFTOFF FLASH & SHAKE ---
                if (liftoffFlash > 0) {
                    p.fill(255, 255, 255, liftoffFlash)
                    p.rect(0, 0, p.width, p.height)
                    liftoffFlash -= 12
                }

                if (waitingForIgnition) {
                    drawIgnitionUI(p)
                }

                // Play separation sound
                if (hasIgnitedLocal && altitude > 0 && altitude < 20 && !p.playedSep) {
                    AudioManager.playStageSep()
                    AudioManager.playExplosiveLiftoff()
                    liftoffFlash = 255
                    p.playedSep = true
                }

                // Separation Flash (Subtle lingering glow)
                if (hasIgnitedLocal && altitude < 1500) {
                    const glowAlpha = p.map(altitude, 0, 1500, 120, 0)
                    p.fill(255, 252, 230, glowAlpha)
                    p.rect(0, 0, p.width, p.height)
                }

                // --- ASCENT STAGE (Launches FROM surface, rises to center) ---
                if (cameraMode === 'external' && !docked) {
                    // Calculate where on screen the LM should appear:
                    // altitude=0 → just above the descent stage (moonSurfaceY - 40)
                    // altitude=5000 → center of screen (p.height * 0.5)
                    // altitude>5000 → continues rising above center toward top of screen
                    let lmScreenY
                    // Camera follows the ship!
                    // Briefly rise from descent stage to center screen in first 50m,
                    // then lock to the center so ONLY the ground falls away.
                    if (altitude < 50) {
                        lmScreenY = p.map(altitude, 0, 50, moonSurfaceY - 40, p.height * 0.5)
                    } else {
                        lmScreenY = p.height * 0.5
                    }

                    // Camera shake at low altitude
                    const shakeX = (hasIgnitedLocal && altitude < 5000) ?
                        p.random(-p.map(altitude, 0, 5000, 6, 0), p.map(altitude, 0, 5000, 6, 0)) : 0
                    const shakeY = (hasIgnitedLocal && altitude < 5000) ?
                        p.random(-p.map(altitude, 0, 5000, 3, 0), p.map(altitude, 0, 5000, 3, 0)) : 0

                    // Draw LM at calculated position using the new draw signature
                    lm.draw(hasIgnitedLocal ? throttle : 0, true, p.width / 2 + shakeX, lmScreenY + shakeY)

                    // Exhaust smoke/dust staying on surface when altitude is low
                    if (hasIgnitedLocal && altitude < 1000) {
                        for (let i = 0; i < 8; i++) {
                            const smokeY = moonSurfaceY - p.random(0, 30) + recedePower
                            p.fill(210, 200, 185, p.random(20, 60))
                            p.noStroke()
                            p.circle(p.width / 2 + p.random(-80, 80), smokeY, p.random(30, 90))
                        }
                    }
                }

                // --- CSM RENDEZVOUS (shows when close to target altitude) ---
                if (hasIgnitedLocal && altitude > 50000 && !docked) {
                    drawCSM(p, altitude, lm, docked, dockSuccess, setValues)
                }

                // --- PHYSICS (7 min target, historical Apollo 11 ascent) ---
                // Real ascent: ~419s to reach ~60km circular orbit from surface
                // At 60fps: 419 * 60 = 25,140 frames
                // Need: altitude goes from ~1 to 60,000 in 25,140 frames
                // Per-frame gain needed: ~60,000 / 25,140 ≈ 2.39 m/frame
                // With newVel ramping from 0 up to ~0.0015, moveMult ≈ 1.6 achieves this
                if (hasIgnitedLocal && !docked) {
                    const warp = timeWarp

                    // Auto-throttle at max unless player adjusts
                    let currentThr = throttle
                    const keys = window.__heldKeys || {}
                    if (keys['ArrowUp']) currentThr = Math.min(1.0, currentThr + 0.005)
                    if (keys['ArrowDown']) currentThr = Math.max(0.0, currentThr - 0.005)
                    if (keys['KeyB']) currentThr = 1.0
                    // Default to full throttle after liftoff
                    if (!keys['ArrowDown'] && currentThr < 0.95) currentThr = Math.min(1.0, currentThr + 0.002)
                    setValues({ throttle: currentThr })

                    // --- PHYSICS: Simple direct rate — tuned for exactly ~7 min (420s) ---
                    // Target: 60,000m in 420s -> 60000 / 420 = ~143 m/s climb rate
                    const now = p.millis()
                    const dt = p.lastFrameMs ? Math.min((now - p.lastFrameMs) / 1000, 0.05) : 0.016
                    p.lastFrameMs = now

                    if (fuel <= 0) {
                        currentThr = 0
                        setValues({ throttle: 0 })
                    }

                    const climbRate = currentThr * 143 // display velocity accurately
                    const newAlt = altitude + climbRate * dt * warp

                    setValues({
                        velocity: climbRate,
                        altitude: Math.max(0, newAlt),
                        // 100% fuel over 420 seconds = ~0.238% per second
                        fuel: Math.max(0, fuel - currentThr * 0.238 * dt * warp)
                    })

                    // Sound
                    if (currentThr > 0.05) {
                        AudioManager.setEnginePower(currentThr, cameraMode)
                    } else {
                        AudioManager.stopEngine()
                    }

                    // --- ORBITAL BOUNDARY CHECK ---
                    // CSM is at 60,000m. Between 60k–75k = warning zone (throttle down!)
                    // Above 75k = missed rendezvous
                    if (altitude > 62000 && altitude < 75000) {
                        if (p.frameCount % 40 < 20) {
                            p.fill(255, 80, 0); p.textAlign(p.CENTER); p.textSize(20); p.textStyle(p.BOLD)
                            p.text('⚠ CUT THROTTLE — ORBITAL INSERTION ZONE ⚠', p.width / 2, p.height * 0.15)
                            p.textStyle(p.NORMAL)
                        }
                        if (currentThr > 0.3) AudioManager.playAlarm()
                    }
                    if (altitude > 75000 && !dockTriggered) {
                        setValues({ crashed: true, phase: 'MISSED RENDEZVOUS — LOST IN SPACE' })
                        AudioManager.stopAll()
                        AudioManager.playAlarm()
                    }
                }

                // --- UI ---
                drawAscentHUD(p, altitude, velocity, fuel, timeWarp, hasIgnitedLocal, docked)

                // Sync ambient
                if (p.frameCount % 90 === 0) {
                    AudioManager.startAmbient('cabin')
                }
            }
        }

        function drawIgnitionUI(p) {
            p.fill(0, 0, 0, 200); p.noStroke(); p.rect(p.width / 2 - 280, p.height / 2 - 160, 560, 240, 10)
            p.fill(0, 255, 100); p.textAlign(p.CENTER); p.textSize(24); p.textStyle(p.BOLD)
            p.text("LUNAR ASCENT — GO FOR IGNITION", p.width / 2, p.height / 2 - 110)
            p.fill(255, 200); p.textSize(15); p.textStyle(p.NORMAL)
            p.text("TARGET: LUNAR ORBIT RENDEZVOUS", p.width / 2, p.height / 2 - 70)
            p.text("STAGING STATUS: ARMED & READY", p.width / 2, p.height / 2 - 45)

            if (p.frameCount % 40 < 30) {
                p.fill(255, 255, 0); p.textSize(28); p.textStyle(p.BOLD)
                p.text(">>> PRESS [SPACE] TO LIFTOFF <<<", p.width / 2, p.height / 2 + 25)
            }
        }

        function drawCSM(p, alt, lm, docked, dockSuccess, setValues) {
            // CSM appears at 50,000m, docking triggers at 60,000m
            if (alt < 50000) return

            const progress = p.map(alt, 50000, 60000, 0, 1)
            // CSM descends into view from above as LM approaches
            const csmY = p.map(p.constrain(progress, 0, 1), 0, 1, p.height * 0.1, p.height * 0.38)

            p.push()
            p.translate(p.width / 2, csmY)

            // CSM body
            p.noStroke()
            p.fill(200); p.rect(-35, -18, 70, 36)
            p.fill(240); p.triangle(35, -18, 55, 0, 35, 18)
            p.fill(40); p.rect(-45, -6, 10, 12)
            // Solar panels
            p.fill(50, 80, 200, 180)
            p.rect(-38, -30, 10, 12); p.rect(-38, 18, 10, 12)

            // Label
            p.fill(0, 255, 255); p.textSize(11); p.textAlign(p.LEFT); p.noStroke()
            p.text('CSM COLUMBIA', 62, -6)
            const rangeM = Math.max(0, (60000 - alt) / 10)
            p.fill(255, 180)
            p.text(`RANGE: ${rangeM.toFixed(0)} m`, 62, 12)

            // Docking tunnel glow when close
            if (alt > 58000) {
                const glowA = p.map(alt, 58000, 60000, 0, 80)
                p.fill(0, 200, 255, glowA)
                p.ellipse(-45, 0, 18, 18)
            }
            p.pop()

            // Status banner
            p.fill(0, 255, 0); p.textAlign(p.CENTER); p.textSize(14); p.textStyle(p.BOLD)
            p.text('▲ CSM RENDEZVOUS — APPROACHING', p.width / 2, 50)
            p.textStyle(p.NORMAL)

            // DOCKING — only trigger ONCE using dockTriggered guard
            if (alt >= 60000 && !docked && !dockTriggered) {
                dockTriggered = true
                dockSuccess()
                setValues({ velocity: 0, fuel: 100, throttle: 0 })
                AudioManager.stopEngine()
                AudioManager.playDock()
                setTimeout(() => AudioManager.playSuccess(), 600)
            }
        }

        function drawAscentHUD(p, alt, vel, fuel, warp, ignited, docked) {
            p.textAlign(p.RIGHT); p.noStroke()
            p.fill(0, 200, 255); p.textSize(14)
            p.text(`ALT: ${alt.toFixed(0)} m`, p.width - 25, p.height - 75)
            p.text(`VEL: ${vel.toFixed(4)} m/s`, p.width - 25, p.height - 55)
            p.text(`FUEL: ${fuel.toFixed(0)}%`, p.width - 25, p.height - 35)

            if (warp > 1) {
                p.fill(255, 255, 0)
                p.text(`WARP: ${warp}x`, p.width - 25, p.height - 15)
            }

            if (ignited && !docked) {
                // Ascent progress bar (0 - 60,000m)
                const TARGET_ALT = 60000
                const progress = Math.min(alt / TARGET_ALT, 1)
                const barW = 300, barH = 8
                const barX = p.width / 2 - barW / 2
                const barY = p.height - 50
                p.fill(0, 0, 0, 140); p.rect(barX - 5, barY - 18, barW + 10, barH + 24, 4)
                p.fill(30, 30, 30); p.rect(barX, barY, barW, barH, 3)
                p.fill(progress > 0.8 ? '#0f0' : '#0af'); p.rect(barX, barY, barW * progress, barH, 3)
                p.fill(255); p.textAlign(p.CENTER); p.textSize(10)
                p.text(`ASCENT ${(progress * 100).toFixed(0)}%  —  TARGET: ${TARGET_ALT.toLocaleString()}m`, p.width / 2, barY - 5)

                // Phase text
                p.textSize(13); p.fill(255, 255, 0, 200)
                if (alt < 3000) p.text('🚀 LIFTOFF! — BREAKING LUNAR GRAVITY', p.width / 2, p.height - 100)
                else if (alt < 50000) p.text('COASTING TO RENDEZVOUS... [W] TIME WARP', p.width / 2, p.height - 100)
                else p.text('▲ CSM APPROACH — REDUCE VELOCITY', p.width / 2, p.height - 100)
            }

            if (docked) {
                p.fill(0, 0, 0, 180); p.rect(p.width / 2 - 300, p.height / 2 - 150, 600, 200, 12)
                p.fill(0, 255, 0); p.textAlign(p.CENTER); p.textSize(28); p.textStyle(p.BOLD)
                p.text("DOCKING SEQUENCE COMPLETE", p.width / 2, p.height / 2 - 80)
                p.fill(255); p.textSize(16); p.textStyle(p.NORMAL)
                p.text("EAGLE AND COLUMBIA REUNITED IN LUNAR ORBIT.", p.width / 2, p.height / 2 - 40)
                p.text("SAMPLES ARE SECURED FOR THE JOURNEY HOME.", p.width / 2, p.height / 2 - 15)

                if (p.frameCount % 50 < 35) {
                    p.fill(255, 255, 0); p.textSize(22); p.textStyle(p.BOLD)
                    p.text(">>> PRESS [T] TO RETURN TO EARTH <<<", p.width / 2, p.height / 2 + 35)
                }
            }
        }

        const instance = new p5(sketch, ref.current)
        return () => instance.remove()
    }, [ascent, docked])

    return ascent ? <div ref={ref} style={{ position: 'absolute', inset: 0, zIndex: 10 }} /> : null
}
