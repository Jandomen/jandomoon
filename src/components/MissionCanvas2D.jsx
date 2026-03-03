import { useEffect, useRef } from 'react'
import p5 from 'p5'
import { useMissionStore } from '../stores/missionStore'
import { AudioManager } from '../audio/AudioManager'

import { LunarModuleAscent } from '../entities/LunarModuleAscent'
import { Capsule } from '../entities/Capsule'
import { PlasmaParticle } from '../entities/PlasmaParticle'
import { Parachute } from '../entities/Parachute'

export function MissionCanvas2D() {
  const ref = useRef()

  useEffect(() => {
    const sketch = p => {
      let lm
      let capsule
      let plasma = []
      let parachutes = []
      let earth, moon

      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight)

        lm = new LunarModuleAscent()
        capsule = new Capsule()

        earth = { x: p.width / 2, y: p.height + 1000, r: 600 }
        moon = { x: p.width / 2, y: p.height / 2, r: 200 }
      }

      p.draw = () => {
        const state = useMissionStore.getState()
        const dt = 1 / 60

        p.background(0)


        if (state.ascent && !state.docked) {
          lm.update(dt)


          p.fill('#aaa')
          p.circle(p.width / 2, p.height + 300, 2000)

          lm.draw(p, state.throttle)

          if (lm.alt > 120) {
            state.dockSuccess()
            AudioManager.playStageSep()
          }
        }

        // ========== VIAJE DE REGRESO ==========
        if (state.onTransEarth) {
          const progress = p.frameCount * 0.0003
          earth.r = p.lerp(80, 700, progress)

          p.fill('#2288ff')
          p.circle(earth.x, earth.y, earth.r * 2)

          p.fill(255)
          p.rect(p.width / 2 - 30, p.height / 2 - 50, 60, 80)

          if (progress > 0.95) state.startReentry()
        }


        if (state.reentry && !state.splashed) {
          capsule.update(dt)
          capsule.draw(p)


          for (let i = 0; i < 10; i++) {
            plasma.push(new PlasmaParticle(
              capsule.x + p.random(-60, 60),
              capsule.y + 60
            ))
          }

          plasma = plasma.filter(pt => {
            pt.update()
            pt.draw(p)
            return !pt.dead
          })


          if (capsule.y > p.height - 400 && parachutes.length === 0) {
            AudioManager.playStageSep()
            for (let i = 0; i < 3; i++) {
              parachutes.push(new Parachute(
                capsule.x + (i - 1) * 60,
                capsule.y - 100
              ))
            }
          }

          parachutes.forEach(ch => {
            ch.update()
            ch.draw(p, capsule.x, capsule.y)
          })


          if (capsule.y > p.height - 50) {
            state.splashdown()

            p.background(0, 100, 200)
            p.fill(0, 150, 255)
            p.rect(0, p.height / 2, p.width, p.height)

            p.fill(255)
            p.textSize(48)
            p.textAlign(p.CENTER, p.CENTER)
            p.text("SPLASHDOWN!", p.width / 2, p.height / 2 - 100)
          }
        }


        p.fill(0, 255, 0)
        p.textSize(28)
        p.textAlign(p.CENTER)
        p.text(state.phase, p.width / 2, 60)

      }
    }

    const instance = new p5(sketch, ref.current)
    return () => instance.remove()
  }, [])

  return <div ref={ref} style={{ position: 'absolute', top: 0, left: 0 }} />
}
