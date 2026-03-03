export class LunarModuleAscent {
  constructor() {
    this.alt = 0
    this.y = 0
  }

  update(dt) {
    this.alt += 50 * dt
    this.y = window.innerHeight - 300 - this.alt * 5
  }

  draw(p, throttle) {
    p.push()
    p.translate(p.width/2, this.y)
    p.fill(220)
    p.rect(-20, -50, 40, 100)

    // llama
    p.fill(255, 150, 0)
    p.triangle(-25, 50, 25, 50, 0, 100 + throttle * 60)
    p.pop()
  }
}
