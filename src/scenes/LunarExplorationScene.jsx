import { useEffect, useRef } from 'react'
import p5 from 'p5'
import { useMissionStore } from '../stores/missionStore'

export function LunarExplorationScene() {
    const ref = useRef()
    const { stopExploration } = useMissionStore()

    useEffect(() => {
        const sketch = p => {
            let x = 0
            let y = 0
            let z = 0
            let vz = 0
            const gravity = 0.12
            const jumpForce = 5.5
            let rot = 0
            let pitch = 0
            let stars = []
            let craters = []
            let footprints = []

            p.setup = () => {
                p.createCanvas(p.windowWidth, p.windowHeight)
                // Generate stars
                for (let i = 0; i < 400; i++) {
                    stars.push({ x: p.random(p.width), y: p.random(p.height * 0.8), sz: p.random(1, 2) })
                }
                // Generate MUCH more craters for density
                for (let i = 0; i < 250; i++) {
                    craters.push({
                        cx: p.random(-3000, 3000),
                        cy: p.random(-3000, 3000),
                        size: p.random(30, 200)
                    })
                }
            }

            p.draw = () => {
                p.background(0)

                // Movement logic
                const speed = 2.5
                const rotSpeed = 0.04
                // Left/Right arrows = rotate camera
                if (p.keyIsDown(p.LEFT_ARROW)) rot += rotSpeed
                if (p.keyIsDown(p.RIGHT_ARROW)) rot -= rotSpeed
                // W / Up = forward
                if (p.keyIsDown(p.UP_ARROW) || p.keyIsDown(87)) {
                    x -= p.cos(rot) * speed
                    y -= p.sin(rot) * speed
                }
                // S / Down = backward
                if (p.keyIsDown(p.DOWN_ARROW) || p.keyIsDown(83)) {
                    x += p.cos(rot) * speed
                    y += p.sin(rot) * speed
                }
                // A = strafe left
                if (p.keyIsDown(65)) {
                    x -= p.sin(rot) * speed * 0.7
                    y += p.cos(rot) * speed * 0.7
                }
                // D = strafe right
                if (p.keyIsDown(68)) {
                    x += p.sin(rot) * speed * 0.7
                    y -= p.cos(rot) * speed * 0.7
                }
                // Q = look up, Z = look down
                if (p.keyIsDown(81)) pitch = Math.min(pitch + 1.5, 60)
                if (p.keyIsDown(90)) pitch = Math.max(pitch - 1.5, -30)

                // Jump physics
                z += vz
                if (z > 0) {
                    vz -= gravity
                } else {
                    z = 0
                    vz = 0
                }

                // Add footprint periodically
                if (p.frameCount % 20 === 0 && z === 0 && (p.keyIsDown(p.UP_ARROW) || p.keyIsDown(87) || p.keyIsDown(p.DOWN_ARROW) || p.keyIsDown(83))) {
                    footprints.push({ fx: x, fy: y, fr: rot, life: 1000 })
                }

                // --- RENDERING ---

                // 1. STARS (Only in the sky area) — pitch shifts the horizon
                const horizon = p.height / 2 + z * 3 + pitch * 4
                p.noStroke()
                p.fill(255)
                stars.forEach(s => {
                    const starY = s.y + pitch * 3
                    if (starY < horizon + 50 && starY > -50) {
                        p.circle(s.x, starY, s.sz)
                    }
                })

                // 2. LUNAR SURFACE (Solid Ground)
                // Draw a solid dark block for the ground first to hide stars
                p.fill(30)
                p.rect(0, horizon, p.width, p.height - horizon)

                // Layered surface for depth/whiteness
                for (let i = 0; i < 45; i++) {
                    const alpha = p.map(i, 0, 45, 100, 255)
                    p.fill(220, alpha)
                    p.rect(0, horizon + i * 11, p.width, 13)
                }

                // Earthrise (Fixed in World Space)
                const earthDir = p.PI * 0.4
                const relativeEarthRot = (earthDir - rot + p.PI * 2) % (p.PI * 2)
                if (relativeEarthRot < p.PI) {
                    const earthX = p.map(relativeEarthRot, 0, p.PI, p.width * 1.5, -p.width * 0.5)
                    const earthY = p.height * 0.2 + z * 1.5 + pitch * 3
                    p.push()
                    p.translate(earthX, earthY)
                    for (let i = 10; i > 0; i--) { p.fill(0, 100, 255, 20 / i); p.circle(0, 0, 60 + i * 5) }
                    p.fill(20, 100, 255)
                    p.circle(0, 0, 60)
                    p.fill(255, 120)
                    p.arc(0, 0, 60, 60, p.PI + p.HALF_PI, p.HALF_PI)
                    p.pop()
                }

                // Transform world to screen coordinates
                const drawObject = (worldX, worldY, drawFn) => {
                    const relativeX = worldX * p.cos(-rot - p.HALF_PI) - worldY * p.sin(-rot - p.HALF_PI)
                    const relativeY = worldX * p.sin(-rot - p.HALF_PI) + worldY * p.cos(-rot - p.HALF_PI)

                    if (relativeY > 5) {
                        const scale = 500 / relativeY
                        const screenX = p.width / 2 + relativeX * scale
                        const screenY = horizon + scale * (50 + z * 0.4)

                        if (screenX > -400 && screenX < p.width + 400 && screenY > horizon - 100) {
                            p.push()
                            p.translate(screenX, screenY)
                            p.scale(scale)
                            drawFn()
                            p.pop()
                        }
                    }
                }

                // Render Craters
                craters.forEach(c => {
                    drawObject(c.cx - x, c.cy - y, () => {
                        p.fill(160, 180)
                        p.noStroke()
                        p.ellipse(0, 0, c.size, c.size * 0.4)
                        p.fill(120, 180)
                        p.ellipse(-2, -1, c.size * 0.8, c.size * 0.3)
                    })
                })

                // Render Footprints
                footprints.forEach(f => {
                    if (f.life > 0) {
                        drawObject(f.fx - x, f.fy - y, () => {
                            p.fill(100, p.map(f.life, 0, 1000, 0, 255))
                            p.rotate(f.fr - rot)
                            p.ellipse(0, 0, 5, 8)
                        })
                        f.life -= 2
                    }
                })

                // Render Lunar Module + MEXICAN FLAG
                drawObject(0 - x, 0 - y, () => {
                    p.scale(1.5)
                    // Descent stage
                    p.fill(180, 150, 40)
                    p.rect(-30, -50, 60, 50)
                    p.rect(-45, -20, 90, 20)
                    // Legs
                    p.stroke(150); p.strokeWeight(3)
                    p.line(-30, 0, -50, 25); p.line(30, 0, 50, 25)
                    p.line(-10, 0, -10, 30); p.line(10, 0, 10, 30)
                    // Ascent stage
                    p.noStroke()
                    p.fill(220)
                    p.rect(-25, -100, 50, 50, 5)
                    p.fill(30, 40, 60)
                    p.triangle(-18, -90, -5, -90, -12, -75)
                    p.triangle(18, -90, 5, -90, 12, -75)

                    // Mexican Flag
                    p.push()
                    p.translate(60, 0)
                    p.stroke(200); p.strokeWeight(2); p.line(0, 0, 0, -100)
                    p.translate(0, -100)
                    const fWave = p.frameCount * 0.1
                    for (let i = 0; i < 45; i++) {
                        const wave = p.sin(fWave + i * 0.2) * 2
                        let col = (i < 15) ? [0, 104, 71] : (i < 30 ? [255, 255, 255] : [206, 17, 38])
                        p.fill(col[0], col[1], col[2]); p.noStroke(); p.rect(i, wave, 1, 35)
                        if (i >= 20 && i <= 24) { p.fill(100, 70, 20); p.circle(i, 17 + wave, 4) }
                    }
                    p.pop()
                })

                // Overlay: Space Suit Helmet View
                p.push()
                p.noFill()
                p.stroke(40)
                p.strokeWeight(100)
                p.circle(p.width / 2, p.height / 2, p.width * 1.5)

                // HUD inside helmet
                p.noStroke()
                p.textSize(18)
                p.textAlign(p.LEFT)

                p.fill(0, 255, 0, 80)
                p.text(`X: ${x.toFixed(1)}`, 100, p.height - 120)
                p.text(`Y: ${y.toFixed(1)}`, 100, p.height - 100)
                p.text(`Z: ${z.toFixed(1)}`, 100, p.height - 80)
                p.text(`O2: 98%`, 100, p.height - 60)

                p.fill(100, 255, 150, 255)
                p.text(`X: ${x.toFixed(1)}`, 102, p.height - 120)
                p.text(`Y: ${y.toFixed(1)}`, 102, p.height - 100)
                p.text(`Z: ${z.toFixed(1)}`, 102, p.height - 80)
                p.text(`O2: 98%`, 102, p.height - 60)

                if (z > 0.1) {
                    p.fill(255, 255, 0, 255)
                    p.text("LOW GRAVITY JUMP", 100, p.height - 150)
                }

                p.textAlign(p.CENTER)
                p.textSize(20)
                p.fill(255, 255, 255, 180)
                p.text("WASD: MOVER  |  Q/Z: MIRAR ↑↓  |  SPACE: SALTAR  |  ←→: GIRAR", p.width / 2, 80)
                p.pop()

                // Pitch Indicator (right side)
                drawPitchIndicator(p)
            }

            function drawPitchIndicator(p) {
                const barX = p.width - 55
                const barY = p.height * 0.3
                const barH = p.height * 0.4
                const barW = 6
                // Background track
                p.fill(0, 0, 0, 120)
                p.noStroke()
                p.rect(barX - barW / 2, barY, barW, barH, 3)
                // Center marker (horizon)
                p.stroke(255, 255, 255, 60)
                p.strokeWeight(1)
                p.line(barX - 12, barY + barH / 2, barX + 12, barY + barH / 2)
                // Pitch position indicator
                const pitchNorm = pitch / 90
                const indicatorY = barY + barH / 2 - pitchNorm * barH
                const clampedY = Math.max(barY, Math.min(barY + barH, indicatorY))
                // Glow
                p.noStroke()
                p.fill(0, 255, 100, 40)
                p.circle(barX, clampedY, 18)
                // Indicator dot
                p.fill(0, 255, 100)
                p.circle(barX, clampedY, 8)
                // Label
                p.fill(0, 255, 100, 180)
                p.textSize(9)
                p.textAlign(p.CENTER)
                p.textFont('monospace')
                p.text(`${pitch > 0 ? '+' : ''}${pitch.toFixed(0)}°`, barX, clampedY - 12)
                if (Math.abs(pitch) > 1) {
                    p.fill(255, 255, 255, 40)
                    p.textSize(8)
                    p.text('PITCH', barX, barY - 8)
                }
            }

            p.windowResized = () => p.resizeCanvas(p.windowWidth, p.windowHeight)

            p.keyPressed = () => {
                // Console log para verificar en M1/Mac
                console.log("TECLA:", p.key, "CÓDIGO:", p.keyCode);

                if ((p.keyCode === 32 || p.key === ' ') && z === 0) {
                    vz = jumpForce;
                    return false; // Evita scroll en navegadores
                }
            }
        }

        const instance = new p5(sketch, ref.current)
        return () => instance.remove()
    }, [])

    return (
        <div style={{ position: 'absolute', inset: 0, zIndex: 100 }}>
            <div ref={ref} />
            <button
                onClick={() => {
                    useMissionStore.setState({ cameraMode: 'cabin' });
                    stopExploration();
                }}
                style={{
                    position: 'absolute',
                    bottom: '40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '15px 30px',
                    background: 'rgba(0, 255, 0, 0.2)',
                    border: '2px solid #0f0',
                    color: '#0f0',
                    cursor: 'pointer',
                    fontFamily: 'Orbitron, monospace',
                    fontSize: '18px',
                    zIndex: 101,
                    borderRadius: '5px',
                    textTransform: 'uppercase'
                }}
            >
                Entrar al Módulo Lunar (Eagle)
            </button>
        </div>
    )
}
