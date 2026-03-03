import { useEffect, useRef } from 'react'
import p5 from 'p5'
import { useMissionStore } from '../stores/missionStore'
import AudioManager from '../audio/AudioManager'

export function EarthOrbitScene() {
  const ref = useRef()
  const { inOrbit, onTranslunar, setValues, startTLI, cameraMode } = useMissionStore()

  useEffect(() => {
    if (!inOrbit || onTranslunar) return

    const sketch = p => {
      let shipAngle = 0
      let stars = []
      let tliTriggered = false
      let orbitProgress = 0 // 0 to 1.5 orbits
      const targetOrbits = 1.5
      let orbitReady = false
      let earthRotation = 0

      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight)
        for (let i = 0; i < 400; i++) {
          stars.push({ x: p.random(p.width), y: p.random(p.height), sz: p.random(1, 3), speed: p.random(0.2, 0.5) })
        }
      }

      p.draw = () => {
        const { timeWarp, setValues } = useMissionStore.getState()
        p.background(5, 5, 15)

        // --- ESTRELLAS (Efecto de movimiento orbital) ---
        p.noStroke()
        p.fill(255)
        stars.forEach(s => {
          s.x -= s.speed * 0.5 * timeWarp
          if (p.keyIsDown(p.LEFT_ARROW)) s.x += 2
          if (p.keyIsDown(p.RIGHT_ARROW)) s.x -= 2
          if (s.x < 0) s.x = p.width
          if (s.x > p.width) s.x = 0
          p.circle(s.x, s.y, s.sz)
        })

        // --- Orbit Progress ---
        if (!orbitReady && !tliTriggered) {
          orbitProgress += 0.0003 * timeWarp
          if (orbitProgress >= targetOrbits) {
            orbitReady = true
            setValues({ phase: 'Parking Orbit Complete — GO for TLI' })
          }
        }

        // --- EARTH (Orbit View) ---
        p.push()
        const earthX = p.width / 2
        const earthY = p.height * 1.6
        const earthRadius = p.height * 1.2
        earthRotation += 0.00005 * timeWarp

        // Atmosphere Glow
        p.noFill()
        for (let i = 1; i < 8; i++) {
          p.stroke(20, 100, 255, 40 / i)
          p.strokeWeight(15)
          p.circle(earthX, earthY, earthRadius * 2 + i * 20)
        }

        // Earth Body
        p.noStroke()
        p.fill(10, 40, 150)
        p.circle(earthX, earthY, earthRadius * 2)

        // Continents
        p.push()
        p.translate(earthX, earthY)
        p.rotate(earthRotation)
        p.fill(40, 100, 50, 180)
        for (let i = 0; i < 12; i++) {
          let ang = i * p.TWO_PI / 12
          let r = earthRadius * 0.95
          p.push()
          p.rotate(ang + p.sin(p.millis() * 0.0001 + i))
          p.ellipse(r * 0.5, r * 0.2, r * 0.4, r * 0.3)
          p.pop()
        }
        // Clouds
        p.fill(255, 255, 255, 100)
        p.rotate(earthRotation * 0.3)
        for (let i = 0; i < 8; i++) {
          p.ellipse(earthRadius * 0.6, 0, earthRadius * 0.5, earthRadius * 0.2)
          p.rotate(p.TWO_PI / 8)
        }
        p.pop()

        // Terminator
        p.fill(0, 0, 0, 180)
        p.arc(earthX, earthY, earthRadius * 2.1, earthRadius * 2.1, -p.PI / 4, p.PI + p.PI / 4)
        p.pop()

        // --- SUNRISE/SUNSET EFFECT (Every half orbit) ---
        const sunAngle = (orbitProgress % 1) * p.TWO_PI
        if (sunAngle > p.PI * 1.7 && sunAngle < p.PI * 2.3) {
          // Orbital sunrise
          p.fill(255, 200, 100, 30)
          p.noStroke()
          p.arc(earthX, earthY - earthRadius + 50, 300, 60, p.PI, 0)
        }

        // --- NAVE (S-IVB + CSM) ---
        p.push()
        p.translate(p.width / 2, p.height / 2)
        p.rotate(shipAngle)

        // S-IVB Body
        p.noStroke()
        p.fill(240)
        p.rect(-60, -25, 80, 50)
        p.fill(20)
        p.rect(-60, -25, 20, 50)

        // J-2 Engine
        p.fill(80)
        p.beginShape()
        p.vertex(-60, -15)
        p.vertex(-80, -25)
        p.vertex(-80, 25)
        p.vertex(-60, 15)
        p.endShape(p.CLOSE)

        // SLA (Spacecraft-LM Adapter)
        p.fill(220)
        p.beginShape()
        p.vertex(20, -25)
        p.vertex(50, -20)
        p.vertex(50, 20)
        p.vertex(20, 25)
        p.endShape(p.CLOSE)

        // CSM (Service Module)
        p.fill(180)
        p.rect(50, -20, 40, 40)

        // CM (Capsule)
        p.fill(255)
        p.triangle(90, -20, 110, 0, 90, 20)

        // TLI Fire
        if (tliTriggered) {
          p.fill(255, 100, 50, p.random(200, 255))
          p.noStroke()
          p.triangle(-80, 0, -150 - p.random(50), -20, -150 - p.random(50), 20)
          // Brighter inner flame
          p.fill(255, 200, 100, p.random(200, 255))
          p.triangle(-80, 0, -120 - p.random(30), -10, -120 - p.random(30), 10)
        }

        // RCS attitude thrusters (tiny puffs)
        if (p.keyIsDown(p.LEFT_ARROW) || p.keyIsDown(p.RIGHT_ARROW)) {
          p.fill(200, 200, 255, 100)
          p.circle(70, -25, 5)
          p.circle(70, 25, 5)
        }

        p.pop()

        // --- ORBIT PROGRESS UI ---
        p.push()
        p.textAlign(p.CENTER)

        // Orbit counter at top
        p.fill(0, 20, 40, 200)
        p.noStroke()
        p.rect(p.width / 2 - 200, 15, 400, 85, 6)

        p.fill(0, 255, 0)
        p.textSize(14)
        p.text("PARKING ORBIT — 185 KM × 185 KM", p.width / 2, 35)

        // Orbit progress visualization
        const barWidth = 350
        const barX = p.width / 2 - barWidth / 2
        p.noFill()
        p.stroke(0, 255, 0, 100)
        p.strokeWeight(2)
        p.rect(barX, 50, barWidth, 14, 4)

        // Progress fill
        p.noStroke()
        const fillW = Math.min(barWidth - 4, (orbitProgress / targetOrbits) * (barWidth - 4))
        p.fill(0, 255, 0, 150)
        p.rect(barX + 2, 52, fillW, 10, 3)

        // Orbit markers (each full orbit)
        p.stroke(255, 255, 0, 150)
        p.strokeWeight(1)
        const orbit1X = barX + (1 / targetOrbits) * barWidth
        p.line(orbit1X, 48, orbit1X, 68)
        p.noStroke()
        p.fill(255, 255, 0, 150)
        p.textSize(9)
        p.text("ORB 1", orbit1X, 80)

        p.fill(0, 255, 255)
        p.textSize(12)
        p.text(`ORBIT ${Math.floor(orbitProgress) + 1} — ${((orbitProgress % 1) * 100).toFixed(0)}%`, p.width / 2, 93)

        p.pop()

        // --- ATTITUDE CONTROL UI ---
        let normalizedAngle = shipAngle % p.TWO_PI
        if (normalizedAngle < 0) normalizedAngle += p.TWO_PI
        const isAligned = (normalizedAngle < 0.2 || normalizedAngle > p.TWO_PI - 0.2)

        p.textAlign(p.CENTER)
        p.fill(0, 255, 0)
        p.textSize(16)

        if (!tliTriggered) {
          p.text("CONTROL DE ACTITUD: FLECHAS IZQ/DER", p.width / 2, p.height - 100)

          if (orbitReady) {
            if (isAligned) {
              p.fill(0, 255, 255)
              p.textSize(24)
              p.text("ALINEACIÓN CORRECTA — PRESS 'T' FOR TLI BURN", p.width / 2, p.height - 60)
            } else {
              p.fill(255, 100, 100)
              p.text("ALINEAR NAVE A VECTOR PROGRADO (0°)", p.width / 2, p.height - 60)
              p.textSize(12)
              p.text(`ÁNGULO: ${p.degrees(normalizedAngle).toFixed(0)}°`, p.width / 2, p.height - 40)
            }
          } else {
            p.fill(255, 200, 0)
            p.textSize(14)
            p.text(`Complete ${targetOrbits} orbits before TLI... [W] Time Warp`, p.width / 2, p.height - 60)
          }
        } else {
          p.textSize(30)
          p.fill(255, 165, 0)
          p.text("TRANS-LUNAR INJECTION — S-IVB BURN", p.width / 2, 130)

          // Burn progress bar
          p.noFill()
          p.stroke(255, 165, 0, 200)
          p.strokeWeight(2)
          p.rect(p.width / 2 - 150, 145, 300, 10, 4)
        }

        // Logic Controls
        if (p.keyIsDown(p.LEFT_ARROW)) shipAngle -= 0.03
        if (p.keyIsDown(p.RIGHT_ARROW)) shipAngle += 0.03

        // TLI Trigger (only if orbit complete and aligned)
        if (p.keyIsDown(84) && isAligned && !tliTriggered && orbitReady) { // 'T'
          tliTriggered = true
          AudioManager.setEnginePower(1.0, cameraMode)
          setValues({ phase: 'TLI BURN CONFIRMED — LEAVING EARTH ORBIT' })

          setTimeout(() => {
            AudioManager.stopEngine()
            startTLI()
          }, 5000)
        }
      }
    }

    const instance = new p5(sketch, ref.current)
    return () => instance.remove()
  }, [inOrbit, onTranslunar])

  return inOrbit && !onTranslunar ? (
    <div ref={ref} style={{ position: 'absolute', inset: 0, zIndex: 5 }} />
  ) : null
}