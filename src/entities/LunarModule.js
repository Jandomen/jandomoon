// src/entities/LunarModule.js
export class LunarModule {
  constructor(p) {
    this.p = p
    this.altitude = 15000
    this.x = 0 // Will be set by scene
    this.y = 0 // Will be set by scene
  }

  // Draw at the given absolute (x, y) position on the canvas
  // If x/y not supplied, falls back to this.x and p.height/2
  draw(throttle, isAscentOnly = false, drawX = null, drawY = null) {
    const p = this.p
    const px = drawX !== null ? drawX : this.x
    const py = drawY !== null ? drawY : p.height / 2

    p.push()
    p.translate(px, py)

    // --- DESCENT STAGE ---
    if (!isAscentOnly) {
      p.noStroke()
      p.fill(180, 150, 40)
      p.beginShape()
      p.vertex(-30, 0); p.vertex(30, 0); p.vertex(45, 20); p.vertex(45, 50)
      p.vertex(30, 70); p.vertex(-30, 70); p.vertex(-45, 50); p.vertex(-45, 20)
      p.endShape(p.CLOSE)

      // Cross-brace
      p.stroke(100, 80, 20); p.strokeWeight(2)
      p.line(-45, 35, 45, 35)

      // Landing legs
      p.stroke(150); p.strokeWeight(4)
      p.line(-35, 50, -60, 90)
      p.fill(100); p.noStroke(); p.ellipse(-60, 95, 20, 5)
      p.line(35, 50, 60, 90)
      p.ellipse(60, 95, 20, 5)
    }

    // --- ASCENT STAGE ---
    p.push()
    if (isAscentOnly) {
      // When drawing ascent stage only, shift up slightly
      p.translate(0, -10)
    }
    p.noStroke()
    // Gold mylar foil body
    p.fill(220, 210, 155)
    p.rect(-25, -50, 50, 50, 5)
    // Dark top section
    p.fill(180, 175, 140)
    p.rect(-20, -65, 40, 17, 3)

    // Windows
    p.fill(30, 40, 60)
    p.triangle(-20, -42, -5, -42, -14, -22)
    p.triangle(20, -42, 5, -42, 14, -22)

    // EVA hatch
    p.fill(150, 145, 110)
    p.rect(-10, -22, 20, 18, 2)
    p.fill(80); p.circle(0, -13, 5)

    // RCS Thrusters (4 corners)
    p.fill(60); p.noStroke()
    for (let i = 0; i < 4; i++) {
      const tx = i < 2 ? -28 : 28
      const ty = i % 2 === 0 ? -42 : -12
      p.circle(tx, ty, 6)
      p.stroke(100); p.strokeWeight(1)
      p.line(tx, ty, i < 2 ? -38 : 38, ty)
      p.noStroke()
    }

    // Antenna
    p.stroke(180); p.strokeWeight(1.5)
    p.line(0, -65, 0, -90)
    p.line(0, -90, 12, -102)
    p.fill(180); p.noStroke(); p.circle(12, -102, 5)

    // ENGINE PLUME
    if (throttle > 0.05) {
      p.push()
      p.translate(0, isAscentOnly ? 8 : 80)
      p.noStroke()
      const fireAlpha = p.random(160, 255)
      for (let i = 0; i < 6; i++) {
        p.fill(255, 120 + i * 20, 0, fireAlpha / (i + 1))
        const w = 18 - i * 2
        const h = throttle * 120 / (i + 1)
        p.ellipse(0, h / 2, w, h)
      }
      // Bright hot core
      p.fill(255, 255, 200, 120)
      p.ellipse(0, 4, 8, throttle * 30)
      p.pop()
    }
    p.pop()

    p.pop()
  }
}