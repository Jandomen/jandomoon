import { useEffect, useRef } from 'react'
import p5 from 'p5'
import { useMissionStore } from '../stores/missionStore'
import AudioManager from '../audio/AudioManager'

export function TranslunarScene() {
  const ref = useRef()
  const { onTranslunar, onTransEarth, lunarDescent, lunarOrbit, reentry, setValues, startLunarOrbit, startReentry } = useMissionStore()

  useEffect(() => {
    if ((!onTranslunar && !onTransEarth) || lunarDescent || lunarOrbit || reentry) return

    const sketch = p => {
      // PHASE STATE
      // 0: SEPARATION (S-IVB separates from CSM)
      // 1: ROTATION (CSM rotates 180°)
      // 2: DOCKING (CSM docks with LM in SLA)
      // 3: EXTRACTION (CSM+LM extracts from S-IVB)
      // 4: COAST (3-day journey)
      let missionPhase = 0

      let csmAngle = 0
      let sivbPos
      let stars = []
      let coastProgress = 0
      let coastDay = 0
      let lastDayUpdate = 0

      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight)
        sivbPos = p.createVector(-300, 0)
        for (let i = 0; i < 400; i++) {
          stars.push({ x: p.random(p.width), y: p.random(p.height), sz: p.random(1, 3) })
        }

        const { lmDocked, onTranslunar } = useMissionStore.getState()
        if (lmDocked || !onTranslunar) {
          missionPhase = 4
        } else {
          missionPhase = 0
          AudioManager.playStageSep()
        }
      }

      p.draw = () => {
        const { timeWarp, lmDocked, setValues, startLunarOrbit, startReentry, onTranslunar, isFreeReturn } = useMissionStore.getState()

        p.background(0, 0, 5)

        // Stars
        let starSpeed = (missionPhase === 4) ? timeWarp * 0.5 : 0.1
        p.noStroke(); p.fill(255)
        stars.forEach(s => {
          s.x -= starSpeed
          if (s.x < 0) s.x = p.width
          p.circle(s.x, s.y, s.sz)
        })

        p.push()
        p.translate(p.width / 2, p.height / 2)

        drawBackgroundBodies(p, coastProgress, onTranslunar)

        if (missionPhase < 4) {
          drawTDE(p, missionPhase)
          handleTDEControls(p)
        } else {
          drawCoast(p, coastProgress, onTranslunar, lmDocked)
          handleCoastControls(p)
          if (onTranslunar && coastProgress <= 0.9) {
            coastProgress += 0.0003 * timeWarp
            // Track "days" of travel
            const dayProgress = coastProgress * 3 // 3-day journey
            if (Math.floor(dayProgress) > coastDay) {
              coastDay = Math.floor(dayProgress)
              if (coastDay === 1) setValues({ phase: 'Day 2 — Midcourse Correction' })
              if (coastDay === 2) setValues({ phase: 'Day 3 — Lunar Approach' })
            }

            if (coastProgress > 0.9) {
              setValues({ lunarApproach: true })
            }
          } else if (onTransEarth) {
            coastProgress += 0.0003 * timeWarp
          }
        }
        p.pop()

        // --- UI ---
        drawUI(p, missionPhase, coastProgress, onTranslunar)

        // --- DECISION POINT (Approaching Moon) ---
        // Now goes to LUNAR_ORBIT instead of directly to descent
        if (onTranslunar && coastProgress > 0.9 && missionPhase === 4) {
          p.push()
          p.fill(0, 0, 0, 230)
          p.rect(0, 0, p.width, p.height)
          p.textAlign(p.CENTER)
          p.fill(255); p.textSize(40); p.textStyle(p.BOLD)
          p.text("LUNAR APPROACH DETECTED", p.width / 2, p.height / 2 - 120)

          p.textSize(22); p.textStyle(p.NORMAL)
          p.fill(0, 255, 255)
          p.text("Apollo 11 is 400,000 km from Earth", p.width / 2, p.height / 2 - 70)

          p.textSize(26)
          p.fill(0, 255, 0)
          p.text("[ L ] — LUNAR ORBIT INSERTION (LOI BURN)", p.width / 2, p.height / 2 + 10)

          p.fill(255, 50, 50)
          p.text("[ F ] — FREE RETURN (ABORT TO EARTH)", p.width / 2, p.height / 2 + 60)

          p.fill(255, 200); p.textSize(16)
          p.text("\"Apollo 11, you are GO for LOI.\"", p.width / 2, p.height / 2 + 130)
          p.pop()
        } else if (onTransEarth && coastProgress >= 1.0) {
          startReentry()
        }
      }

      p.keyPressed = () => {
        const { startLunarOrbit, startFreeReturn, onTranslunar } = useMissionStore.getState()

        if (onTranslunar && coastProgress > 0.9 && missionPhase === 4) {
          if (p.key.toLowerCase() === 'l') {
            startLunarOrbit() // Go to lunar orbit first
          }
          if (p.key.toLowerCase() === 'f') {
            startFreeReturn()
          }
        }
      }

      // --- HELPERS ---
      function drawBackgroundBodies(p, progress, onTranslunar) {
        const { isFreeReturn } = useMissionStore.getState()
        let displayP = onTranslunar ? progress : 1 - progress

        let moonX, moonSize, moonRotation = 0
        let earthX, earthSize

        if (isFreeReturn && progress < 0.2) {
          let loopP = p.map(progress, 0, 0.2, 0, 1)
          moonX = p.map(loopP, 0, 1, p.width / 3, -p.width / 3)
          moonSize = p.map(p.sin(loopP * p.PI), 0, 1, 450, 650)
          moonRotation = p.map(loopP, 0, 1, 0, p.PI)
          earthX = -p.width / 2
          earthSize = 50
        } else {
          displayP = onTranslunar ? progress : 1 - progress
          earthX = -p.width / 3 - (displayP * 300)
          earthSize = p.map(displayP, 0, 1, 450, 80)
          moonX = p.width / 3 + ((1 - displayP) * 300)
          moonSize = p.map(displayP, 0, 1, 40, 500)
        }

        // --- EARTH ---
        p.push()
        p.translate(earthX, 0)
        for (let i = 1; i < 4; i++) {
          p.fill(30, 100, 255, 60 / i)
          p.circle(0, 0, earthSize + i * 15)
        }
        p.fill(20, 60, 180)
        p.noStroke()
        p.circle(0, 0, earthSize)
        p.fill(40, 120, 60, 100)
        p.rotate(p.frameCount * 0.001)
        p.circle(earthSize * 0.2, -earthSize * 0.2, earthSize * 0.4)
        p.rect(-earthSize * 0.3, earthSize * 0.1, earthSize * 0.5, earthSize * 0.3, 10)
        p.pop()

        // --- MOON ---
        p.push()
        p.translate(moonX, 0)
        p.rotate(moonRotation)
        p.fill(200)
        p.circle(0, 0, moonSize)
        p.fill(150, 150)
        p.circle(-moonSize * 0.2, -moonSize * 0.1, moonSize * 0.15)
        p.circle(moonSize * 0.1, moonSize * 0.3, moonSize * 0.1)
        if (moonRotation > 1) {
          p.fill(120, 180)
          p.circle(moonSize * 0.3, -moonSize * 0.2, moonSize * 0.2)
          p.circle(-moonSize * 0.1, moonSize * 0.4, moonSize * 0.12)
        }
        p.pop()

        // --- TRAJECTORY LINE (dotted) ---
        if (missionPhase === 4) {
          p.stroke(0, 255, 0, 40)
          p.strokeWeight(1)
          for (let i = 0; i < 20; i++) {
            const t = i / 20
            const lx = p.lerp(earthX, moonX, t)
            const ly = p.sin(t * p.PI) * -50
            p.point(lx, ly)
          }
          p.noStroke()
        }
      }

      function drawTDE(p, phase) {
        p.push()
        if (phase === 0) {
          sivbPos.x -= 0.5
          if (sivbPos.x < -400) { missionPhase = 1; AudioManager.playClick() }
        }
        p.translate(sivbPos.x, sivbPos.y)
        // S-IVB
        p.fill(200); p.noStroke(); p.rect(-60, -30, 120, 60)
        p.fill(30); p.rect(40, -30, 20, 60)
        p.fill(255, 215, 0); p.rect(60, -20, 30, 40)
        p.fill(220); p.triangle(60, -30, 100, -60, 60, -20)
        p.triangle(60, 30, 100, 60, 60, 20)
        p.pop()

        p.push()
        p.rotate(csmAngle)
        p.fill(180); p.rect(-20, -15, 40, 30)
        p.fill(220); p.triangle(20, -15, 40, 0, 20, 15)
        p.rect(-22, -15, 2, 30)
        p.fill(50); p.triangle(-22, -10, -35, -15, -35, 15)
        p.stroke(100); p.line(40, 0, 50, 0); p.noStroke()
        p.pop()
      }

      function handleTDEControls(p) {
        if (missionPhase === 1) {
          if (p.keyIsDown(p.LEFT_ARROW)) csmAngle -= 0.03
          if (p.keyIsDown(p.RIGHT_ARROW)) csmAngle += 0.03
          let diff = Math.abs(Math.abs(csmAngle) - p.PI)
          if (diff < 0.2) missionPhase = 2
        }
        if (missionPhase === 2) {
          if (p.keyIsDown(p.LEFT_ARROW)) csmAngle -= 0.01
          if (p.keyIsDown(p.RIGHT_ARROW)) csmAngle += 0.01

          let dist = Math.abs((sivbPos.x + 90) - 50)
          p.textAlign(p.CENTER)
          p.fill(0, 255, 0); p.text("DISTANCE: " + dist.toFixed(1) + " M", p.width / 2, p.height - 130)

          if (p.keyIsDown(p.UP_ARROW)) {
            sivbPos.x += 4.0

            p.push()
            p.rotate(csmAngle)
            p.noStroke(); p.fill(255, 100, 0, 150)
            p.triangle(-22, -5, -22, 5, -80, 0)
            p.pop()

            if (dist < 15) {
              missionPhase = 3;
              AudioManager.playDock()
            }
          }
        }
        if (missionPhase === 3) {
          sivbPos.x += 1
          coastProgress = 0
          setValues({ lmDocked: true })
          setTimeout(() => { missionPhase = 4 }, 2000)
        }
      }

      function handleCoastControls(p) {
        if (p.keyIsDown(p.LEFT_ARROW)) csmAngle -= 0.01
        if (p.keyIsDown(p.RIGHT_ARROW)) csmAngle += 0.01
      }

      function drawCoast(p, progress, onTranslunar, lmDocked) {
        p.push()
        // Gentle floating motion
        p.translate(0, p.sin(p.frameCount * 0.01) * 10)
        p.rotate(csmAngle)

        // CSM body
        p.noStroke(); p.fill(180); p.rect(-30, -20, 60, 40)
        p.fill(220); p.triangle(30, -20, 50, 0, 30, 20)

        // SM details (RCS quads)
        p.fill(150)
        p.rect(-32, -15, 4, 8)
        p.rect(-32, 8, 4, 8)

        if (lmDocked) {
          // LM with more detail
          p.fill(255, 215, 0); p.rect(50, -25, 40, 50)
          p.fill(200); p.rect(90, -15, 30, 30)
          // LM legs (folded)
          p.stroke(180, 150, 30); p.strokeWeight(2)
          p.line(55, -25, 50, -35)
          p.line(55, 25, 50, 35)
          p.noStroke()
        }
        p.pop()

        // Passive Thermal Control (barbecue roll visualization)
        if (missionPhase === 4 && onTranslunar) {
          const rollAngle = p.frameCount * 0.005
          p.fill(255, 255, 200, 20 + p.sin(rollAngle) * 15)
          p.noStroke()
          p.circle(p.sin(rollAngle) * 5, p.cos(rollAngle) * 80, 4)
        }
      }

      function drawUI(p, phase, coastP, onT) {
        p.textAlign(p.CENTER); p.fill(0, 255, 0); p.textSize(16)
        if (phase < 4) {
          p.text("TRANSPOSITION, DOCKING & EXTRACTION", p.width / 2, 50)
          if (phase === 0) p.text("S-IVB SEPARATING...", p.width / 2, p.height - 100)
          if (phase === 1) {
            p.text("ROTATE CSM 180° TO FACE LEM — USE [←/→]", p.width / 2, p.height - 100)
            p.fill(255, 200, 0)
            p.textSize(13)
            p.text("\"Houston, we are performing transposition...\"", p.width / 2, p.height - 75)
          }
          if (phase === 2) {
            p.text("APPROACH LEM — PRESS [↑] TO DOCK", p.width / 2, p.height - 100)
            p.fill(0, 255, 255); p.textSize(13)
            p.text("\"Moving in for docking. Easy does it.\"", p.width / 2, p.height - 75)
          }
          if (phase === 3) {
            p.text("DOCKING CONFIRMED — EXTRACTING LEM FROM S-IVB...", p.width / 2, p.height - 100)
            p.fill(0, 255, 0); p.textSize(13)
            p.text("\"We have a good dock. Extracting Eagle.\"", p.width / 2, p.height - 75)
          }
        } else {
          const label = onT ? "TRANS-LUNAR COAST" : "TRANS-EARTH COAST"
          p.text(label, p.width / 2, 40)

          const distToTarget = (1 - coastP) * 384400
          p.textSize(14)
          p.text(`DISTANCE TO ${onT ? 'MOON' : 'EARTH'}: ${distToTarget.toFixed(0)} KM`, p.width / 2, 65)

          // Travel day indicator
          if (onT) {
            const dayNum = Math.floor(coastP * 3) + 1
            p.fill(0, 255, 255)
            p.textSize(13)
            p.text(`MISSION DAY ${dayNum} OF 3 — ${onT ? 'Outbound' : 'Return'}`, p.width / 2, 90)

            // Progress bar
            p.noFill()
            p.stroke(0, 255, 0, 80)
            p.strokeWeight(1)
            p.rect(p.width / 2 - 100, 100, 200, 8, 3)
            p.noStroke()
            p.fill(0, 255, 0, 180)
            p.rect(p.width / 2 - 98, 102, Math.min(196, coastP / 0.95 * 196), 4, 2)
          }
        }
      }
    }
    const instance = new p5(sketch, ref.current)
    return () => instance.remove()
  }, [onTranslunar, onTransEarth, lunarDescent, lunarOrbit, reentry])

  return (onTranslunar || onTransEarth) && !lunarDescent && !lunarOrbit && !reentry ? (
    <div ref={ref} style={{ position: 'absolute', inset: 0, zIndex: 10 }} />
  ) : null
}