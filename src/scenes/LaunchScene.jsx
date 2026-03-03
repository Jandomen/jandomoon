import { SaturnV } from '../entities/SaturnV'
import { useEffect, useRef } from 'react'
import p5 from 'p5'
import { useMissionStore } from '../stores/missionStore'
import AudioManager from '../audio/AudioManager'

export function LaunchScene() {
  const ref = useRef()

  useEffect(() => {
    const sketch = p => {
      let rocket
      let fallingStages = []
      let stars = []
      let smoke = []
      let shakeIntensity = 0

      // Stage separation visual effects
      let sepFlashTimer = 0
      let stageLabels = [] // Floating labels for separated stages

      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight)
        rocket = new SaturnV(p)
        for (let i = 0; i < 300; i++) stars.push({ x: p.random(p.width), y: p.random(p.height), sz: p.random(1, 2) })
      }

      p.draw = () => {
        const state = useMissionStore.getState()
        const {
          ignited, throttle, fuel, altitude, velocity, setValues, countdown, currentStage, nextStage, cameraMode,
          launchDay, aborted, lesJettisoned
        } = state

        // Keyboard input — must be declared here so [S] works for staging
        const keys = window.__heldKeys || {}

        // --- SKY GRADIENT & STARS ---
        let skyColor = p.color(0, 5, 20)
        let starAlpha = 255

        if (launchDay) {
          // Darken the sky mapped to 150,000m so it takes ~6 minutes instead of 2.5 min
          const t = p.constrain(p.map(altitude, 0, 150000, 0, 1), 0, 1)
          skyColor = p.lerpColor(p.color(135, 206, 250), p.color(0, 0, 0), t)
          starAlpha = p.map(altitude, 60000, 120000, 0, 255)
        }
        p.background(skyColor)

        // Draw Stars
        if (starAlpha > 0) {
          p.fill(255, starAlpha < 0 ? 0 : starAlpha)
          p.noStroke()
          stars.forEach(s => p.circle(s.x, s.y, s.sz))
        }

        // --- SEPARATION FLASH EFFECT ---
        if (sepFlashTimer > 0) {
          const flashAlpha = p.map(sepFlashTimer, 0, 20, 0, 200)
          p.fill(255, 255, 200, flashAlpha)
          p.rect(0, 0, p.width, p.height)
          sepFlashTimer--
        }

        // --- CAMERA SHAKE (During max-Q and stage separations) ---
        const isMaxQ = altitude > 10000 && altitude < 15000
        const shakePush = isMaxQ ? 3 : (ignited && throttle > 0.5 ? 1 : 0)
        shakeIntensity = p.lerp(shakeIntensity, shakePush + (sepFlashTimer > 0 ? 5 : 0), 0.1)

        if (shakeIntensity > 0.1) {
          p.translate(p.random(-shakeIntensity, shakeIntensity), p.random(-shakeIntensity, shakeIntensity))
        }

        // --- MAX-Q NOTIFICATION ---
        if (isMaxQ && ignited) {
          p.fill(255, 200, 0, 200)
          p.textAlign(p.CENTER)
          p.textSize(18)
          p.text("MAX-Q — MAXIMUM DYNAMIC PRESSURE", p.width / 2, 60)
        }

        // --- AMBIENTE TERRESTRE (EARTH) ---
        const rocketScale = 1
        const camY = altitude > 100 ? (altitude - 100) * rocketScale : 0

        p.push()
        p.translate(0, camY)

        // Sun (Day only)
        if (launchDay) {
          const sunY = p.height * 0.2 - camY * 0.02
          p.fill(255, 240, 100)
          if (p.drawingContext) {
            p.drawingContext.shadowBlur = 50;
            p.drawingContext.shadowColor = "white";
          }
          p.circle(p.width * 0.8, sunY, 80)
          if (p.drawingContext) p.drawingContext.shadowBlur = 0;
        }

        // Earth/Horizon Logic
        const earthRadius = 4000
        const earthY = p.height + 2500 + (altitude * 0.05)

        // Atmosphere Glow
        const atmAlpha = p.map(altitude, 0, 150000, 200, 0)
        if (atmAlpha > 0) {
          p.noFill()
          for (let i = 1; i < 5; i++) {
            p.stroke(100, 150, 255, atmAlpha / i)
            p.strokeWeight(40)
            p.arc(p.width / 2, earthY, earthRadius * 2 + i * 50, earthRadius * 2 + i * 50, p.PI, 0)
          }
        }

        // Earth Ground/Ocean Color
        const earthColor = launchDay
          ? p.lerpColor(p.color(34, 139, 34), p.color(10, 50, 120), p.constrain(altitude / 50000, 0, 1))
          : p.color(5, 10, 20)

        p.fill(earthColor)
        p.noStroke()
        p.circle(p.width / 2, earthY, earthRadius * 2)
        p.pop()

        // --- TORRE Y PLATAFORMA ---
        if (altitude < 2000) {
          p.push()
          p.translate(0, camY)

          // Spotlight Beams (Night only)
          if (!launchDay) {
            p.push()
            p.blendMode(p.ADD)
            p.noStroke()
            p.fill(200, 200, 255, 40)
            p.triangle(p.width / 2 - 200, p.height, p.width / 2 - 150, p.height, p.width / 2 - 20, p.height - 500)
            p.triangle(p.width / 2 + 200, p.height, p.width / 2 + 150, p.height, p.width / 2 + 20, p.height - 500)
            p.pop()
          }

          p.fill(220, 30, 30) // RED TOWER
          p.rect(p.width / 2 + 50, p.height - 400, 30, 400)
          p.noStroke()
          p.rect(p.width / 2 + 30, p.height - 380, 40, 10)

          p.fill(30)
          p.rect(p.width / 2 - 100, p.height - 30, 200, 30)
          p.pop()
        }

        // --- FALLING STAGES (Enhanced with interstage adapter, exhaust trails) ---
        fallingStages = fallingStages.filter(s => {
          s.y += s.v
          s.v += 0.01 // Very low gravity so they drift away slowly
          s.rot += s.rotSpeed
          s.life -= 0.002 // Decays slowly: takes about 500 frames (~8 seconds) to disappear

          p.push()
          p.translate(p.width / 2 + s.offsetX, s.y + camY)
          p.rotate(s.rot)

          if (s.type === 'S-IC') {
            // First stage — huge white cylinder with black bands
            p.fill(240, 240, 240, s.life * 255)
            p.rect(-25, 0, 50, 150)
            p.fill(20, 20, 20, s.life * 255)
            p.rect(-25, 120, 50, 30)
            p.rect(-25, 20, 50, 15)
            // Fins
            p.fill(240, 240, 240, s.life * 255)
            p.triangle(-25, 120, -45, 150, -25, 150)
            p.triangle(25, 120, 45, 150, 25, 150)
            // 5 F-1 engine bells
            p.fill(80, 80, 80, s.life * 255)
            for (let i = -15; i <= 15; i += 7) {
              p.ellipse(i, 152, 10, 6)
            }
          } else if (s.type === 'S-II') {
            // Second stage
            p.fill(255, 255, 255, s.life * 255)
            p.rect(-22, 0, 44, 100)
            p.fill(20, 20, 20, s.life * 255)
            p.rect(-22, 10, 44, 15)
            // Interstage ring
            p.fill(180, 180, 180, s.life * 255)
            p.rect(-24, 85, 48, 15)
          } else if (s.type === 'LES') {
            // Launch Escape System
            p.stroke(180, 180, 180, s.life * 255); p.strokeWeight(1.5)
            p.line(0, 0, 0, -55)
            p.noStroke()
            p.fill(230, 230, 230, s.life * 255)
            p.rect(-3, -60, 6, 20, 2)
            p.fill(200, 50, 50, s.life * 255)
            p.triangle(-3, -60, 3, -60, 0, -70)

            // LES jettison motor fire
            if (s.life > 0.8) {
              p.fill(255, 150, 0, s.life * 200)
              p.triangle(-5, -55, 5, -55, 0, -55 - p.random(30, 60))
            }
          } else if (s.type === 'INTERSTAGE') {
            // Interstage adapter ring
            p.fill(180, 180, 180, s.life * 255)
            p.rect(-24, 0, 48, 15)
          }

          p.pop()

          // Exhaust trail particles
          if (s.life > 0.5 && s.type !== 'LES' && s.type !== 'INTERSTAGE') {
            p.fill(200, 200, 200, (s.life - 0.5) * 100)
            p.noStroke()
            for (let i = 0; i < 3; i++) {
              p.circle(
                p.width / 2 + s.offsetX + p.random(-30, 30),
                s.y + camY + p.random(-20, 20),
                p.random(5, 15)
              )
            }
          }

          return s.life > 0 && s.y < p.height + 1000
        })

        // --- STAGE SEPARATION LABELS ---
        stageLabels = stageLabels.filter(lbl => {
          lbl.y -= 0.5
          lbl.life -= 0.005
          p.fill(0, 255, 0, lbl.life * 255)
          p.textAlign(p.CENTER)
          p.textSize(14)
          p.text(lbl.text, p.width / 2, lbl.y)
          return lbl.life > 0
        })

        // --- STAGE SEPARATION (Manual via [S] Key) ---
        // S-IC burns ~150s, S-II burns to ~360s total, orbit at 450s
        const met = state.met
        // Enable staging if time reached OR if the player drained fuel manually via throttle
        const readyToStage = (currentStage === 0 && (met >= 145 || fuel < 1)) ||
          (currentStage === 1 && (met >= 350 || fuel < 1))

        if (ignited && !aborted && readyToStage) {
          if (p.frameCount % 60 < 40) {
            p.fill(255, 255, 0)
            p.textAlign(p.CENTER)
            p.textSize(22)
            p.textStyle(p.BOLD)
            p.text(currentStage === 0 ? '>>> FUEL DEPLETED — PRESS [S] TO JETTISON S-IC <<<' : '>>> PRESS [S] TO SEPARATE STAGE <<<', p.width / 2, p.height / 2 + 100)
            p.textStyle(p.NORMAL)
          }

          // Use __stageSepPressed (set on keydown, NOT held-key) so it fires reliably
          if (window.__stageSepPressed) {
            window.__stageSepPressed = false  // consume immediately
            if (currentStage === 0) {
              nextStage()
              sepFlashTimer = 20
              fallingStages.push({
                y: p.height - 150 - altitude * rocketScale,
                v: 0.5, type: 'S-IC', rot: 0, rotSpeed: p.random(-0.005, 0.005),
                offsetX: p.random(-5, 5), life: 1.0
              })
              stageLabels.push({ text: 'S-IC SEPARATION — STAGING', y: p.height / 2 - 50, life: 1.0 })
              setTimeout(() => {
                const st = useMissionStore.getState()
                fallingStages.push({
                  y: p.height - 150 - st.altitude * rocketScale - 80,
                  v: 0.8, type: 'INTERSTAGE', rot: 0, rotSpeed: p.random(-0.02, 0.02),
                  offsetX: p.random(-10, 10), life: 1.0
                })
              }, 1500)
            } else if (currentStage === 1) {
              nextStage()
              sepFlashTimer = 20
              fallingStages.push({
                y: p.height - 150 - altitude * rocketScale - 100,
                v: 0.5, type: 'S-II', rot: 0, rotSpeed: p.random(-0.005, 0.005),
                offsetX: p.random(-5, 5), life: 1.0
              })
              stageLabels.push({ text: 'S-II SEPARATION — S-IVB IGNITION', y: p.height / 2 - 50, life: 1.0 })
            }
            AudioManager.playStageSep()
          }
        }

        // LES Jettison (automatic at ~3:30 / 210s or altitude > 90km)
        if (ignited && (met >= 210 || altitude > 90000) && !lesJettisoned && currentStage >= 1) {
          setValues({ lesJettisoned: true })
          fallingStages.push({
            y: p.height - 150 - altitude * rocketScale - 260,
            v: -5, type: 'LES', rot: 0, rotSpeed: 0.02,
            offsetX: 0, life: 1.0
          })
          stageLabels.push({ text: 'LES JETTISON', y: p.height / 2 - 80, life: 1.0 })
          AudioManager.playStageSep()
        }

        // --- ORBIT TRANSITION (Manual at 7.5 min / 450s) ---
        if (ignited && (met >= 450 || (currentStage === 2 && fuel < 1)) && !state.inOrbit) {
          if (p.frameCount % 60 < 40) {
            p.fill(0, 255, 255)
            p.textAlign(p.CENTER)
            p.textSize(22)
            p.textStyle(p.BOLD)
            p.text('>>> PRESS [S] FOR ORBIT INSERTION <<<', p.width / 2, p.height / 2 + 100)
            p.textStyle(p.NORMAL)
          }
          if (window.__stageSepPressed) {
            window.__stageSepPressed = false
            useMissionStore.getState().startOrbit()
          }
        }


        // --- PHYSICS ---
        let abortOffset = 0

        if (aborted) {
          // ... (abort logic remains same)
          if (!p.abortStartTime) {
            p.abortStartTime = p.millis()
            p.isExploded = false
            p.explosionParticles = []
          }
          const t = (p.millis() - p.abortStartTime) / 1000
          const abortAccel = 150
          abortOffset = 0.5 * abortAccel * (t * t)

          if (t > 3.0 && !p.isExploded) {
            p.isExploded = true
            AudioManager.playStageSep()
            for (let i = 0; i < 80; i++) {
              p.explosionParticles.push({
                x: p.width / 2 + p.random(-25, 25),
                y: p.height - 150 - (altitude * rocketScale) + camY + abortOffset,
                vx: p.random(-15, 15),
                vy: p.random(-15, 15),
                sz: p.random(40, 150),
                life: 255
              })
            }
          }

          const dt = 0.016
          setValues({
            velocity: velocity + (abortAccel * dt),
            altitude: altitude + velocity * dt
          })

          AudioManager.setEnginePower(throttle, cameraMode, abortOffset)

          if (t > 15 && !state.splashed) {
            setValues({ reentry: true, phase: 'Emergency Descent' })
          }

        } else if (ignited) {
          // --- PHYSICS: Simple direct rate — tuned for exactly 7.5 min (450s) ---
          // At full throttle: 185,000m / 450s = ~411 m/s climb rate
          // Sky darkens based on altitude (60,000m = fully dark)
          // So sky darkening takes: 60,000 / 411 = ~146s ≈ 2.5 min — feels realistic

          const now = p.millis()
          const dt = p.lastFrameMs ? Math.min((now - p.lastFrameMs) / 1000, 0.05) : 0.016
          p.lastFrameMs = now

          if (fuel > 0) {
            // Fuel consumption so each stage lasts its real burn time:
            // S-IC burns 150s → 100% / 150s = 0.667%/s
            // S-II  burns 210s → 100% / 210s = 0.476%/s
            // S-IVB burns 90s  → 100% / 90s  = 1.11%/s
            const fuelRate = currentStage === 0 ? 0.00667 : currentStage === 1 ? 0.00476 : 0.0111
            setValues({ fuel: Math.max(0, fuel - throttle * fuelRate * dt * 100) })
            AudioManager.setEnginePower(throttle, cameraMode, 0)

            // Real rockets accelerate! They start painfully slow because of their massive weight.
            // We use an acceleration curve based on Mission Elapsed Time (MET)
            let speedFactor = 1.0
            if (met < 20) {
              // First 20s: extremely slow, struggling to clear the tower
              speedFactor = p.map(met, 0, 20, 0.05, 0.25)
            } else if (met < 150) {
              // S-IC Stage: picks up speed dramatically
              speedFactor = p.map(met, 20, 150, 0.25, 1.2)
            } else if (met < 450) {
              // Upper stages: going very fast to compensate for the slow start
              speedFactor = p.map(met, 150, 450, 1.2, 1.5)
            } else {
              speedFactor = 1.5
            }

            const climbRate = throttle * 411 * speedFactor  // true target display speed
            const newVel = climbRate
            const newAlt = altitude + climbRate * dt
            setValues({ velocity: newVel, altitude: Math.max(0, newAlt) })
          } else {
            // No fuel — coasting (velocity slowly decreases due to gravity)
            const newVel = Math.max(0, velocity - 9.8 * dt)
            setValues({ velocity: newVel, altitude: Math.max(0, altitude + newVel * dt) })
            AudioManager.stopEngine()
          }


          // Update phase text based on MET milestones
          if (met > 10 && met < 15) {
            setValues({ phase: 'Roll Program Initiated' })
          } else if (met > 60 && met < 65) {
            setValues({ phase: 'Approaching Max-Q' })
          } else if (met > 200 && met < 205) {
            setValues({ phase: 'Tower Jettison Complete' })
          } else if (met > 440 && met < 445) {
            setValues({ phase: 'Orbit Insertion Final Burn' })
          }
        }

        // --- DIBUJAR COHETE ---
        if (!aborted || (aborted && !p.isExploded)) {
          p.push()
          p.translate(0, camY)
          rocket.draw(altitude, currentStage, abortOffset, 0)
          p.pop()
        }

        // --- PARTÍCULAS DE EXPLOSIÓN ---
        if (p.explosionParticles) {
          p.explosionParticles = p.explosionParticles.filter(ep => {
            ep.x += ep.vx; ep.y += ep.vy; ep.life -= 5
            p.fill(255, p.random(100, 200), 0, ep.life)
            p.circle(ep.x, ep.y, ep.sz)
            return ep.life > 0
          })
        }

        // --- LLAMAS ---
        const showFire = (ignited || (countdown !== null && countdown <= 3)) && fuel > 0
        if (showFire && !aborted) {
          p.push()
          let flameOffset = 150
          if (currentStage === 1) flameOffset = 0
          if (currentStage === 2) flameOffset = -110

          const fireY = p.height - 150 - (altitude * rocketScale) + camY + flameOffset
          p.translate(p.width / 2, fireY)

          // Multi-engine effect for S-IC (5 engines)
          if (currentStage === 0) {
            p.stroke(255, p.random(20, 100), 0, 120)
            p.strokeWeight(8)
            const fireSize = ignited ? throttle * 0.5 : 0.1
            // Center engine
            for (let i = 0; i < 5; i++) {
              p.line(p.random(-4, 4), 0, p.random(-15, 15), p.random(60, 150) * fireSize)
            }
            // Outer engines
            for (let e = -12; e <= 12; e += 8) {
              for (let i = 0; i < 3; i++) {
                p.line(e + p.random(-3, 3), 0, e + p.random(-10, 10), p.random(50, 120) * fireSize)
              }
            }
          } else {
            // Single engine (S-II has 5 too, S-IVB has 1, simplified)
            p.stroke(255, p.random(20, 100), 0, 120)
            p.strokeWeight(8)
            const fireSize = ignited ? throttle * 0.5 : 0.1
            for (let i = 0; i < 10; i++) {
              p.line(p.random(-8, 8), 0, p.random(-25, 25), p.random(60, 150) * fireSize)
            }
          }
          p.pop()

          // --- HUMO (Efecto en plataforma) ---
          if (altitude < 500) {
            for (let i = 0; i < 3; i++) {
              smoke.push({
                x: p.width / 2 + p.random(-50, 50),
                y: p.height - 30,
                vx: p.random(-5, 5),
                vy: p.random(-1, -3),
                sz: p.random(30, 80),
                life: 255
              })
            }
          }
        }

        // Renderizar humo
        smoke = smoke.filter(s => {
          s.x += s.vx; s.y += s.vy; s.life -= 2
          p.fill(200, s.life)
          p.noStroke()
          p.circle(s.x, s.y + camY, s.sz)
          return s.life > 0
        })

        // --- STAGE INDICATOR (Bottom right) ---
        if (ignited && !aborted) {
          p.push()
          p.fill(0, 20, 40, 200)
          p.noStroke()
          p.rect(p.width - 180, p.height - 110, 170, 100, 6)
          p.fill(0, 255, 0)
          p.textAlign(p.LEFT)
          p.textSize(11)
          const stageNames = ['S-IC (1st)', 'S-II (2nd)', 'S-IVB (3rd)']
          stageNames.forEach((name, i) => {
            const isActive = i === currentStage
            const isBurned = i < currentStage
            p.fill(isBurned ? '#555' : (isActive ? '#0f0' : '#333'))
            p.text(`${isBurned ? '✓ ' : (isActive ? '▶ ' : '  ')}${name}`, p.width - 170, p.height - 85 + i * 22)
            if (isActive) {
              // Fuel bar
              p.fill(0, 50, 0)
              p.rect(p.width - 170, p.height - 75 + i * 22, 150, 6, 2)
              p.fill(fuel < 20 ? '#f00' : '#0f0')
              p.rect(p.width - 170, p.height - 75 + i * 22, (fuel / 100) * 150, 6, 2)
            }
          })
          // LES status
          p.fill(lesJettisoned ? '#555' : '#f80')
          p.textSize(9)
          p.text(lesJettisoned ? '✓ LES JETTISONED' : '● LES ARMED', p.width - 170, p.height - 18)
          p.pop()
        }

        // COUNTDOWN
        if (countdown !== null && countdown > 0) {
          p.fill(255, 0, 0)
          p.textAlign(p.CENTER)
          p.textSize(100)
          p.text(`T - ${countdown}`, p.width / 2, p.height / 2 - 100)
          if (p.frameCount % 60 === 0) AudioManager.playBeep(2400, 0.05)
        }
      }

      p.keyPressed = () => {
        if (p.key === 'd' || p.key === 'D') {
          const s = useMissionStore.getState()
          if (s.midflight) return
          s.toggleLaunchDay()
        }
      }
    }

    p5.disableFriendlyErrors = true;
    const instance = new p5(sketch, ref.current)
    return () => {
      instance.remove()
      AudioManager.stopEngine()
    }
  }, [])

  return <div ref={ref} style={{ position: 'absolute', inset: 0 }} />
}
