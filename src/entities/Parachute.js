export class Parachute {
  constructor(x, y) {
    this.x = x
    this.y = y
  }

  update() {
    this.y += 1
  }

  draw(p, capsuleX, capsuleY) {
    p.fill(255, 100, 100)
    p.circle(this.x, this.y, 120)

    p.stroke(255)
    p.line(
      this.x,
      this.y + 60,
      capsuleX + (this.x - capsuleX),
      capsuleY
    )
  }
}
