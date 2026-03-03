export class Spacecraft {
    constructor(p) {
        this.p = p
        this.x = 0
        this.y = 0
        this.angle = 0
    }

    draw(throttle, x, y, rotation) {
        const p = this.p
        p.push()
        if (x !== undefined && y !== undefined) p.translate(x, y)
        else p.translate(this.x, this.y)

        if (rotation !== undefined) p.rotate(rotation)
        else p.rotate(this.angle)

        p.scale(0.8)

        // SERVICE MODULE
        p.noStroke()
        p.fill(200)
        p.rect(-30, -25, 60, 50)
        // Engine Bell (Left side if pointing Right)
        p.fill(50)
        p.triangle(-30, -15, -50, -25, -50, 25)

        // COMMAND MODULE
        p.fill(220)
        p.triangle(30, -25, 60, 0, 30, 25)

        // Window
        p.fill(30, 40, 60)
        p.ellipse(40, -10, 8, 5)

        // SPS Engine Flame
        if (throttle > 0.1) {
            p.push()
            p.translate(-50, 0)
            p.fill(255, 100, 0, 200)
            p.triangle(0, -10, 0, 10, -throttle * 40, 0) // Flame pointing Left (thrust Right)
            p.pop()
        }

        p.pop()
    }
}
