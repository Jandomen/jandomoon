// src/scenes/LunarSurfaceScene.jsx
import { useEffect, useRef } from 'react'
import p5 from 'p5'
import { useMissionStore } from '../stores/missionStore'
import AudioManager from '../audio/AudioManager'

export function LunarSurfaceScene() {
  const ref = useRef()
  const { landed, ascent, startAscent, cameraMode } = useMissionStore()

  useEffect(() => {
    if (!landed || ascent) return

    const sketch = p => {
      let armstrongX
      let flagWave = 0
      let footprints = []
      let stars = []

      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight)
        armstrongX = p.width / 3
        for (let i = 0; i < 300; i++) stars.push({ x: p.random(p.width), y: p.random(p.height), sz: p.random(1, 2) })
      }

      p.draw = () => {
        p.background(0)

        // Estrellas
        p.noStroke()
        p.fill(255)
        stars.forEach(s => p.circle(s.x, s.y, s.sz))

        // EARTHRISE (Tierra azul en el horizonte negro)
        p.push()
        p.translate(p.width * 0.8, p.height * 0.25)
        // Brillo
        for (let i = 5; i > 0; i--) {
          p.fill(50, 100, 255, 30 / i)
          p.circle(0, 0, 100 + i * 10)
        }
        p.fill(20, 60, 180)
        p.circle(0, 0, 100)
        p.fill(255, 150)
        p.arc(0, 0, 100, 100, p.PI + p.HALF_PI, p.HALF_PI)
        p.pop()

        // SUPERFICIE LUNAR
        p.noStroke()
        const surfaceY = p.height - 180
        // Gradiente de superficie
        for (let i = 0; i < 180; i++) {
          p.fill(160 - i * 0.4)
          p.rect(0, surfaceY + i, p.width, 1)
        }

        // Cráteres
        p.fill(80, 150)
        p.circle(200, surfaceY + 50, 80)
        p.circle(p.width - 300, surfaceY + 120, 120)
        p.circle(p.width / 2 + 100, surfaceY + 30, 40)

        // LUNAR MODULE (Módulo de Descenso)
        p.push()
        p.translate(p.width / 2, surfaceY)

        // Patas (doradas)
        p.stroke(180, 150, 40)
        p.strokeWeight(5)
        p.line(-40, 0, -80, 60)
        p.line(40, 0, 80, 60)
        p.fill(100)
        p.noStroke()
        p.ellipse(-80, 65, 30, 8)
        p.ellipse(80, 65, 30, 8)

        // Etapa de descenso (dorada)
        p.fill(180, 150, 40)
        p.rect(-45, -50, 90, 50, 2)
        p.fill(200) // Etapa de ascenso
        p.rect(-30, -110, 60, 60, 5)
        p.fill(30, 40, 60) // Ventana
        p.triangle(-20, -100, -5, -100, -15, -85)
        p.pop()

        // BANDERA
        p.push()
        p.translate(p.width / 2 + 150, surfaceY + 20)
        flagWave += 0.04
        p.stroke(240)
        p.strokeWeight(3)
        p.line(0, 0, 0, -100) // Asta
        p.line(0, -100, 60, -100) // Barra horizontal

        // Bandera de México (Verde, Blanco, Rojo) con onda
        p.noStroke()
        for (let i = 0; i < 60; i++) {
          const wave = p.sin(flagWave + i * 0.15) * 3
          // Colores de la bandera mexicana
          let col
          if (i < 20) col = [0, 104, 71] // Verde
          else if (i < 40) col = [255, 255, 255] // Blanco
          else col = [206, 17, 38] // Rojo

          p.fill(col[0], col[1], col[2])
          p.rect(i, -100 + wave, 1, 50)

          // Escudo (Escudo simplificado en la franja blanca)
          if (i >= 28 && i <= 32) {
            p.fill(101, 67, 33) // Café/Dorado simplificado
            p.circle(i, -75 + wave, 4)
          }
        }
        p.pop()

        // ASTRONAUTA (Armstrong)
        armstrongX += 0.2
        if (armstrongX > p.width / 2 + 300) armstrongX = p.width / 4

        p.push()
        p.translate(armstrongX, surfaceY + 40)
        const walkY = p.sin(p.frameCount * 0.1) * 5
        p.translate(0, walkY)

        // Cuerpo
        p.fill(240)
        p.rect(-12, -45, 24, 45, 5)
        // Casco
        p.fill(255)
        p.circle(0, -55, 22)
        p.fill(255, 200, 0) // Visor
        p.arc(0, -55, 18, 14, 0, p.PI)
        p.pop()

        // HUELLAS
        if (p.frameCount % 40 === 0) {
          footprints.push({ x: armstrongX, y: surfaceY + 80, life: 1000 })
        }
        footprints = footprints.filter(f => {
          f.life--
          p.fill(60, p.map(f.life, 0, 1000, 0, 255))
          p.ellipse(f.x, f.y, 10, 6)
          return f.life > 0
        })

        // TEXTO
        p.fill(0, 255, 0)
        p.textAlign(p.CENTER)
        p.textSize(32)
        p.text("THE EAGLE HAS LANDED", p.width / 2, 80)
        p.textSize(18)
        p.fill(255, 180)
        p.text("'That's one small step for man, one giant leap for mankind.'", p.width / 2, 120)

        // INSTRUCCIONES
        p.fill(0, 255, 255)
        p.textSize(20)
        p.text("PRESIONA 'E' PARA EXPLORAR LA LUNA", p.width / 2, p.height - 80)
        p.text("PRESIONA 'L' PARA TRANSMISIÓN DE ASCENSO LUNAR", p.width / 2, p.height - 40)
      }

      p.keyPressed = () => {
        if (p.key === 'e' || p.key === 'E') {
          useMissionStore.getState().startExploration()
        }
        // Soporte para 'L' o Barra Espaciadora (32) para despegar
        if (p.key === 'l' || p.key === 'L' || p.keyCode === 32) {
          const s = useMissionStore.getState()
          if (s.ascent || s.currentScene !== 'LUNAR_SURFACE') return // No disparar dos veces
          s.startAscent()
        }
      }

      p.windowResized = () => p.resizeCanvas(p.windowWidth, p.windowHeight)
    }

    const instance = new p5(sketch, ref.current)
    return () => instance.remove()
  }, [landed, ascent])

  return landed && !ascent ? <div ref={ref} style={{ position: 'absolute', inset: 0, zIndex: 5 }} /> : null
}