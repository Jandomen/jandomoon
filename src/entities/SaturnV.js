// src/entities/SaturnV.js
export class SaturnV {
  constructor(p) {
    this.p = p
    this.x = p.width / 2
  }

  draw(altitude = 0, currentStage = 0, abortOffset = 0, boosterRotation = 0) {
    const p = this.p
    const rocketScale = 1

    // --- GRUPO 1: BOOSTER Y SERVICE MODULE (Se quedan atrás en aborto) ---
    p.push()
    // Si hay aborto, el booster se queda 'abortOffset' más abajo que la cápsula
    p.translate(this.x, p.height - 150 - (altitude * rocketScale) + abortOffset)

    // Rotación específica del booster si pierde el control
    if (boosterRotation !== 0) {
      p.rotate(boosterRotation)
    }

    p.noStroke()

    // --- ETAPA 1: S-IC ---
    if (currentStage === 0) {
      p.fill(245)
      p.rect(-25, 0, 50, 150)
      // Marcas negras verticales y bandas (A estética Apollo)
      p.fill(20)
      p.rect(-25, 20, 50, 15) // Banda superior
      p.rect(-25, 120, 50, 30) // Banda inferior
      p.rect(-5, 35, 10, 85)   // Línea central

      // Aletas (Fins)
      p.fill(240)
      p.beginShape()
      p.vertex(-25, 120); p.vertex(-45, 150); p.vertex(-25, 150)
      p.endShape(p.CLOSE)
      p.beginShape()
      p.vertex(25, 120); p.vertex(45, 150); p.vertex(25, 150)
      p.endShape(p.CLOSE)
    }

    // --- ETAPA 2: S-II ---
    if (currentStage <= 1) {
      p.fill(255)
      p.rect(-22, -100, 44, 100)
      p.fill(20); p.rect(-22, -95, 44, 15) // Banda negra superior S-II
      p.fill(180); p.rect(-22, -10, 44, 10) // Anillo interetapa
    }

    // --- ETAPA 3: S-IVB ---
    if (currentStage <= 2) {
      p.fill(250)
      p.rect(-20, -160, 40, 60)
      p.fill(20); p.rect(-20, -155, 40, 5) // Detalle unión superior
    }

    // --- APOLLO SERVICE MODULE (Módulo de Servicio) ---
    p.fill(230)
    p.rect(-20, -188, 40, 28)
    // Detalle RCS en el CSM
    p.fill(50)
    p.circle(-18, -178, 4); p.circle(18, -178, 4); p.circle(0, -178, 4)

    p.pop()


    // --- GRUPO 2: COMMAND MODULE + LES (Se van volando en aborto) ---
    p.push()
    // La cápsula sigue la altitud "real" (la cámara la sigue a ella)
    p.translate(this.x, p.height - 150 - (altitude * rocketScale))

    // Command Module (La Punta/Cápsula)
    p.fill(255) // Blanco brillante
    p.beginShape()
    p.vertex(-20, -188) // Base izquierda (coincide con SM)
    p.vertex(20, -188)  // Base derecha
    p.vertex(0, -215)   // Punta superior
    p.endShape(p.CLOSE)

    // Ventana de la cápsula
    p.fill(30, 40, 60)
    p.ellipse(0, -198, 8, 5)

    // --- TORRE DE ESCAPE (LES) ---
    // Solo visible en el lanzamiento inicial y si no se ha separado (pero en aborto se usa)
    // El LES se va con la cápsula.
    // Si la altitud es muy alta sin aborto, se soltaría (Jettison), pero aquí simplificamos:
    // Si hay aborto, el LES ESTÁ ahí y jalando.
    // Si no hay aborto y estamos muy alto, p.e. > 100km, ya no debería estar.

    // Mostramos LES si hay aborto OR si estamos bajos (<90km)
    if (abortOffset > 0 || altitude < 90000) {
      p.stroke(180); p.strokeWeight(1.5)
      p.line(0, -215, 0, -270) // Estructura torre principal
      p.noStroke()

      // Motor del LES
      p.fill(230)
      p.rect(-3, -275, 6, 20, 2)

      // Punta del LES (Q-ball)
      p.fill(200, 50, 50)
      p.triangle(-3, -275, 3, -275, 0, -285)

      // Fuego del motor de escape (Solo si hay aborto activo y reciente)
      // Usaremos una prop visual simple aquí si abortOffset > 0
      if (abortOffset > 0) {
        p.push()
        p.translate(0, -265) // Base del motor de escape
        p.fill(255, 100, 0, 200)
        p.noStroke()
        // Chorros de escape hacia abajo/lados
        p.triangle(-2, 0, -15, 40, -5, 10)
        p.triangle(2, 0, 15, 40, 5, 10)
        p.pop()
      }
    }

    p.pop()
  }
}
