// src/systems/Camera2D.js  → JavaScript real, sin TypeScript

class Camera2D {
  constructor(p) {
    this.p = p;                    // instancia de p5
    this.offsetX = 0;
    this.offsetY = 0;
    this.zoom = 1;
    this.mode = 'external';        // 'external', 'follow', 'cockpit', 'surface'
    this.target = null;
  }

  // Seguir a un objeto (Saturn V, LM, cápsula...)
  follow(target) {
    this.mode = 'follow';
    this.target = target;
  }

  // Vista exterior normal (por defecto)
  external() {
    this.mode = 'external';
    this.target = null;
  }

  // Vista desde el interior del CSM (simulado)
  cockpit() {
    this.mode = 'cockpit';
  }

  // Vista desde la superficie lunar → Earthrise icónico
  surface() {
    this.mode = 'surface';
    this.offsetY = this.p.height - 300;  // pegado al suelo lunar
    this.zoom = 0.8;
  }

  // Aplicar la cámara en cada frame
  apply() {
    this.p.push();
    
    if (this.mode === 'follow' && this.target) {
      this.offsetX = this.p.width / 2 - this.target.x;
      this.offsetY = this.p.height / 2 - this.target.y;
    } else if (this.mode === 'cockpit') {
      // Simula ventana del CSM: marco negro + estrellas
      this.p.fill(0, 0, 0, 200);
      this.p.rect(0, 0, this.p.width, this.p.height);
      this.p.stroke(0, 255, 0);
      this.p.noFill();
      this.p.rect(100, 100, this.p.width - 200, this.p.height - 200, 20);
      this.offsetX = 0;
      this.offsetY = 0;
    } else if (this.mode === 'surface') {
      // Earthrise: Tierra subiendo en el horizonte lunar
      this.p.translate(this.offsetX, this.offsetY);
      this.p.scale(this.zoom);
    } else {
      this.offsetX = 0;
      this.offsetY = 0;
    }

    this.p.translate(this.offsetX, this.offsetY);
    this.p.scale(this.zoom);
  }

  // Restaurar (siempre llamar después de dibujar)
  reset() {
    this.p.pop();
  }

  // Cambiar modo con tecla
  toggle() {
    const modes = ['external', 'follow', 'cockpit', 'surface'];
    const i = modes.indexOf(this.mode);
    this.mode = modes[(i + 1) % modes.length];
  }
}

export default Camera2D;