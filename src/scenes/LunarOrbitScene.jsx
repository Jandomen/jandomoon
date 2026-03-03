import { useEffect, useRef } from 'react'
import p5 from 'p5'
import { useMissionStore } from '../stores/missionStore'
import AudioManager from '../audio/AudioManager'

export function LunarOrbitScene() {
    const ref = useRef()

    useEffect(() => {
        const { currentScene } = useMissionStore.getState()
        if (currentScene !== 'LUNAR_ORBIT') return

        const sketch = p => {
            let stars = []
            let orbitAngle = 0
            let orbitsCompleted = 0
            let totalOrbits = 2
            let loiDone = false
            let lmSeparated = false
            let separationTimer = 0
            let lmAngle = 0
            let craters = []
            let moonRotation = 0
            let shipAngle = 0
            const orbitSpeed = 0.0005
            const shipScale = 1.0

            p.setup = () => {
                p.createCanvas(p.windowWidth, p.windowHeight)
                for (let i = 0; i < 500; i++) {
                    stars.push({ x: p.random(p.width), y: p.random(p.height), sz: p.random(0.5, 2.5), speed: p.random(0.1, 0.4) })
                }
                // Craters spread across the visible surface
                for (let i = 0; i < 30; i++) {
                    craters.push({
                        x: p.random(-0.5, 0.5),  // Relative to moon center
                        y: p.random(-0.4, 0.1),
                        sz: p.random(15, 80)
                    })
                }
                AudioManager.playClick()
            }

            p.draw = () => {
                const { timeWarp, setValues, cameraMode } = useMissionStore.getState()
                p.background(3, 3, 10)

                // --- STARS (moving for orbital feel) ---
                p.noStroke(); p.fill(255)
                stars.forEach(s => {
                    s.x -= s.speed * 0.5 * timeWarp
                    if (s.x < 0) s.x = p.width
                    if (s.x > p.width) s.x = 0
                    p.circle(s.x, s.y, s.sz)
                })

                const cx = p.width / 2

                // === MOON (Horizon style) ===
                // Adjusted moonY so the horizon is visible in the middle of the cabin window
                const moonY = p.height * 1.65
                const moonR = p.height * 1.15
                moonRotation += 0.00008 * timeWarp

                // Subtle horizon glow (gray-ish, no atmosphere but dust scatter)
                p.noFill()
                for (let i = 1; i < 6; i++) {
                    p.stroke(180, 180, 170, 20 / i)
                    p.strokeWeight(10)
                    p.circle(cx, moonY, moonR * 2 + i * 18)
                }

                // Moon body
                p.noStroke()
                p.fill(175, 175, 165)
                p.circle(cx, moonY, moonR * 2)

                // Surface details (mare and craters — rotate slowly)
                p.push()
                p.translate(cx, moonY)
                p.rotate(moonRotation)

                // Mare (dark patches — Sea of Tranquility, etc.)
                p.fill(140, 140, 130, 160)
                p.ellipse(-moonR * 0.15, -moonR * 0.85, moonR * 0.45, moonR * 0.25)
                p.ellipse(moonR * 0.2, -moonR * 0.78, moonR * 0.3, moonR * 0.2)
                p.fill(130, 130, 120, 120)
                p.ellipse(-moonR * 0.35, -moonR * 0.75, moonR * 0.2, moonR * 0.15)
                p.ellipse(moonR * 0.05, -moonR * 0.9, moonR * 0.15, moonR * 0.1)

                // Craters
                craters.forEach(c => {
                    const cxPos = c.x * moonR
                    const cyPos = (c.y - 0.85) * moonR  // Near the top (visible surface)
                    p.fill(155, 155, 145, 110)
                    p.circle(cxPos, cyPos, c.sz)
                    p.fill(140, 140, 130, 70)
                    p.circle(cxPos + 2, cyPos + 2, c.sz * 0.6)
                })

                p.pop()

                // Terminator (shadow on right side)
                p.fill(0, 0, 0, 150)
                p.arc(cx, moonY, moonR * 2.02, moonR * 2.02, -p.PI / 4, p.PI + p.PI / 4)

                // === SUNRISE EFFECT on horizon ===
                const sunAngle = (orbitAngle % p.TWO_PI)
                if (sunAngle > p.PI * 1.7 && sunAngle < p.PI * 2.3) {
                    p.fill(255, 220, 150, 25)
                    p.noStroke()
                    p.arc(cx, moonY - moonR + 50, 350, 70, p.PI, 0)
                }

                // === EARTHRISE (iconic — Earth rising over lunar horizon) ===
                p.push()
                const earthX = p.width * 0.82
                const earthY = moonY - moonR + 20  // Just above the horizon
                // Glow
                for (let i = 4; i > 0; i--) {
                    p.fill(30, 100, 255, 30 / i)
                    p.circle(earthX, earthY, 55 + i * 12)
                }
                p.fill(15, 50, 170)
                p.circle(earthX, earthY, 55)
                // Continents
                p.fill(30, 100, 55, 180)
                p.ellipse(earthX + 5, earthY - 9, 22, 13)
                p.ellipse(earthX - 12, earthY + 8, 16, 11)
                // Ice caps
                p.fill(255, 255, 255, 140)
                p.arc(earthX, earthY, 55, 55, -p.HALF_PI - 0.4, -p.HALF_PI + 0.4)
                p.pop()

                // --- SPACECRAFT orbiting ---
                // Hide ship in cabin mode to see only the moon
                if (cameraMode !== 'cabin') {
                    if (!lmSeparated) {
                        orbitAngle += orbitSpeed

                        // CSM+LM — centered in upper portion of screen
                        p.push()
                        p.translate(cx, p.height * 0.38)
                        p.rotate(shipAngle)

                        // CSM (Service Module)
                        p.noStroke()
                        p.fill(220)
                        p.rect(-50, -20, 70, 40)   // SM body
                        p.fill(40)
                        p.rect(-50, -20, 15, 40)   // Engine end
                        // CM (Capsule)
                        p.fill(245)
                        p.triangle(20, -20, 40, 0, 20, 20)
                        // SLA adapter
                        p.fill(210)
                        p.beginShape()
                        p.vertex(-65, -20)
                        p.vertex(-85, -15)
                        p.vertex(-85, 15)
                        p.vertex(-65, 20)
                        p.endShape(p.CLOSE)
                        // LM (attached inside SLA)
                        p.fill(200, 170, 50)
                        p.rect(-83, -10, 15, 20)
                        p.fill(180, 150, 30)
                        p.rect(-86, 5, 4, 8)
                        p.rect(-71, 5, 4, 8)

                        // RCS puffs
                        if (p.keyIsDown(p.LEFT_ARROW) || p.keyIsDown(p.RIGHT_ARROW)) {
                            p.fill(200, 200, 255, 120)
                            p.circle(25, -25, 5)
                            p.circle(25, 25, 5)
                        }

                        // Subtle engine glow
                        p.fill(100, 200, 255, 25 + p.sin(p.frameCount * 0.1) * 15)
                        p.circle(-90, 0, 8)

                        p.pop()

                        // Track orbits
                        if (orbitAngle > p.TWO_PI * (orbitsCompleted + 1)) {
                            orbitsCompleted++
                            if (orbitsCompleted >= totalOrbits && !loiDone) {
                                loiDone = true
                                setValues({ phase: 'LOI Complete — Ready for LM Separation' })
                            }
                        }
                    } else {
                        // After separation — show both ships
                        orbitAngle += orbitSpeed
                        lmAngle += orbitSpeed * 0.96
                        separationTimer++

                        // CSM (stays centered)
                        p.push()
                        p.translate(cx + 80, p.height * 0.35)

                        p.noStroke(); p.fill(200)
                        p.rect(-35, -14, 50, 28)
                        p.fill(240)
                        p.triangle(15, -14, 30, 0, 15, 14)
                        p.fill(40)
                        p.rect(-35, -14, 10, 28)

                        p.pop()

                        p.fill(0, 255, 255, 180)
                        p.textAlign(p.CENTER); p.textSize(11)
                        p.text("CSM — COLLINS", cx + 80, p.height * 0.35 - 28)

                        // LM (drifting away/below)
                        const lmDrift = Math.min(separationTimer * 0.3, 120)
                        const lmDrawX = cx - 80 - lmDrift * 0.5
                        const lmDrawY = p.height * 0.38 + lmDrift

                        p.push()
                        p.translate(lmDrawX, lmDrawY)
                        p.rotate(0.1 * separationTimer * 0.001)  // Very slight rotation

                        p.noStroke()
                        p.fill(200, 170, 50)
                        p.rect(-10, -12, 20, 24)
                        p.fill(180, 150, 30)
                        p.rect(-13, 8, 5, 10)
                        p.rect(8, 8, 5, 10)
                        // Window
                        p.fill(30, 40, 60)
                        p.triangle(-6, -8, 0, -8, -3, 0)

                        // Descent engine
                        if (separationTimer > 200) {
                            p.fill(255, 150, 50, p.random(100, 200))
                            p.triangle(-5, 20, 5, 20, 0, 35 + p.random(5))
                        }

                        p.pop()

                        p.fill(255, 215, 0, 180)
                        p.textAlign(p.CENTER); p.textSize(11)
                        p.text("LM EAGLE", lmDrawX, lmDrawY - 28)
                    }
                } else {
                    // Update orbit logic even in cabin mode
                    orbitAngle += orbitSpeed
                    if (!loiDone && orbitAngle > p.TWO_PI * (orbitsCompleted + 1)) {
                        orbitsCompleted++
                        if (orbitsCompleted >= totalOrbits) {
                            loiDone = true
                            setValues({ phase: 'LOI Complete — Ready for LM Separation' })
                        }
                    }
                    if (lmSeparated) separationTimer++
                }

                // === UI — ORBIT PROGRESS ===
                p.push()
                p.textAlign(p.CENTER)

                // Top panel
                p.fill(0, 15, 30, 210)
                p.noStroke()
                p.rect(cx - 240, 12, 480, 90, 6)

                p.fill(0, 255, 0)
                p.textSize(14)
                p.text("LUNAR ORBIT — 110 KM × 110 KM", cx, 32)

                // Orbit progress bar
                const barWidth = 400
                const barX = cx - barWidth / 2
                p.noFill()
                p.stroke(0, 255, 0, 100)
                p.strokeWeight(2)
                p.rect(barX, 46, barWidth, 14, 4)

                p.noStroke()
                const progress = loiDone ? 1 : ((orbitAngle % p.TWO_PI) / p.TWO_PI + orbitsCompleted) / totalOrbits
                const fillW = Math.min(barWidth - 4, progress * (barWidth - 4))
                p.fill(0, 255, 0, 150)
                p.rect(barX + 2, 48, fillW, 10, 3)

                // Orbit markers
                p.stroke(255, 255, 0, 150)
                p.strokeWeight(1)
                const orbit1X = barX + (1 / totalOrbits) * barWidth
                p.line(orbit1X, 44, orbit1X, 64)
                p.noStroke()
                p.fill(255, 255, 0, 150)
                p.textSize(9)
                p.text("ORB 1", orbit1X, 76)

                p.fill(0, 255, 255)
                p.textSize(12)
                p.text(`ORBIT ${Math.min(orbitsCompleted + 1, totalOrbits)} — ${((progress * 100) % 100).toFixed(0)}%`, cx, 93)

                p.pop()

                // === STATE MESSAGES ===
                p.textAlign(p.CENTER)

                if (!loiDone) {
                    p.fill(255, 200, 0)
                    p.textSize(14)
                    p.text(`Completar ${totalOrbits} órbitas... [W] Time Warp`, cx, p.height - 80)
                } else if (!lmSeparated) {
                    p.fill(0, 255, 0)
                    p.textSize(20)
                    p.textStyle(p.BOLD)
                    p.text("LOI COMPLETO — ÓRBITA LUNAR ESTABLE", cx, p.height - 120)
                    p.textStyle(p.NORMAL)

                    if (p.frameCount % 60 < 40) {
                        p.fill(255, 255, 0)
                        p.textSize(18)
                        p.text(">>> PRESS [S] SEPARAR LM EAGLE <<<", cx, p.height - 85)
                    }

                    p.fill(255, 215, 0, 150 + p.sin(p.frameCount * 0.1) * 100)
                    p.textSize(13)
                    p.text("Armstrong & Aldrin transferidos al LM", cx, p.height - 55)

                } else {
                    p.fill(0, 255, 0)
                    p.textSize(18)
                    p.textStyle(p.BOLD)
                    p.text("LM SEPARADO — DESCENDIENDO DE LA ÓRBITA", cx, p.height - 120)
                    p.textStyle(p.NORMAL)

                    if (separationTimer > 200) {
                        if (p.frameCount % 60 < 40) {
                            p.fill(255, 255, 0)
                            p.textSize(18)
                            p.text(">>> PRESS [L] POWERED DESCENT <<<", cx, p.height - 85)
                        }

                        p.fill(0, 255, 255, 150 + p.sin(p.frameCount * 0.1) * 100)
                        p.textSize(14)
                        p.text("\"The Eagle has wings.\"", cx, p.height - 55)
                    } else {
                        p.fill(0, 255, 255)
                        p.textSize(14)
                        p.text("Separación en proceso... Collins permanece en el CSM", cx, p.height - 85)
                    }
                }

                // Bottom telemetry
                p.fill(0, 255, 0, 180)
                p.textSize(11)
                p.textAlign(p.LEFT)
                p.text(`ORBIT ALT: ~110 KM`, 20, p.height - 40)
                p.text(`ORBITAL VEL: 1.6 KM/S`, 20, p.height - 24)
                p.text(`GROUND TRACK: SEA OF TRANQUILITY`, 20, p.height - 8)

                p.textAlign(p.RIGHT)
                p.text(`TIME WARP: ${timeWarp}x`, p.width - 20, p.height - 24)

                // Attitude control
                if (p.keyIsDown(p.LEFT_ARROW)) shipAngle -= 0.02
                if (p.keyIsDown(p.RIGHT_ARROW)) shipAngle += 0.02
            }

            p.keyPressed = () => {
                const state = useMissionStore.getState()

                if (loiDone && !lmSeparated && (p.key === 's' || p.key === 'S')) {
                    lmSeparated = true
                    lmAngle = orbitAngle
                    AudioManager.playStageSep()
                    state.setValues({ phase: 'LM Separated — "The Eagle has wings"' })
                }

                if (lmSeparated && separationTimer > 200 && (p.key === 'l' || p.key === 'L')) {
                    AudioManager.playClick()
                    state.startDescent()
                }
            }

            p.windowResized = () => p.resizeCanvas(p.windowWidth, p.windowHeight)
        }

        const instance = new p5(sketch, ref.current)
        return () => instance.remove()
    }, [])

    const { currentScene } = useMissionStore()
    return currentScene === 'LUNAR_ORBIT' ? (
        <div ref={ref} style={{ position: 'absolute', inset: 0, zIndex: 10 }} />
    ) : null
}
