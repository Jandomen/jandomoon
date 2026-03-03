import { useEffect, useRef } from 'react'
import p5 from 'p5'
import { useMissionStore } from '../stores/missionStore'
import AudioManager from '../audio/AudioManager'

export function KSCExplorationScene() {
    const ref = useRef()
    const { currentScene } = useMissionStore()

    useEffect(() => {
        if (currentScene !== 'KSC_EXPLORATION') return
        const sketch = p => {
            const PH = 6, PH_TOP = 98
            let focal = 0
            let px = 0, pz = -300, pa = 0, pitch = 0
            const SPD = 3.2, ROT = 0.042
            let floor = 0, inElev = false, elevT = 0
            let bob = 0, mov = false, stepC = 0
            let near = null, msg = '', msgT = 0, day = true
            const TW = { x: 35, z: 0 }
            const PAD_R = 75, CW = 22
            const SP = []

            p.setup = () => {
                p.createCanvas(p.windowWidth, p.windowHeight)
                p.noSmooth(); focal = p.width * 0.7
                day = useMissionStore.getState().launchDay !== false
                SP.push(
                    { x: 0, z: 0, t: 'sat', h: 110, w: 12 },
                    { x: 35, z: 0, t: 'tow', h: 110, w: 18 },
                    { x: 15, z: 0, t: 'mlp', h: 8, w: 55 },
                    { x: -400, z: 500, t: 'vab', h: 160, w: 120 },
                    { x: 48, z: -15, t: 'flg', h: 12, w: 7 },
                    { x: -55, z: -90, t: 'trk', h: 5, w: 11 },
                    { x: 65, z: -140, t: 'trk', h: 5, w: 11 },
                    { x: -85, z: -45, t: 'sgn', h: 8, w: 10 },
                    { x: 85, z: -45, t: 'sgn', h: 8, w: 10 },
                    { x: -110, z: -190, t: 'plm', h: 14, w: 5 },
                    { x: 90, z: -230, t: 'plm', h: 14, w: 5 },
                    { x: -75, z: -280, t: 'plm', h: 14, w: 5 },
                    { x: 140, z: -170, t: 'plm', h: 14, w: 5 },
                    { x: -140, z: -330, t: 'plm', h: 14, w: 5 },
                    { x: 35, z: -190, t: 'ftk', h: 6, w: 13 },
                    { x: -45, z: -180, t: 'bnk', h: 5, w: 18 },
                    { x: 15, z: -260, t: 'van', h: 5, w: 9 },

                )
                AudioManager.startAmbient('launch')

            }

            function proj(wx, wz, wy = 0) {
                const dx = wx - px, dz = wz - pz
                const ca = Math.cos(pa), sa = Math.sin(pa)
                const vx = dx * ca + dz * sa, vz = -dx * sa + dz * ca
                if (vz < 1) return null
                const eyeH = floor === 1 ? PH_TOP : PH
                const eh = wy - eyeH  // Object height relative to eye: positive = above us, negative = below
                return { x: p.width / 2 + vx * focal / vz, y: p.height / 2 - (eh * focal / vz) + pitch * focal * 0.01, s: focal / vz, d: vz }
            }

            function gCol(wx, wz, dist) {
                const dP = Math.sqrt(wx * wx + wz * wz)
                const onC = Math.abs(wx) < CW && wz < 10 && wz > -500
                const fog = Math.min(1, dist / 700)
                let r, g, b
                if (dP < PAD_R) { r = 168; g = 163; b = 153 }
                else if (onC) { r = 152; g = 148; b = 138; if (Math.abs(wx) < 2) { r = 225; g = 215; b = 45 } }
                else { const n = (((wx * 7 + wz * 13) % 20) + 20) % 20 / 20; r = 75 + n * 28; g = 105 + n * 22; b = 52 + n * 14 }
                const fr = day ? 178 : 14, fg = day ? 198 : 14, fb = day ? 218 : 18
                return [r * (1 - fog) + fr * fog, g * (1 - fog) + fg * fog, b * (1 - fog) + fb * fog]
            }

            p.draw = () => {
                day = useMissionStore.getState().launchDay !== false
                p.background(0)
                mov = false
                if (!inElev) {
                    // Rotation — LEFT turns left, RIGHT turns right (corrected)
                    if (p.keyIsDown(p.LEFT_ARROW)) pa += ROT
                    if (p.keyIsDown(p.RIGHT_ARROW)) pa -= ROT
                    // Look up/down
                    if (p.keyIsDown(81)) pitch = Math.min(pitch + 1.5, 60) // Q = look up
                    if (p.keyIsDown(90)) pitch = Math.max(pitch - 1.5, -30) // Z = look down
                    // Movement
                    // Movement — WASD + Arrows
                    let dx = 0, dz = 0
                    if (p.keyIsDown(p.UP_ARROW) || p.keyIsDown(87)) { dx += Math.sin(pa) * SPD; dz += Math.cos(pa) * SPD; mov = true }
                    if (p.keyIsDown(p.DOWN_ARROW) || p.keyIsDown(83)) { dx -= Math.sin(pa) * SPD; dz -= Math.cos(pa) * SPD; mov = true }
                    // A = strafe LEFT (perpendicular left from facing direction)
                    if (p.keyIsDown(65)) { dx -= Math.cos(pa) * SPD * 0.7; dz += Math.sin(pa) * SPD * 0.7; mov = true }
                    // D = strafe RIGHT (perpendicular right from facing direction)
                    if (p.keyIsDown(68)) { dx += Math.cos(pa) * SPD * 0.7; dz -= Math.sin(pa) * SPD * 0.7; mov = true }
                    const nx = px + dx, nz = pz + dz
                    if (Math.sqrt(nx * nx + nz * nz) > 8 && Math.sqrt((nx - TW.x) ** 2 + nz * nz) > 12) { px = nx; pz = nz }
                }
                if (mov) { bob += 0.14; stepC++; if (stepC % 28 === 0) AudioManager.playBeep(65 + Math.random() * 20, 0.022) }
                const hb = mov ? Math.sin(bob) * 6 : 0

                near = null
                const lx = px + Math.sin(pa) * 20, lz = pz + Math.cos(pa) * 20
                // Tower elevator prompt
                if (Math.sqrt((lx - TW.x) ** 2 + lz * lz) < 25) near = floor === 0 ? 'up' : 'down'
                // Saturn V boarding prompt (ground floor only)
                if (Math.sqrt(lx * lx + lz * lz) < 22 && floor === 0) near = 'sat_board'
                // Top floor — board capsule
                if (Math.sqrt(lx * lx + lz * lz) < 18 && floor === 1) near = 'board'
                if (msgT > 0) msgT--

                if (inElev) {
                    elevT += 0.006
                    if (elevT >= 1) { inElev = false; elevT = 0; floor = floor === 0 ? 1 : 0; msg = floor === 1 ? 'NIVEL 98m — BRAZO DE ACCESO. Acércate al Saturn V → [E]' : 'PLANTA BAJA'; msgT = 300 }
                }

                // SKY — pitch shifts the horizon
                const hz = p.height * 0.42 + hb + pitch * 3
                for (let y = 0; y < Math.max(hz, 0); y++) {
                    const t = y / Math.max(hz, 1)
                    if (day) p.stroke(p.lerpColor(p.color(128, 193, 255), p.color(52, 123, 213), t))
                    else p.stroke(p.lerpColor(p.color(3, 3, 16), p.color(10, 10, 32), t))
                    p.line(0, y, p.width, y)
                }
                if (day) {
                    // ☀ SUN — bright glow + corona
                    const sunX = p.width * 0.75, sunY = hz * 0.22
                    p.noStroke()
                    p.fill(255, 240, 140, 25); p.circle(sunX, sunY, 160)
                    p.fill(255, 255, 185, 50); p.circle(sunX, sunY, 105)
                    p.fill(255, 255, 210); p.circle(sunX, sunY, 50)
                    // Clouds
                    p.fill(255, 255, 255, 80)
                    for (let i = 0; i < 5; i++) { const cx = (i * 300 + p.frameCount * 0.15) % p.width; p.ellipse(cx, hz * 0.35 + i * 12, 120 + i * 20, 18) }
                } else {
                    // 🌙 MOON — detailed with glow, craters, and soft light
                    const moonX = p.width * 0.2, moonY = hz * 0.16
                    p.noStroke()
                    // Subtle moonlight glow
                    p.fill(180, 200, 220, 12); p.circle(moonX, moonY, 160)
                    p.fill(200, 215, 230, 20); p.circle(moonX, moonY, 100)
                    // Moon body
                    p.fill(220, 218, 208); p.circle(moonX, moonY, 52)
                    // Craters (dark side detail)
                    p.fill(195, 192, 182, 120); p.circle(moonX - 8, moonY - 6, 12)
                    p.fill(200, 197, 187, 100); p.circle(moonX + 6, moonY + 8, 9)
                    p.fill(190, 188, 178, 90); p.circle(moonX + 10, moonY - 4, 7)
                    p.fill(205, 202, 192, 80); p.circle(moonX - 3, moonY + 12, 6)
                    // Stars — brighter at night
                    p.fill(255, 220)
                    for (let i = 0; i < 90; i++) p.circle((i * 137.5) % p.width, (i * 73 + 12) % (hz * 0.85), 1 + (i % 3) * 0.5)
                    // Twinkling bright stars
                    for (let i = 0; i < 15; i++) {
                        const bri = 180 + Math.sin(p.frameCount * 0.05 + i * 2) * 75
                        p.fill(255, 255, 240, bri)
                        p.circle((i * 311) % p.width, (i * 97 + 5) % (hz * 0.7), 2)
                    }
                }

                // GROUND — open scanline floor casting
                p.fill(day ? p.color(130, 125, 115) : p.color(40, 38, 35)); p.noStroke()
                p.rect(0, Math.ceil(hz), p.width, p.height - Math.ceil(hz))

                const segs = 14, segW = Math.ceil(p.width / segs)
                for (let row = Math.ceil(hz); row < p.height; row += 2) {
                    const sy = row - hz; if (sy < 1) continue
                    const dist = (floor === 1 ? PH_TOP : PH) * focal / sy
                    if (dist > 700) continue
                    for (let s = 0; s < segs; s++) {
                        const sx = s * segW + segW / 2
                        const ra = pa + Math.atan2(sx - p.width / 2, focal)
                        const wx = px + Math.sin(ra) * dist, wz = pz + Math.cos(ra) * dist
                        const [r, g, b] = gCol(wx, wz, dist)
                        p.fill(r, g, b); p.rect(s * segW, row, segW + 1, 3)
                    }
                }

                // SPRITES
                const pr = SP.map(s => {
                    const b = proj(s.x, s.z, 0), t = proj(s.x, s.z, s.h)
                    if (!b || !t) return null
                    return { ...s, bx: b.x, by: b.y, tx: t.x, ty: t.y, sc: b.s, d: b.d }
                }).filter(Boolean).sort((a, b) => b.d - a.d)
                for (const s of pr) drawSp(p, s)

                // 🔦 FLOODLIGHTS AT NIGHT — illuminate the Saturn V and tower
                if (!day) {
                    const satProj = proj(0, 0, 0)
                    const satTop = proj(0, 0, 110)
                    if (satProj && satTop) {
                        const bx = satProj.x, by = satProj.y, ty = satTop.y
                        const beamW = 40 * satProj.s
                        // Light beams (4 floodlights from ground pointing up)
                        p.noStroke()
                        for (let i = 0; i < 4; i++) {
                            const offsetX = (i - 1.5) * beamW * 0.8
                            const alpha = 18 + Math.sin(p.frameCount * 0.02 + i) * 5
                            p.fill(255, 245, 200, alpha)
                            p.triangle(bx + offsetX - beamW * 0.15, by, bx + offsetX + beamW * 0.15, by, bx + offsetX * 0.3, ty)
                        }
                        // Warm glow around rocket base
                        p.fill(255, 240, 180, 15)
                        p.ellipse(bx, by, beamW * 4, (by - ty) * 0.3)
                        // Tower also lit
                        const towProj = proj(35, 0, 0)
                        if (towProj) {
                            p.fill(255, 200, 100, 10)
                            p.ellipse(towProj.x, towProj.y, beamW * 3, (by - ty) * 0.2)
                        }
                    }
                }

                if (inElev) drawElev(p)
                drawPitchIndicator(p)
                drawHUD(p)
            }

            function drawSp(p, s) {
                const sw = s.w * s.sc, sh = s.by - s.ty, cx = s.bx
                let ff = Math.min(0.75, s.d / 600)
                // At night, Saturn V and tower are illuminated by floodlights — less fog
                if (!day && (s.t === 'sat' || s.t === 'tow' || s.t === 'mlp')) ff = Math.min(0.3, ff * 0.4)
                const fm = 1 - ff
                p.noStroke()
                if (s.t === 'sat') {
                    p.fill(238 * fm, 238 * fm, 238 * fm); p.rect(cx - sw / 2, s.ty + sh * 0.55, sw, sh * 0.45)
                    p.fill(25 * fm + 8, 25 * fm + 8, 25 * fm + 8); p.rect(cx - sw / 2, s.ty + sh * 0.7, sw, sh * 0.015)
                    p.fill(215 * fm, 215 * fm, 215 * fm); p.rect(cx - sw * 0.44, s.ty + sh * 0.38, sw * 0.88, sh * 0.17)
                    p.fill(225 * fm, 225 * fm, 225 * fm); p.rect(cx - sw * 0.38, s.ty + sh * 0.2, sw * 0.76, sh * 0.18)
                    p.fill(195 * fm, 195 * fm, 205 * fm); p.rect(cx - sw * 0.32, s.ty + sh * 0.1, sw * 0.64, sh * 0.1)
                    p.fill(235 * fm, 235 * fm, 235 * fm); p.triangle(cx, s.ty, cx - sw * 0.2, s.ty + sh * 0.1, cx + sw * 0.2, s.ty + sh * 0.1)
                    p.stroke(145 * fm, 25 * fm, 25 * fm); p.strokeWeight(2); p.line(cx, s.ty, cx, s.ty - sh * 0.05); p.noStroke()
                    p.fill(55 * fm, 55 * fm, 55 * fm); for (let i = -2; i <= 2; i++) p.circle(cx + i * sw * 0.13, s.by, sw * 0.09)
                    if (sw > 16) { p.fill(25 * fm, 25 * fm, 190 * fm); p.textSize(Math.max(7, sw * 0.25)); p.textAlign(p.CENTER); p.text('USA', cx, s.ty + sh * 0.52) }
                } else if (s.t === 'tow') {
                    p.fill(180 * fm, 55 * fm, 32 * fm); p.rect(cx - sw * 0.15, s.ty, sw * 0.08, sh); p.rect(cx + sw * 0.08, s.ty, sw * 0.08, sh)
                    p.stroke(180 * fm, 55 * fm, 32 * fm); p.strokeWeight(Math.max(1, sw * 0.02))
                    for (let i = 0; i < 12; i++) { const y = s.ty + sh * i / 12; p.line(cx - sw * 0.12, y, cx + sw * 0.12, y) }
                    for (let i = 0; i < 6; i++) { const y1 = s.ty + sh * i * 2 / 12, y2 = s.ty + sh * (i * 2 + 1) / 12; p.line(cx - sw * 0.12, y1, cx + sw * 0.12, y2); p.line(cx + sw * 0.12, y1, cx - sw * 0.12, y2) }
                    p.noStroke(); if (sh > 40) { p.fill(160 * fm, 160 * fm, 170 * fm); p.rect(cx - sw * 0.5, s.ty + sh * 0.08, sw * 0.6, sh * 0.02) }
                    p.fill(200 * fm, 180 * fm, 40 * fm); p.rect(cx - sw * 0.08, s.by - sh * 0.08, sw * 0.16, sh * 0.08)
                } else if (s.t === 'mlp') {
                    p.fill(130 * fm, 130 * fm, 130 * fm); p.rect(cx - sw / 2, s.ty, sw, sh)
                    p.fill(30 * fm, 30 * fm, 30 * fm); p.rect(cx - sw * 0.15, s.ty + sh * 0.2, sw * 0.3, sh * 0.6)
                } else if (s.t === 'vab') {
                    p.fill(210 * fm, 205 * fm, 195 * fm); p.rect(cx - sw / 2, s.ty, sw, sh)
                    p.fill(30 * fm, 60 * fm, 160 * fm); p.rect(cx - sw * 0.15, s.ty + sh * 0.15, sw * 0.3, sh * 0.25)
                    if (sw > 10) { p.fill(255 * fm); p.textSize(Math.max(6, sw * 0.05)); p.textAlign(p.CENTER); p.text('NASA', cx, s.ty + sh * 0.33) }
                } else if (s.t === 'flg') {
                    p.stroke(170 * fm, 170 * fm, 170 * fm); p.strokeWeight(2); p.line(cx, s.by, cx, s.ty); p.noStroke()
                    for (let i = 0; i < 6; i++) { p.fill(i % 2 === 0 ? 210 * fm : 252 * fm, i % 2 === 0 ? 25 * fm : 252 * fm, i % 2 === 0 ? 25 * fm : 252 * fm); p.rect(cx, s.ty + i * sh * 0.1, sw * 0.65, sh * 0.1) }
                    p.fill(15 * fm, 35 * fm, 145 * fm); p.rect(cx, s.ty, sw * 0.25, sh * 0.32)
                } else if (s.t === 'plm') {
                    p.stroke(110 * fm, 70 * fm, 30 * fm); p.strokeWeight(Math.max(2, sw * 0.3)); p.line(cx, s.by, cx, s.ty + sh * 0.3); p.noStroke()
                    p.fill(40 * fm, 130 * fm, 35 * fm)
                    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; p.ellipse(cx + Math.cos(a) * sw * 1.2, s.ty + sh * 0.2 + Math.sin(a) * sh * 0.12, sw * 1.8, sh * 0.12) }
                } else if (s.t === 'trk' || s.t === 'ftk' || s.t === 'van') {
                    const isF = s.t === 'ftk', isV = s.t === 'van'
                    p.fill(isF ? 200 * fm : 235 * fm, isF ? 40 * fm : 235 * fm, isF ? 30 * fm : 235 * fm); p.rect(cx - sw / 2, s.ty + sh * 0.1, sw, sh * 0.65)
                    p.fill(30 * fm + 15, 30 * fm + 15, 30 * fm + 15); p.circle(cx - sw * 0.3, s.by, sh * 0.2); p.circle(cx + sw * 0.25, s.by, sh * 0.2)
                    if (sw > 10 && isV) { p.fill(20 * fm, 48 * fm, 170 * fm); p.textSize(Math.max(5, sw * 0.12)); p.textAlign(p.CENTER); p.text('NASA', cx, s.ty + sh * 0.6) }
                } else if (s.t === 'sgn') {
                    p.fill(232 * fm, 192 * fm, 25 * fm); p.rect(cx - sw / 2, s.ty + sh * 0.1, sw, sh * 0.55)
                    p.fill(112 * fm, 112 * fm, 112 * fm); p.rect(cx - 1, s.ty + sh * 0.65, 3, sh * 0.35)
                } else if (s.t === 'bnk') {
                    p.fill(140 * fm, 140 * fm, 135 * fm); p.rect(cx - sw / 2, s.ty + sh * 0.2, sw, sh * 0.8)
                    p.fill(80 * fm, 80 * fm, 85 * fm); p.rect(cx - sw * 0.1, s.ty + sh * 0.4, sw * 0.2, sh * 0.6)
                }
            }

            function drawElev(p) {
                const goUp = floor === 0
                const fl = goUp ? Math.floor(elevT * 98) : Math.floor((1 - elevT) * 98)
                const currentH = goUp ? elevT * 98 : (1 - elevT) * 98

                // ── Background: sky through elevator window ──
                const skyT = currentH / 98
                if (day) {
                    for (let y = 0; y < p.height; y++) {
                        const t = y / p.height
                        p.stroke(p.lerpColor(p.color(128, 193, 255), p.color(52, 123, 213), t))
                        p.line(0, y, p.width, y)
                    }
                } else {
                    for (let y = 0; y < p.height; y++) {
                        const t = y / p.height
                        p.stroke(p.lerpColor(p.color(3, 3, 16), p.color(10, 10, 32), t))
                        p.line(0, y, p.width, y)
                    }
                    p.noStroke(); p.fill(255, 180)
                    for (let i = 0; i < 40; i++) p.circle((i * 137.5) % p.width, (i * 73) % (p.height * 0.6), 1.2)
                }

                // Ground receding as we go up
                const groundY = p.map(currentH, 0, 98, p.height * 0.6, p.height * 0.95)
                p.noStroke()
                // Ground
                p.fill(day ? p.color(130, 125, 115) : p.color(40, 38, 35)); p.noStroke()
                p.rect(0, groundY, p.width, p.height - groundY)

                // Distant horizon features
                if (currentH > 20) {
                    const scale = p.map(currentH, 20, 98, 1, 0.3)
                    // Crawler way
                    p.fill(day ? p.color(155, 150, 140) : p.color(50, 48, 42))
                    p.rect(p.width * 0.4, groundY, p.width * 0.2 * scale, p.height)
                    // Distant VAB
                    const vabH = 60 * scale
                    p.fill(day ? p.color(200, 195, 185) : p.color(60, 58, 52))
                    p.rect(p.width * 0.15, groundY - vabH, 45 * scale, vabH)
                    // Distant vehicles
                    p.fill(day ? 220 : 50)
                    for (let i = 0; i < 3; i++) p.rect(p.width * (0.55 + i * 0.08), groundY - 3, 8, 3)
                }

                // Saturn V passing by window
                const rx = p.width * 0.70;
                const rw = p.width * 0.14;
                // When going UP, we move towards the TOP of the rocket.
                // At floor 0, we see the base (top is way above us).
                // At floor 98, we see the cone (top is at window level).
                const rocketTopY = p.map(currentH, 0, 98, -p.height * 2.2, p.height * 0.05);

                // Cone tip
                p.fill(220); p.noStroke()
                p.triangle(rx + rw * 0.1, rocketTopY, rx + rw * 0.9, rocketTopY, rx + rw / 2, rocketTopY - p.height * 0.25)

                // CSM (Silver segment)
                p.fill(160);
                p.rect(rx + rw * 0.1, rocketTopY, rw * 0.8, p.height * 0.15)

                // Main White body
                const bodyY = rocketTopY + p.height * 0.15;
                p.fill(235);
                p.rect(rx, bodyY, rw, p.height * 4.0)

                // USA Text
                p.fill(20, 20, 150); p.textSize(Math.max(16, p.height * 0.04)); p.textAlign(p.CENTER)
                p.text('U', rx + rw / 2, bodyY + p.height * 0.3)
                p.text('S', rx + rw / 2, bodyY + p.height * 0.36)
                p.text('A', rx + rw / 2, bodyY + p.height * 0.42)

                // USA Text second stage
                p.fill(20, 20, 150);
                p.text('U', rx + rw / 2, bodyY + p.height * 1.5)
                p.text('S', rx + rw / 2, bodyY + p.height * 1.56)
                p.text('A', rx + rw / 2, bodyY + p.height * 1.62)

                // Black bands
                p.fill(30);
                p.rect(rx, bodyY + p.height * 0.7, rw, p.height * 0.02)
                p.rect(rx, bodyY + p.height * 1.8, rw, p.height * 0.02)
                p.rect(rx, bodyY + p.height * 2.8, rw, p.height * 0.02)

                // ── Elevator frame ──
                p.fill(50, 50, 55); p.noStroke()
                p.rect(0, 0, p.width * 0.12, p.height) // left wall
                p.rect(p.width * 0.88, 0, p.width * 0.12, p.height) // right wall
                p.rect(0, 0, p.width, p.height * 0.05) // ceiling
                p.rect(0, p.height * 0.92, p.width, p.height * 0.08) // floor

                // Moving joints (tower structure passing by)
                p.stroke(80, 80, 85); p.strokeWeight(3)
                for (let i = 0; i < 24; i++) {
                    const jy = ((i * 60 + p.frameCount * (goUp ? 7 : -7)) % (p.height + 60)) - 30
                    p.line(0, jy, p.width * 0.12, jy)
                    p.line(p.width * 0.88, jy, p.width, jy)
                }

                // Elevator interior details
                p.fill(70); p.noStroke()
                p.rect(p.width * 0.02, p.height * 0.3, p.width * 0.04, p.height * 0.4, 3) // control panel
                p.fill(0, 255, 0); p.circle(p.width * 0.04, p.height * 0.4, 6) // indicator light
                p.fill(255, 0, 0, 100 + Math.sin(p.frameCount * 0.1) * 100)
                p.circle(p.width * 0.04, p.height * 0.5, 4) // blinking light

                // Level display
                p.fill(0, 0, 0, 160); p.noStroke()
                p.rect(p.width / 2 - 120, p.height * 0.93, 240, p.height * 0.06, 4)
                p.fill(0, 255, 0); p.textAlign(p.CENTER, p.CENTER)
                p.textSize(28); p.textFont('monospace'); p.text(`${fl}m`, p.width / 2, p.height * 0.96)
                p.textSize(11); p.fill(180)
                p.text(goUp ? '▲ SUBIENDO' : '▼ BAJANDO', p.width / 2 - 80, p.height * 0.96)

                // Progress bar
                p.fill(30); p.rect(p.width * 0.13, p.height * 0.06, 8, p.height * 0.85)
                p.fill(0, 200, 0); p.rect(p.width * 0.13, p.height * 0.06 + p.height * 0.85 * (1 - elevT), 8, p.height * 0.85 * elevT)
            }

            function drawPitchIndicator(p) {
                if (inElev) return
                // Vertical pitch bar on right side of screen
                const barX = p.width - 40
                const barY = p.height * 0.3
                const barH = p.height * 0.4
                const barW = 6
                // Background track
                p.fill(0, 0, 0, 120)
                p.noStroke()
                p.rect(barX - barW / 2, barY, barW, barH, 3)
                // Center marker (horizon)
                p.stroke(255, 255, 255, 60)
                p.strokeWeight(1)
                p.line(barX - 12, barY + barH / 2, barX + 12, barY + barH / 2)
                // Pitch position indicator
                const pitchNorm = pitch / 90 // -0.33 to 0.67
                const indicatorY = barY + barH / 2 - pitchNorm * barH
                const clampedY = Math.max(barY, Math.min(barY + barH, indicatorY))
                // Glow
                p.noStroke()
                p.fill(0, 255, 100, 40)
                p.circle(barX, clampedY, 18)
                // Indicator dot
                p.fill(0, 255, 100)
                p.circle(barX, clampedY, 8)
                // Label
                p.fill(0, 255, 100, 180)
                p.textSize(9)
                p.textAlign(p.CENTER)
                p.textFont('monospace')
                p.text(`${pitch > 0 ? '+' : ''}${pitch.toFixed(0)}°`, barX, clampedY - 12)
                if (Math.abs(pitch) > 1) {
                    p.fill(255, 255, 255, 40)
                    p.textSize(8)
                    p.text('PITCH', barX, barY - 8)
                }
            }

            function drawHUD(p) {
                p.stroke(255, 255, 255, 85); p.strokeWeight(2)
                p.line(p.width / 2 - 13, p.height / 2, p.width / 2 + 13, p.height / 2)
                p.line(p.width / 2, p.height / 2 - 13, p.width / 2, p.height / 2 + 13); p.strokeWeight(1)
                if (near && !inElev) {
                    const pr = {
                        up: '[E] SUBIR — Brazo de acceso (98m)',
                        down: '[E] BAJAR — Planta baja',
                        board: '[E] ABORDAR CÁPSULA APOLLO 11',
                        sat_board: '[E] ENTRAR AL SATURN V — Ir a Pre-Lanzamiento'
                    }
                    p.fill(0, 0, 0, 135 + Math.sin(p.frameCount * 0.1) * 42); p.noStroke()
                    p.rect(p.width / 2 - 310, p.height / 2 + 52, 620, 36, 6)
                    p.fill(255, 255, 0); p.textAlign(p.CENTER); p.textSize(19); p.textFont('monospace')
                    p.text(pr[near] || '', p.width / 2, p.height / 2 + 75)
                }
                if (msgT > 0) { p.fill(0, 192, 0, Math.min(255, msgT * 3)); p.noStroke(); p.textAlign(p.CENTER); p.textSize(15); p.textFont('monospace'); p.text(msg, p.width / 2, p.height - 72) }
                p.fill(255, 192); p.textAlign(p.LEFT); p.textSize(12); p.textFont('monospace')
                p.text(`${floor === 0 ? 'PLANTA BAJA' : 'BRAZO DE ACCESO (98m)'} — ${day ? '☀ DÍA' : '🌙 NOCHE'}`, 16, p.height - 26)
                p.fill(255, 255, 255, 80); p.textAlign(p.RIGHT); p.textSize(11)
                p.text('[WASD] Mover   [N] Día/Noche   [Q/Z] Mirar arriba/abajo', p.width - 16, p.height - 12)
                p.fill(0, 0, 0, 140); p.noStroke(); p.rect(0, 0, p.width, 44)
                p.fill(0, 192, 255); p.textAlign(p.CENTER); p.textSize(15); p.textFont('monospace')
                p.text('KENNEDY SPACE CENTER — LAUNCH COMPLEX 39A', p.width / 2, 27)
            }

            p.keyPressed = () => {
                const st = useMissionStore.getState()

                if (p.key === 'e' || p.key === 'E') {
                    if (near === 'up' || near === 'down') { inElev = true; elevT = 0; AudioManager.playClick() }
                    else if (near === 'sat_board') {
                        // Ground floor: enter Saturn V → go to launch scene
                        AudioManager.playClick(); AudioManager.stopAll()
                        st.setValues({ currentScene: 'LAUNCH', phase: 'Pre-launch' })
                        AudioManager.startAmbient('launch')
                    }
                    else if (near === 'board') {
                        // Top floor: board Apollo capsule → launch
                        AudioManager.playClick(); AudioManager.stopAll()
                        st.setValues({ currentScene: 'LAUNCH', phase: 'Pre-launch' })
                        AudioManager.startAmbient('launch')
                    }
                }
                if (p.keyCode === p.ENTER) { AudioManager.stopAll(); st.setValues({ currentScene: 'LAUNCH', phase: 'Pre-launch' }); AudioManager.startAmbient('launch') }
                if (p.key === 'n' || p.key === 'N') st.toggleLaunchDay()
            }
            p.windowResized = () => p.resizeCanvas(p.windowWidth, p.windowHeight)
        }
        p5.disableFriendlyErrors = true
        const inst = new p5(sketch, ref.current)
        return () => inst.remove()
    }, [currentScene])

    return currentScene === 'KSC_EXPLORATION' ? <div ref={ref} style={{ position: 'absolute', inset: 0, zIndex: 10 }} /> : null
}
