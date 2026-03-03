export class PlasmaParticle {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.life = 30
  }

  update() {
    this.y += Math.random() * 10 + 5
    this.life -= 1
  }

  draw(p) {
    p.fill(255, Math.random() * 100 + 50, 0, this.life * 8)
    p.noStroke()
    p.circle(this.x, this.y, this.life)
  }

  get dead() {
    return this.life <= 0
  }
}
