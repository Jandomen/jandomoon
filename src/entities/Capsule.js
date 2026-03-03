export class Capsule {
  constructor() {
    this.x = window.innerWidth / 2
    this.y = -200
    this.vy = 0
  }

  update(dt) {
    this.vy += 20 * dt
    this.y += this.vy
  }

  draw(p) {
    p.push()
    p.translate(this.x, this.y)
    p.fill(200)
    p.ellipse(0, 0, 80, 100)

    // escudo térmico
    p.fill(100)
    p.ellipse(0, 40, 80, 40)
    p.pop()
  }
}
