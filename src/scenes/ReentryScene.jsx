// src/scenes/ReentryScene.jsx
import { useEffect, useRef } from 'react'
import p5 from 'p5'
import { useMissionStore } from '../stores/missionStore'
import AudioManager from '../audio/AudioManager'

export function ReentryScene() {
  const ref = useRef()
  const { reentry, setValues, crash } = useMissionStore()

  useEffect(() => {
    if (!reentry) return

    const sketch = p => {
      let startTime = p.millis()
      let lastFrameTime = p.millis()
      let totalElapsed = 0
      const totalDuration = 220 // 3.5 minutes total (much faster for gameplay)

      // ... (rest of setup variables)
      let virtualAltitude = 120
      let velocityValue = 11000

      let stars = []
      let particles = []
      let confetti = []
      let capsuleAngle = 0
      let capsuleXOffset = 0
      let health = 100
      let entryPhase = 'INITIAL'
      let splashTime = 0
      let hasSplashed = false
      let victoryTriggered = false

      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight)
        for (let i = 0; i < 400; i++) stars.push({ x: p.random(p.width), y: p.random(p.height), sz: p.random(1, 2) })
        for (let i = 0; i < 250; i++) confetti.push({
          x: p.random(p.width), y: p.random(-p.height * 2, -10),
          vx: p.random(-1.5, 1.5), vy: p.random(1.5, 4),
          sz: p.random(5, 12), rot: p.random(p.TWO_PI),
          color: [p.color(255, 215, 0), p.color(255, 50, 50), p.color(50, 100, 255),
          p.color(255, 255, 255), p.color(50, 255, 100), p.color(255, 100, 200)
          ][Math.floor(p.random(6))]
        })
        AudioManager.playStageSep()
        AudioManager.startAmbient('reentry')
      }

      p.draw = () => {
        const { cameraMode, parachutesDeployed, timeWarp } = useMissionStore.getState()

        // Time warp aware delta
        const now = p.millis()
        const dt = (now - lastFrameTime) / 1000
        lastFrameTime = now
        totalElapsed += dt * timeWarp
        const elapsed = totalElapsed

        const keys = window.__heldKeys || {}

        // =====================
        // PHASE LOGIC (3.5 MIN TOTAL / 220s)
        // =====================
        if (elapsed < 20) {
          // 20 SECONDS INITIAL
          entryPhase = 'INITIAL'
          virtualAltitude = p.map(elapsed, 0, 20, 120, 100)
          velocityValue = 11000
        } else if (elapsed < 120) {
          // 100 SECONDS OF PLASMA (120 - 20) -> More time in plasma
          entryPhase = 'PLASMA'
          virtualAltitude = p.map(elapsed, 20, 120, 100, 10)
          velocityValue = p.map(elapsed, 20, 100, 11000, 300) // Decels before chutes
          if (elapsed > 100) velocityValue = 300
        } else if (elapsed < totalDuration) {
          // 100 SECONDS OF PARACHUTE (220 - 120) -> Shorter parachute time
          if (parachutesDeployed) {
            entryPhase = 'PARACHUTE'
            virtualAltitude = p.map(elapsed, 120, totalDuration, 10, 0.1)
            velocityValue = p.map(elapsed, 120, totalDuration, 300, 9)
          } else {
            entryPhase = 'FREEFALL'
            virtualAltitude = p.map(elapsed, 120, 140, 10, 0) // 20 seconds to crash if no chutes
            velocityValue = p.map(elapsed, 120, 140, 300, 900)
            if (elapsed > 140 && !hasSplashed) { crash(); return }
          }

        } else {
          entryPhase = 'SPLASHED'
          virtualAltitude = 0; velocityValue = 0
          if (!hasSplashed) {
            hasSplashed = true
            splashTime = p.millis()
            AudioManager.stopAll()
            AudioManager.playSplash()
            setTimeout(() => AudioManager.playSuccess(), 800)
            AudioManager.startAmbient('launch')
            setValues({ phase: 'WELCOME HOME, APOLLO 11' })
          }
        }

        setValues({ altitude: virtualAltitude, velocity: velocityValue / 1000, reentryPhase: entryPhase })

        // =====================
        // PHYSICS (Angle handling)
        // =====================
        if (entryPhase === 'PLASMA') {
          capsuleAngle += (p.noise(p.frameCount * 0.1) - 0.5) * 0.1 * (elapsed / 360)
          if (keys['ArrowLeft']) capsuleAngle -= 0.015
          if (keys['ArrowRight']) capsuleAngle += 0.015

          // User must stay within 45 degrees (0.785 rad)
          if (Math.abs(capsuleAngle) > 0.785) {
            health -= p.map(Math.abs(capsuleAngle), 0.785, 1.5, 0.1, 1.5)
            if (p.frameCount % 20 === 0) AudioManager.playAlarm()
          } else if (health < 100) {
            health += 0.01 // Slight recovery if optimal
          }

          if (health <= 0) {
            setValues({ phase: 'CAPSULE BURNED UP - CRITICAL ANGLE' })
            crash()
            return
          }
        } else if (entryPhase === 'PARACHUTE' || entryPhase === 'FREEFALL') {
          // Steering the parachute
          if (keys['ArrowLeft']) capsuleAngle -= 0.015
          if (keys['ArrowRight']) capsuleAngle += 0.015

          // Parachutes auto-center naturally but sway gently
          capsuleAngle = p.lerp(capsuleAngle, 0, 0.02)

          // Angle translates to sideways drift
          capsuleXOffset += capsuleAngle * 6

          // Keep within reasonable bounds
          if (capsuleXOffset > p.width * 0.4) capsuleXOffset = p.width * 0.4
          if (capsuleXOffset < -p.width * 0.4) capsuleXOffset = -p.width * 0.4
        }

        // =====================
        // AUDIO — same sound, quieter inside cabin
        // =====================
        // =====================
        // AUDIO & PARACHUTE SOUND
        // =====================
        if (parachutesDeployed && !p.chuteSoundPlayed) {
          p.chuteSoundPlayed = true
          AudioManager.playStageSep() // Using existing sound for now
          p.chuteScale = 0.1 // For animation
        }

        if (!hasSplashed) {
          if (p.frameCount % 90 === 0) {
            if (entryPhase === 'PARACHUTE' || entryPhase === 'FREEFALL') AudioManager.startAmbient('launch')
            else AudioManager.startAmbient('reentry')
          }
          AudioManager.adjustAmbientForCamera(cameraMode)
        }

        // =====================
        // RENDER
        // =====================
        if (entryPhase === 'SPLASHED') {
          drawSplashdownCelebration(p)
        } else if (entryPhase === 'PARACHUTE' || entryPhase === 'FREEFALL') {
          if (cameraMode === 'cabin') {
            drawParachuteCabinView(p)    // Inside: only blue sky out window, NO chutes
          } else {
            drawLowAltitude(p, parachutesDeployed, cameraMode)  // External: chutes visible, camera follows
          }
        } else if (cameraMode === 'cabin') {
          drawCabinView(p, elapsed)
        } else {
          drawExternalView(p, elapsed)
        }

        drawUI(p, entryPhase, parachutesDeployed, elapsed, cameraMode)

        // Victory after 18s celebration
        if (hasSplashed && !victoryTriggered) {
          const ct = (p.millis() - splashTime) / 1000
          if (ct > 18) { victoryTriggered = true; useMissionStore.getState().splashdown() }
        }
      }

      // ========================================
      // CABIN INTERIOR VIEW
      // ========================================
      function drawCabinView(p, elapsed) {
        const shake = entryPhase === 'PLASMA' ? 5 : entryPhase === 'INITIAL' ? 1.5 : 0
        p.background(15, 18, 22)
        p.push()
        p.translate(p.random(-shake, shake), p.random(-shake, shake))

        // === MAIN WINDOW ===
        const winX = p.width * 0.25
        const winY = p.height * 0.08
        const winW = p.width * 0.5
        const winH = p.height * 0.38

        // Window frame
        p.fill(38, 40, 46); p.noStroke()
        p.rect(winX - 14, winY - 14, winW + 28, winH + 28, 10)
        p.fill(28, 30, 36)
        p.rect(winX - 6, winY - 6, winW + 12, winH + 12, 6)

        // Window content by phase
        if (entryPhase === 'PLASMA') {
          // === INTENSE FIRE COVERING ENTIRE WINDOW ===
          // Base hot gradient
          for (let y = winY; y < winY + winH; y += 4) {
            const t = (y - winY) / winH
            for (let x = winX; x < winX + winW; x += 8) {
              const n = p.noise(x * 0.015, y * 0.025, p.frameCount * 0.06)
              const intensity = n * 255
              const r = 200 + n * 55
              const g = 40 + intensity * 0.55
              const b = intensity * 0.08
              p.fill(r, g, b, 220 + n * 35)
              p.noStroke()
              p.rect(x, y, 9, 5)
            }
          }
          // Bright hot core
          const pulseSize = 0.6 + Math.sin(p.frameCount * 0.15) * 0.15
          p.fill(255, 200, 60, 70)
          p.ellipse(winX + winW / 2, winY + winH * 0.65, winW * pulseSize, winH * 0.5)
          p.fill(255, 255, 180, 40)
          p.ellipse(winX + winW / 2, winY + winH * 0.5, winW * 0.3, winH * 0.3)
          // Sparks
          for (let i = 0; i < 12; i++) {
            p.fill(255, 255, p.random(150, 255), p.random(150, 255))
            p.circle(winX + p.random(winW), winY + p.random(winH), p.random(1.5, 4))
          }

          // === RED PULSE OVER ENTIRE CABIN (synced with fire) ===
          const pulse2 = (Math.sin(p.frameCount * 0.1) + 1) * 0.5
          p.fill(255, 20, 0, 12 + pulse2 * 22)
          p.rect(0, 0, p.width, p.height)

        } else if (entryPhase === 'INITIAL') {
          // Entering atmosphere — dark space + Earth glow
          p.fill(2, 5, 15); p.rect(winX, winY, winW, winH)
          p.fill(50, 130, 255, p.map(virtualAltitude, 120, 100, 30, 100))
          p.ellipse(winX + winW / 2, winY + winH, winW * 1.1, winH * 0.5)
          p.fill(255, 160)
          for (let i = 0; i < 12; i++) {
            p.circle(winX + 20 + (i * 27) % (winW - 40), winY + 12 + (i * 23) % (winH * 0.5), 1.5)
          }
        } else {
          // TERMINAL — fire GONE, clear blue sky
          for (let y = winY; y < winY + winH; y++) {
            const t = (y - winY) / winH
            p.stroke(p.lerpColor(p.color(35, 85, 190), p.color(130, 180, 245), t))
            p.line(winX, y, winX + winW, y)
          }
          p.noStroke(); p.fill(255, 255, 255, 45)
          for (let i = 0; i < 3; i++) {
            const cx = winX + ((p.frameCount * 0.4 + i * 90) % winW)
            p.ellipse(cx, winY + 30 + i * 40, 90, 14)
          }
        }

        // === INSTRUMENT PANEL — LEFT ===
        const lpX = 15, lpY = p.height * 0.12
        p.fill(22, 25, 30); p.stroke(42); p.strokeWeight(1)
        p.rect(lpX, lpY, p.width * 0.2, p.height * 0.5, 4)
        p.noStroke()

        // Altimeter
        p.fill(0, 8, 0); p.rect(lpX + 10, lpY + 15, 110, 42, 3)
        p.fill(0, 255, 0); p.textSize(9); p.textAlign(p.LEFT); p.textStyle(p.NORMAL)
        p.text('ALT KM', lpX + 15, lpY + 28)
        p.textSize(20); p.textStyle(p.BOLD)
        p.text(virtualAltitude.toFixed(1), lpX + 15, lpY + 50)

        // Velocity
        p.fill(0, 8, 0); p.rect(lpX + 10, lpY + 68, 110, 42, 3)
        p.fill(0, 255, 0); p.textSize(9); p.textStyle(p.NORMAL)
        p.text('VEL M/S', lpX + 15, lpY + 81)
        p.textSize(20); p.textStyle(p.BOLD)
        p.text(velocityValue.toFixed(0), lpX + 15, lpY + 103)

        // Heat shield
        p.fill(0, 8, 0); p.rect(lpX + 10, lpY + 121, 110, 42, 3)
        const shieldCol = health > 30 ? p.color(0, 255, 0) : p.color(255, 50, 0)
        p.fill(shieldCol); p.textSize(9); p.textStyle(p.NORMAL)
        p.text('HEAT SHIELD', lpX + 15, lpY + 134)
        p.textSize(20); p.textStyle(p.BOLD)
        p.text(`${health.toFixed(0)}%`, lpX + 15, lpY + 156)

        // Shield bar
        p.fill(50, 0, 0); p.rect(lpX + 10, lpY + 168, 110, 8, 2)
        p.fill(shieldCol); p.rect(lpX + 10, lpY + 168, p.map(health, 0, 100, 0, 110), 8, 2)

        // === ATTITUDE INDICATOR (center-bottom) ===
        const aiX = p.width / 2, aiY = p.height * 0.62, aiR = 75
        p.fill(18); p.stroke(48); p.strokeWeight(2)
        p.circle(aiX, aiY, aiR * 2 + 12)
        p.push(); p.translate(aiX, aiY); p.rotate(capsuleAngle)
        p.fill(45, 100, 175); p.noStroke(); p.arc(0, 0, aiR * 2, aiR * 2, p.PI, p.TWO_PI) // sky
        p.fill(95, 55, 25); p.arc(0, 0, aiR * 2, aiR * 2, 0, p.PI) // ground
        p.stroke(255, 190); p.strokeWeight(2); p.line(-aiR, 0, aiR, 0) // horizon
        p.stroke(255, 80); p.strokeWeight(1)
        p.line(-aiR * 0.5, -20, aiR * 0.5, -20)
        p.line(-aiR * 0.4, -40, aiR * 0.4, -40)
        p.pop()
        // Fixed reticule
        p.fill(255, 255, 0); p.noStroke()
        p.triangle(aiX - 40, aiY, aiX - 22, aiY, aiX - 26, aiY - 5)
        p.triangle(aiX + 40, aiY, aiX + 22, aiY, aiX + 26, aiY - 5)
        p.rect(aiX - 3, aiY - 3, 6, 6)
        p.fill(170); p.textSize(9); p.textAlign(p.CENTER); p.textStyle(p.NORMAL)
        p.text('ATTITUDE', aiX, aiY + aiR + 18)
        p.fill(255, 255, 0, 180); p.textSize(10)
        p.text('[←] LEFT    [→] RIGHT', aiX, aiY + aiR + 32)

        // === STATUS LIGHTS — RIGHT PANEL ===
        const rpX = p.width * 0.82, rpY = p.height * 0.12
        p.fill(22, 25, 30); p.stroke(42); p.strokeWeight(1)
        p.rect(rpX, rpY, p.width * 0.16, p.height * 0.5, 4)
        p.noStroke()
        const lights = [
          { l: 'ENTRY', c: p.color(0, 255, 0) },
          { l: 'RCS', c: p.color(0, 255, 0) },
          { l: 'SHIELD', c: health > 30 ? p.color(0, 255, 0) : p.color(255, 0, 0) },
          { l: 'CABIN', c: p.color(0, 255, 0) },
          { l: 'TEMP', c: entryPhase === 'PLASMA' ? p.color(255, 80, 0) : p.color(0, 255, 0) },
          { l: 'COMM', c: entryPhase === 'PLASMA' ? p.color(255, 0, 0) : p.color(0, 255, 0) },
        ]
        lights.forEach((s, i) => {
          const ly = rpY + 15 + i * 35
          p.fill(8); p.rect(rpX + 8, ly, 72, 26, 3)
          p.fill(s.c); p.circle(rpX + 22, ly + 13, 9)
          p.fill(170); p.textSize(8); p.textAlign(p.LEFT)
          p.text(s.l, rpX + 30, ly + 17)
        })

        // === BOTTOM CONSOLE ===
        p.fill(18, 20, 24); p.stroke(38); p.strokeWeight(1)
        p.rect(0, p.height * 0.8, p.width, p.height * 0.2)
        p.noStroke()
        for (let i = 0; i < 14; i++) {
          p.fill(30 + (i % 4) * 4); p.rect(p.width * 0.08 + i * 55, p.height * 0.84, 38, 18, 3)
        }

        p.pop()
      }

      // ========================================
      // EXTERNAL VIEW — Space + Earth + Capsule
      // ========================================
      function drawExternalView(p, elapsed) {
        p.background(0)

        if (virtualAltitude > 30) {
          const sAlpha = p.map(p.constrain(virtualAltitude, 30, 90), 90, 30, 255, 0)
          p.noStroke(); p.fill(255, sAlpha)
          stars.forEach(s => p.circle(s.x, s.y, s.sz))
        }

        // Earth rendering when altitude is very high
        p.push()
        const eScale = p.map(virtualAltitude, 120, 10, 1, 4) // Zoom in on Earth
        const eY = p.map(virtualAltitude, 120, 10, p.height * 1.6, p.height * 2.5) // Push Earth down rapidly
        p.translate(p.width / 2, eY); p.scale(eScale)

        // Only draw Earth globe if altitude is high enough (e.g. above 20)
        // because at very low altitudes Earth should act as sky/ocean flat layers
        if (virtualAltitude > 20) {
          p.noFill()
          const atm = p.map(virtualAltitude, 100, 20, 40, 200)
          for (let i = 4; i > 0; i--) {
            p.stroke(80, 180, 255, atm / i); p.strokeWeight(14 / eScale)
            p.circle(0, 0, p.width * 1.4 + i * 14)
          }
          p.fill(15, 90, 220); p.noStroke(); p.circle(0, 0, p.width * 1.4)
          p.push(); p.rotate(p.frameCount * 0.00005)
          p.fill(30, 120, 50, 100)
          p.ellipse(p.width * 0.12, -p.width * 0.08, p.width * 0.22, p.width * 0.3)
          p.pop()
          p.fill(255, 100); p.push(); p.rotate(p.frameCount * 0.0001)
          for (let i = 0; i < 6; i++) { p.ellipse(p.width * 0.4, 0, p.width * 0.24, p.width * 0.05); p.rotate(p.TWO_PI / 6) }
          p.pop()
        }
        p.pop()

        // Plasma particles — ONLY during PLASMA (Draw BEFORE capsule)
        if (entryPhase === 'PLASMA') {
          particles.forEach(pt => {
            pt.x += pt.vx; pt.y += pt.vy; pt.life -= 8
            p.fill(255, p.green(pt.col), 0, pt.life)
            p.circle(pt.x, pt.y, pt.sz * (pt.life / 255))
          })
          particles = particles.filter(pt => pt.life > 0)
        }

        // Capsule
        p.push(); p.translate(p.width / 2, p.height / 2)
        if (entryPhase === 'PLASMA') {
          p.translate(p.random(-3, 3), p.random(-3, 3))
          spawnPlasma(p)
          // Red flash synced to PLASMA only
          if (p.frameCount % 8 < 4) { p.push(); p.fill(255, 30, 0, 12); p.rect(-p.width, -p.height, p.width * 2, p.height * 2); p.pop() }
        } else if (entryPhase === 'INITIAL') {
          p.translate(p.random(-1, 1), p.random(-1, 1))
        }
        p.rotate(capsuleAngle)
        if (entryPhase === 'PLASMA') {
          p.fill(255, 200, 0); p.ellipse(0, 42, 140, 45) // Hot shield glow
        }
        drawCapsuleBody(p)
        p.pop()
      }

      // ========================================
      // CABIN VIEW — PARACHUTE PHASE (Interior, chutes NOT visible)
      // ========================================
      function drawParachuteCabinView(p) {
        p.background(14, 17, 22)
        p.push()

        // === MAIN WINDOW — Only blue sky visible (chutes are above the capsule, out of window view) ===
        const winX = p.width * 0.25, winY = p.height * 0.08
        const winW = p.width * 0.5, winH = p.height * 0.38

        // Frame
        p.fill(38, 40, 46); p.noStroke()
        p.rect(winX - 14, winY - 14, winW + 28, winH + 28, 10)
        p.fill(28, 30, 36)
        p.rect(winX - 6, winY - 6, winW + 12, winH + 12, 6)

        // Blue sky (no chutes visible from inside — they deploy above)
        for (let y = winY; y < winY + winH; y++) {
          const t = (y - winY) / winH
          p.stroke(p.lerpColor(p.color(55, 135, 230), p.color(150, 200, 255), t))
          p.line(winX, y, winX + winW, y)
        }
        // Clouds drifting past window
        p.noStroke(); p.fill(255, 255, 255, 60)
        for (let i = 0; i < 4; i++) {
          const cx = winX + ((p.frameCount * 0.5 + i * 120) % (winW + 200)) - 100
          p.ellipse(cx, winY + 40 + i * 45, 120 + i * 20, 18)
        }
        // Ocean coming into view at bottom of window as we descend
        const oceanProgress = p.map(virtualAltitude, 8, 0.1, 0, 1)
        if (oceanProgress > 0) {
          const oceanY = winY + winH - (winH * oceanProgress * 0.4)
          for (let y = oceanY; y < winY + winH; y++) {
            const t = (y - oceanY) / (winY + winH - oceanY)
            p.stroke(p.lerpColor(p.color(25, 85, 185), p.color(10, 45, 130), t))
            p.line(winX, y, winX + winW, y)
          }
        }

        // Interior panels (reuse from cabin view)
        p.fill(22, 25, 30); p.stroke(42); p.strokeWeight(1)
        p.rect(15, p.height * 0.12, p.width * 0.2, p.height * 0.5, 4)
        p.noStroke()
        p.fill(0, 255, 0); p.textSize(9); p.textAlign(p.LEFT)
        p.text('ALT KM', 25, p.height * 0.12 + 28)
        p.textSize(16); p.textStyle(p.BOLD)
        p.text(virtualAltitude.toFixed(1), 25, p.height * 0.12 + 48)
        p.textStyle(p.NORMAL)
        p.fill(0, 255, 100); p.textSize(9)
        p.text('VEL M/S', 25, p.height * 0.12 + 68)
        p.textSize(16); p.textStyle(p.BOLD)
        p.text(velocityValue.toFixed(0), 25, p.height * 0.12 + 88)
        p.textStyle(p.NORMAL)

        // Chute status light (green when deployed)
        const chutes = useMissionStore.getState().parachutesDeployed
        p.fill(0, 8, 0); p.rect(25, p.height * 0.12 + 100, 80, 28, 3)
        p.fill(chutes ? p.color(0, 255, 80) : p.color(255, 80, 0))
        p.circle(38, p.height * 0.12 + 115, 9)
        p.fill(180); p.textSize(8)
        p.text(chutes ? 'CHUTES OK' : 'NO CHUTES', 50, p.height * 0.12 + 119)

        p.pop()
      }

      // ========================================
      // LOW ALTITUDE — PARACHUTE / FREEFALL (External — follow camera)
      // ========================================
      function drawLowAltitude(p, chutesDeployed, camMode) {
        const time = p.frameCount * 0.015

        p.background(85, 160, 255)

        for (let y = 0; y < p.height; y++) {
          const t = y / (p.height * 0.85)
          p.stroke(p.lerpColor(p.color(85, 160, 255), p.color(170, 210, 255), Math.min(1, t)))
          p.line(0, y, p.width, y)
        }
        p.noStroke(); p.fill(255, 255, 255, 90)
        for (let i = 0; i < 5; i++) {
          const cx = ((i * 240 + p.frameCount * 0.2) % (p.width + 300)) - 150
          p.ellipse(cx, 45 + i * 30, 200, 28)
        }
        p.fill(255, 255, 200, 170); p.circle(p.width * 0.76, 65, 42)

        // Ocean approaches from below as altitude decreases
        // virtualAltitude goes from 10 to 0.1 over time
        const progress = p.map(p.constrain(virtualAltitude, 0, 10), 10, 0.1, 0, 1)
        const waterY = p.map(progress, 0, 1, p.height + 600, p.height * 0.8)

        for (let y = waterY; y < p.height; y++) {
          const t = (y - waterY) / (p.height - waterY)
          p.stroke(p.lerpColor(p.color(25, 85, 185), p.color(10, 45, 130), t))
          p.line(0, y, p.width, y)
        }
        p.noFill(); p.strokeWeight(1)
        for (let w = 0; w < 12; w++) {
          const wy = waterY + 12 + w * 20
          p.stroke(255, 255, 255, 18 + w * 2)
          p.beginShape()
          for (let x = 0; x < p.width; x += 14) p.vertex(x, wy + Math.sin(x * 0.02 + time + w) * (2.5 + w * 0.4))
          p.endShape()
        }

        // Capsule descending
        // In freefall, camera doesn't follow as smoothly, but in parachute the camera is locked onto capsule
        // So capY stays relatively stable around the middle, giving the illusion of falling
        const capY = p.height * 0.45
        const capX = p.width / 2 + capsuleXOffset + Math.sin(time * 0.4) * 5

        p.push(); p.translate(capX, capY)
        p.rotate(capsuleAngle + Math.sin(time) * 0.04)

        if (chutesDeployed) {
          p.chuteScale = p.lerp(p.chuteScale || 0.1, 1.0, 0.08)
          p.push(); p.scale(p.chuteScale)
          p.stroke(180, 170); p.strokeWeight(1.2)
          p.line(-10, -16, -100, -165); p.line(0, -20, 0, -185); p.line(10, -16, 100, -165)
          p.noStroke()
          p.fill(255, 50, 50); p.arc(-85, -175, 95, 82, p.PI, p.TWO_PI)
          p.fill(255, 230); p.arc(-85, -175, 95, 35, p.PI, p.TWO_PI)
          p.fill(255, 50, 50); p.arc(0, -195, 120, 100, p.PI, p.TWO_PI)
          p.fill(255, 230); p.arc(0, -195, 120, 45, p.PI, p.TWO_PI)
          p.fill(255, 50, 50); p.arc(85, -175, 95, 82, p.PI, p.TWO_PI)
          p.fill(255, 230); p.arc(85, -175, 95, 35, p.PI, p.TWO_PI)
          p.pop()
        }
        drawCapsuleBody(p)
        p.pop()

        if (entryPhase === 'FREEFALL' && p.frameCount % 50 === 0) AudioManager.playAlarm()
      }

      // ========================================
      // SPLASHDOWN CELEBRATION
      // ========================================
      function drawSplashdownCelebration(p) {
        const time = p.frameCount * 0.015
        const ct = (p.millis() - splashTime) / 1000

        // Sky
        for (let y = 0; y < p.height * 0.48; y++) {
          const t = y / (p.height * 0.48)
          p.stroke(p.lerpColor(p.color(80, 155, 255), p.color(165, 205, 255), t))
          p.line(0, y, p.width, y)
        }
        p.noStroke(); p.fill(255, 255, 255, 80)
        for (let i = 0; i < 4; i++) {
          const cx = ((i * 280 + p.frameCount * 0.12) % (p.width + 300)) - 150
          p.ellipse(cx, 35 + i * 25, 210, 24)
        }
        p.fill(255, 255, 200, 150); p.circle(p.width * 0.82, 55, 36)

        // Ocean
        const waterY = p.height * 0.48
        for (let y = waterY; y < p.height; y++) {
          const t = (y - waterY) / (p.height - waterY)
          p.stroke(p.lerpColor(p.color(25, 88, 188), p.color(10, 48, 135), t))
          p.line(0, y, p.width, y)
        }
        p.noFill(); p.strokeWeight(1)
        for (let w = 0; w < 14; w++) {
          const wy = waterY + 8 + w * 16
          p.stroke(255, 255, 255, 14 + w * 1.5)
          p.beginShape()
          for (let x = 0; x < p.width; x += 12) p.vertex(x, wy + Math.sin(x * 0.016 + time + w * 0.6) * (2 + w * 0.25))
          p.endShape()
        }

        // Splash rings
        if (ct < 3) {
          p.noFill(); p.stroke(255, p.map(ct, 0, 3, 160, 0)); p.strokeWeight(2)
          for (let r = 0; r < 4; r++) {
            const rr = 15 + ct * 30 + r * 22
            p.ellipse(p.width / 2, waterY, rr * 2, rr * 0.3)
          }
        }

        // Capsule floating
        const bob = Math.sin(time * 1.3) * 6
        p.push()
        p.translate(p.width / 2, waterY - 8 + bob)
        p.rotate(Math.sin(time * 0.7) * 0.05)
        drawCapsuleBody(p)
        p.fill(255, 50, 50, 70); p.noStroke()
        p.ellipse(65, 25, 80, 16); p.ellipse(115, 30, 50, 10)
        p.stroke(180, 100); p.strokeWeight(1)
        p.line(10, -6, 65, 20); p.line(13, -3, 115, 25)
        p.pop()

        // USS Hornet
        if (ct > 1.5) {
          const sx = p.map(p.constrain(ct, 1.5, 14), 1.5, 14, p.width + 160, p.width * 0.66)
          p.push()
          p.translate(sx, waterY - 16 + Math.sin(time * 0.45) * 3)
          p.fill(92, 92, 97); p.noStroke()
          p.beginShape(); p.vertex(-100, 10); p.vertex(100, 10); p.vertex(82, 28); p.vertex(-82, 28); p.endShape(p.CLOSE)
          p.fill(110); p.rect(-22, -22, 44, 32)
          p.fill(80); p.rect(-6, -44, 12, 22)
          p.stroke(70); p.strokeWeight(1.5); p.line(0, -44, 0, -64)
          p.noStroke(); p.fill(255, 0, 0); p.rect(48, -3, 16, 10)
          p.fill(255); p.textSize(6); p.textAlign(p.CENTER); p.text('USS HORNET', 0, 24)
          p.pop()
        }

        // Helicopters
        if (ct > 3) drawHeli(p, p.width * 0.26 + Math.cos(time * 0.6) * 65, p.height * 0.16 + Math.sin(time * 1.1) * 12, 'NAVY 66', 1.0)
        if (ct > 5) drawHeli(p, p.width * 0.5 + Math.sin(time * 0.4) * 45, p.height * 0.2 + Math.cos(time * 0.8) * 10, 'RECOVERY 2', 0.85)

        // Rescue raft
        if (ct > 7) {
          p.push()
          p.translate(p.width / 2 + 50, waterY + 3 + bob * 0.4)
          p.fill(255, 200, 0); p.noStroke(); p.ellipse(0, 0, 36, 9)
          p.fill(0, 55, 0); p.circle(-4, -3, 6)
          p.pop()
        }

        // Confetti
        if (ct > 2) {
          confetti.forEach(c => {
            c.y += c.vy; c.x += c.vx + Math.sin(c.y * 0.008) * 0.3; c.rot += 0.04
            if (c.y > p.height + 10) { c.y = p.random(-40, -5); c.x = p.random(p.width) }
            p.push(); p.translate(c.x, c.y); p.rotate(c.rot)
            p.fill(c.color); p.noStroke()
            p.rect(-c.sz / 2, -c.sz / 4, c.sz, c.sz / 2)
            p.pop()
          })
        }

        // Victory text
        if (ct > 1) {
          const a = p.constrain(p.map(ct, 1, 3, 0, 255), 0, 255)
          p.textAlign(p.CENTER); p.noStroke()
          p.fill(0, 0, 0, a * 0.35); p.textSize(44); p.textStyle(p.BOLD)
          p.text('SPLASHDOWN!', p.width / 2 + 2, 50)
          p.fill(255, 215, 0, a); p.textSize(44)
          p.text('SPLASHDOWN!', p.width / 2, 48)
          p.fill(255, 255, 255, a); p.textSize(18); p.textStyle(p.NORMAL)
          p.text('APOLLO 11 — MISSION ACCOMPLISHED', p.width / 2, 78)
          p.fill(200, 220, 255, a); p.textSize(13)
          p.text('JULY 24, 1969 — PACIFIC OCEAN', p.width / 2, 100)
        }
        if (ct > 5) {
          const qa = p.constrain(p.map(ct, 5, 7, 0, 210), 0, 210)
          p.fill(255, 255, 255, qa); p.textSize(14); p.textAlign(p.CENTER); p.textStyle(p.ITALIC)
          p.text('"That\'s one small step for man, one giant leap for mankind."', p.width / 2, p.height - 48)
          p.fill(170, 170, 190, qa); p.textSize(10); p.textStyle(p.NORMAL)
          p.text('— Neil Armstrong', p.width / 2, p.height - 30)
        }
      }

      // ========================================
      // HELPERS
      // ========================================
      function drawCapsuleBody(p) {
        p.fill(210); p.noStroke()
        p.beginShape(); p.vertex(-26, 16); p.vertex(26, 16); p.vertex(9, -30); p.vertex(-9, -30); p.endShape(p.CLOSE)
        p.fill(50); p.ellipse(0, 16, 52, 11)
        p.fill(20, 40, 60); p.circle(0, -9, 12)
      }

      function spawnPlasma(p) {
        for (let i = 0; i < 10 + Math.abs(capsuleAngle) * 25; i++) {
          particles.push({
            x: p.width / 2 + p.random(-55, 55), y: p.height / 2 + 22,
            vx: p.random(-9, 9), vy: p.random(-14, -30),
            sz: p.random(25, 80), life: 255,
            col: p.color(255, p.random(140, 255), 0)
          })
        }
      }

      function drawHeli(p, x, y, label, s) {
        p.push(); p.translate(x, y); p.scale(s)
        p.fill(40, 58, 44); p.stroke(80, 25); p.strokeWeight(1)
        p.rect(-36, -14, 72, 28, 10)
        p.rect(36, -6, 50, 12, 3)
        p.fill(0); p.rect(78, -18, 4, 46)
        p.fill(100, 200, 255, 130); p.rect(-30, -10, 22, 16, 3)
        p.push(); p.translate(0, -18); p.rotate(p.frameCount * 0.85)
        p.stroke(45); p.strokeWeight(3); p.line(-72, 0, 72, 0)
        p.pop()
        p.noStroke(); p.fill(255); p.textSize(6); p.textAlign(p.CENTER); p.text(label, 0, 28)
        p.pop()
      }

      function drawUI(p, phase, deployed, elapsed, camMode) {
        p.push(); p.textAlign(p.CENTER)

        // Phase info — don't show during cabin (it has its own instruments) or splashdown
        if (phase !== 'SPLASHED' && camMode !== 'cabin') {
          p.fill(0, 0, 0, 130); p.noStroke()
          p.rect(p.width / 2 - 165, 86, 330, 46, 5)
          p.fill(0, 255, 0, 210); p.textSize(15); p.textStyle(p.BOLD)
          p.text(`RE-ENTRY: ${phase}`, p.width / 2, 107)
          p.fill(255, 180); p.textSize(11); p.textStyle(p.NORMAL)
          const tl = Math.max(0, totalDuration - elapsed)
          p.text(`ALT: ${virtualAltitude.toFixed(1)} km | VEL: ${velocityValue.toFixed(0)} m/s | T-${tl.toFixed(0)}s`, p.width / 2, 124)
        }

        // External view heat shield bar
        if (phase === 'PLASMA' && camMode !== 'cabin') {
          const tiltLimit = 0.785 // 45 degrees
          const currentTilt = Math.abs(capsuleAngle)
          const isDanger = currentTilt > tiltLimit

          p.fill(0, 0, 0, 140); p.noStroke(); p.rect(p.width / 2 - 210, p.height - 140, 420, 78, 5)
          p.fill(70, 0, 0); p.rect(p.width / 2 - 195, p.height - 118, 390, 18, 3)
          p.fill(isDanger ? '#f00' : '#0d0'); p.rect(p.width / 2 - 195, p.height - 118, p.map(health, 0, 100, 0, 390), 18, 3)
          p.fill(255); p.textSize(11); p.textStyle(p.BOLD)
          p.text(`HEAT SHIELD: ${health.toFixed(0)}%`, p.width / 2, p.height - 130)

          // Tilt Indicator
          p.stroke(255, 50); p.noFill(); p.rect(p.width / 2 - 130, p.height - 88, 260, 7, 3)
          p.fill(isDanger ? '#f00' : '#0f0', 100); p.noStroke(); p.rect(p.width / 2 - 20, p.height - 88, 40, 7, 3)
          const mx = p.width / 2 + (capsuleAngle / 1.5) * 260 // Scaled indicator
          p.fill(isDanger ? '#f00' : '#ff0'); p.triangle(mx, p.height - 91, mx - 5, p.height - 100, mx + 5, p.height - 100)

          p.fill(isDanger ? '#f00' : 255, 130); p.textSize(10); p.textStyle(p.BOLD)
          if (isDanger) p.text("⚠ WARNING: CRITICAL ANGLE — BURN DETECTED ⚠", p.width / 2, p.height - 105)
          else p.text(`CAPSULE TILT: ${(currentTilt * 57.3).toFixed(1)}° / 45.0° LIMIT`, p.width / 2, p.height - 73)
        }

        // Parachute deploy prompt
        if (phase === 'FREEFALL' && !deployed) {
          p.fill(0, 0, 0, 200); p.noStroke()
          p.rect(p.width / 2 - 280, p.height / 2 + 40, 560, 85, 7)
          if (Math.sin(p.frameCount * 0.15) > 0) {
            p.fill(255, 255, 0); p.textSize(30); p.textStyle(p.BOLD)
            p.text('⚠  PRESS [ P ] TO DEPLOY  ⚠', p.width / 2, p.height / 2 + 82)
          }
          p.fill(255, 150); p.textSize(12); p.textStyle(p.NORMAL)
          p.text('Deploy parachutes for safe landing', p.width / 2, p.height / 2 + 110)

          p.fill(255, 0, 0, 220); p.textSize(22); p.textStyle(p.BOLD)
          p.text('⛔ NO CHUTES — PRESS [ P ] NOW! ⛔', p.width / 2, p.height / 2 + 150)
        }

        p.pop()
      }

      p.windowResized = () => p.resizeCanvas(p.windowWidth, p.windowHeight)
    }

    const instance = new p5(sketch, ref.current)
    return () => { instance.remove(); AudioManager.stopAll() }
  }, [reentry])

  return reentry ? <div ref={ref} style={{ position: 'absolute', inset: 0, zIndex: 5 }} /> : null
}