// src/scenes/LunarDescentScene.jsx
import { LunarModule } from '../entities/LunarModule'
import { useMissionStore } from '../stores/missionStore'
import { useEffect, useRef } from 'react'
import p5 from 'p5'
import AudioManager from '../audio/AudioManager'

export function LunarDescentScene() {
  const ref = useRef()
  const { altitude, velocity, throttle, fuel, lunarDescent, landed, crashed, setValues, landSuccess, crash, masterAlarm, cameraMode } = useMissionStore()

  useEffect(() => {
    if (!lunarDescent) return
    const sketch = p => {
      let lm
      let stars = []
      let craters = []
      let dustParticles = []

      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight)
        lm = new LunarModule(p)
        lm.x = p.width / 2

        // More stars with depth
        for (let i = 0; i < 400; i++) {
          stars.push({
            x: p.random(p.width),
            y: p.random(p.height),
            size: p.random(0.5, 2.5),
            brightness: p.random(150, 255)
          })
        }

        // Pre-generate craters with different sizes
        for (let i = 0; i < 35; i++) {
          craters.push({
            x: p.random(-2000, 2000),
            y: p.random(-500, 500),
            size: p.random(30, 180),
            depth: p.random(0.4, 0.7),
            shade: p.random(100, 160)
          })
        }
      }

      p.draw = () => {
        const { throttle, fuel, altitude, velocity, masterAlarm, cameraMode } = useMissionStore.getState()
        p.background(0)

        // Draw Stars
        p.noStroke()
        stars.forEach(s => {
          p.fill(s.brightness)
          p.circle(s.x, s.y, s.size)
        })

        // Fuel Alarm logic
        if (fuel < 10 && fuel > 0 && !masterAlarm) {
          setValues({ masterAlarm: true })
        }

        // --- CAMERA & WORLD SCALING ---
        const constrainedAlt = p.constrain(altitude, 0, 15000)

        // The moon surface rises from the bottom
        // At 15km it's way down, at 0 it's at landing level
        const surfaceVisualY = p.map(constrainedAlt, 15000, 0, p.height + 600, p.height * 0.75)

        p.push()

        // --- THE MOON (Curved Horizon) ---
        p.noStroke()

        // Deep background Moon glow (only visible at high altitude)
        if (constrainedAlt > 5000) {
          const glowAlpha = p.map(constrainedAlt, 5000, 15000, 0, 40)
          p.fill(150, glowAlpha)
          p.ellipse(p.width / 2, surfaceVisualY + 400, p.width * 2, 800)
        }

        // Detailed Surface Gradient
        const gradSteps = 150
        const stepH = (p.height - surfaceVisualY) / gradSteps + 5
        for (let i = 0; i < gradSteps; i++) {
          const inter = i / gradSteps
          const col = p.lerp(185, 40, inter)
          p.fill(col)
          p.rect(0, surfaceVisualY + i * (stepH - 2), p.width, stepH)
        }

        // --- CRATERS with perspective ---
        craters.forEach(c => {
          // Perspective translation based on altitude
          const perspectiveScale = p.map(constrainedAlt, 0, 15000, 1.0, 0.2)
          const craterX = p.width / 2 + c.x * perspectiveScale
          const craterY = surfaceVisualY + 30 + c.y * perspectiveScale

          if (craterY > surfaceVisualY - 20) {
            p.push()
            p.translate(craterX, craterY)
            p.scale(perspectiveScale)

            // Outer rim
            p.fill(c.shade - 20)
            p.ellipse(0, 0, c.size, c.size * 0.4)
            // Inner shadow
            p.fill(c.shade - 50)
            p.ellipse(-2, 1, c.size * 0.85, c.size * 0.3)
            // Highlighting rim
            p.noFill()
            p.stroke(200, 60)
            p.strokeWeight(1)
            p.arc(0, 0, c.size, c.size * 0.4, p.PI, p.TWO_PI)
            p.pop()
          }
        })

        // --- LANDING TARGET ---
        p.push()
        const targetScale = p.map(constrainedAlt, 15000, 0, 0.1, 1.2)
        const targetAlpha = p.map(p.constrain(altitude, 0, 2000), 2000, 0, 40, 200)
        p.translate(p.width / 2, surfaceVisualY + 5)
        p.scale(targetScale)
        p.stroke(0, 255, 100, targetAlpha)
        p.strokeWeight(3 / targetScale)
        p.noFill()
        p.ellipse(0, 0, 200, 60)
        p.line(-120, 0, 120, 0)
        p.line(0, -25, 0, 25)

        // Distance circles
        p.stroke(0, 255, 100, targetAlpha * 0.5)
        p.ellipse(0, 0, 400, 120)
        p.pop()

        p.pop()

        // --- LUNAR DUST (Improved) ---
        if (altitude < 250 && throttle > 0.05) {
          const dustIntensity = p.map(altitude, 250, 0, 5, 40)
          for (let i = 0; i < 3; i++) {
            dustParticles.push({
              x: p.width / 2 + p.random(-80, 80),
              y: surfaceVisualY - 5,
              vx: p.random(-15, 15),
              vy: p.random(-2, -8),
              size: p.random(20, 100),
              alpha: 150
            })
          }
        }

        dustParticles.forEach((d, index) => {
          d.x += d.vx
          d.y += d.vy
          d.alpha -= 4
          p.fill(200, 190, 180, d.alpha)
          p.noStroke()
          p.circle(d.x, d.y, d.size)
        })
        dustParticles = dustParticles.filter(d => d.alpha > 0)

        // --- CONTROL HANDLING ---
        let currentThrottle = throttle
        const keys = window.__heldKeys || {}

        if (keys['KeyB']) {
          currentThrottle = 1.0
          setValues({ throttle: 1.0 })
        }
        if (keys['ArrowUp']) {
          currentThrottle = Math.min(1.0, currentThrottle + 0.015)
          setValues({ throttle: currentThrottle })
        }
        if (keys['ArrowDown']) {
          currentThrottle = Math.max(0.0, currentThrottle - 0.015)
          setValues({ throttle: currentThrottle })
        }

        // Lateral control
        if (keys['ArrowLeft']) lm.x -= 3.5
        if (keys['ArrowRight']) lm.x += 3.5

        // --- PHYSICS (12 min target duration — Historical Apollo 11) ---
        const warp = useMissionStore.getState().timeWarp
        const lunarGravity = 0.00015 * warp
        let thrustForce = 0

        if (currentThrottle > 0 && fuel > 0) {
          thrustForce = currentThrottle * 0.0003 * warp
          // 4.8x lower consumption than before to match 12 min
          setValues({ fuel: Math.max(0, fuel - currentThrottle * 0.004 * warp) })
          AudioManager.setEnginePower(currentThrottle, cameraMode)
        } else {
          AudioManager.setEnginePower(0.001, cameraMode)
        }

        // newVel = velocity + (lunarGravity - thrustForce)
        const newVel = velocity + (lunarGravity - thrustForce)
        const constrainedVel = p.constrain(newVel, -0.02, 0.22)
        // Rate of descent slowed down significantly for 12 min
        const newAlt = Math.max(0, altitude - constrainedVel * 2.5 * warp)

        setValues({ velocity: constrainedVel, altitude: newAlt })

        // Keep ambient alive
        if (p.frameCount % 90 === 0) {
          AudioManager.startAmbient('cabin')
        }

        // --- DRAW LM ---
        if (cameraMode === 'external') {
          // LM stays slightly above center, surface meets it
          lm.y = Math.min(surfaceVisualY - 45, p.height * 0.45)

          // Camera shake on high throttle
          if (currentThrottle > 0.8) {
            p.translate(p.random(-2, 2), p.random(-2, 2))
          }

          lm.draw(currentThrottle)
        }

        // --- UI ---
        drawUI(p, altitude, velocity, fuel, currentThrottle)

        // --- MISSION ALARMS ---
        const triggers = [
          { alt: 10000, code: "1202 PROGRAM ALARM" },
          { alt: 5000, code: "1201 PROGRAM ALARM" },
          { alt: 1000, code: "1202 PROGRAM ALARM" },
          { alt: 300, code: "LOW FUEL - MASTER CAUTION" }
        ]

        triggers.forEach(t => {
          if (altitude < t.alt && altitude > t.alt - 100 && p.frameCount % 100 < 50) {
            if (p.frameCount % 100 === 0) AudioManager.playAlarm()
            p.fill(255, 255, 0)
            p.textAlign(p.CENTER)
            p.textSize(32)
            p.textStyle(p.BOLD)
            p.text(t.code, p.width / 2, 160)
          }
        })

        // --- LANDING CHECK ---
        if (altitude <= 0 && !p.hasFinished) {
          p.hasFinished = true
          AudioManager.stopEngine()
          setValues({ velocity: 0 })
          if (Math.abs(velocity) < 0.045) {
            landSuccess()
          } else {
            crash()
          }
        }
      }


      function drawUI(p, alt, vel, fuel, thr) {
        const hudColor = alt < 500 ? [255, 100, 0] : [0, 200, 255]
        p.fill(hudColor[0], hudColor[1], hudColor[2]); p.noStroke(); p.textSize(14); p.textAlign(p.LEFT)
        p.text(`ALT: ${alt.toFixed(0)} m`, 30, p.height - 80)
        p.text(`VEL: ${(vel * 100).toFixed(1)} m/s`, 30, p.height - 60)
        p.text(`FUEL: ${fuel.toFixed(1)}%`, 30, p.height - 40)
        p.textAlign(p.RIGHT)
        p.text(`THR: ${(thr * 100).toFixed(0)}%`, p.width - 30, p.height - 40)

        // Bottom Hint
        p.fill(255, 255, 255, 150); p.textAlign(p.CENTER); p.textSize(12)
        p.text('[↑/↓] EMPUJE  [SPACE] FRENO MÀX  [←/→] LATERAL  [C] CÁMARA', p.width / 2, p.height - 15)

        // Altitude Bar
        const barH = 200, barW = 10, barX = p.width - 40, barY = p.height / 2 - 100
        p.noFill(); p.stroke(255, 100); p.rect(barX, barY, barW, barH)
        const fillH = p.map(p.constrain(alt, 0, 15000), 0, 15000, 0, barH)
        p.fill(hudColor); p.noStroke(); p.rect(barX, barY + barH - fillH, barW, fillH)
      }
    }
    const instance = new p5(sketch, ref.current)
    return () => {
      instance.remove()
      AudioManager.stopAll()
    }
  }, [lunarDescent])

  return lunarDescent ? <div ref={ref} style={{ position: 'absolute', inset: 0, zIndex: 10 }} /> : null
}