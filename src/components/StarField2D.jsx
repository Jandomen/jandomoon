// src/components/StarField2D.jsx
import { useEffect, useRef } from 'react'
import p5 from 'p5'
import { useMissionStore } from '../stores/missionStore'

export function StarField2D() {
  const ref = useRef()
  const { isDaySide } = useMissionStore()

  useEffect(() => {
    const sketch = p => {
      let stars = []
      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight)
        for (let i = 0; i < 800; i++) stars.push({ x: p.random(p.width), y: p.random(p.height), s: p.random(0.5, 2), a: p.random(100, 255) })
      }
      p.draw = () => {
        // Fondo dinámico (Solo azul en la Tierra, negro en la Luna)
        const { isDaySide, landed, ascent, lunarDescent, onTranslunar, onTransEarth, isExploring } = useMissionStore.getState()
        const isNearMoon = landed || ascent || lunarDescent || isExploring
        const inDeepSpace = onTranslunar || onTransEarth

        if (isDaySide && !isNearMoon && !inDeepSpace) {
          p.background(20, 30, 60) // Azul Tierra
        } else {
          p.background(0) // Espacio profundo o Luna
        }

        p.noStroke()
        stars.forEach(s => {
          // Las estrellas se ven menos en el lado del día de la Tierra
          const alpha = (isDaySide && !isNearMoon && !inDeepSpace) ? s.a * 0.1 : s.a
          p.fill(255, alpha)
          p.circle(s.x, s.y, s.s)

          if (!isDaySide && p.random() > 0.99) s.a = p.random(100, 255) // Centelleo
        })

        // Brillo solar masivo (Solo en la atmósfera terrestre)
        if (isDaySide && !isNearMoon && !inDeepSpace) {
          p.noFill()
          for (let i = 0; i < 10; i++) {
            p.fill(255, 255, 200, 20 - i * 2)
            p.circle(p.width * 0.8, p.height * 0.2, 100 + i * 50)
          }
        }
      }

      p.windowResized = () => p.resizeCanvas(p.windowWidth, p.windowHeight)
    }
    p5.disableFriendlyErrors = true;
    const instance = new p5(sketch, ref.current)
    return () => instance.remove()
  }, [])

  return <div ref={ref} style={{ position: 'fixed', top: 0, left: 0, zIndex: 0 }} />
}