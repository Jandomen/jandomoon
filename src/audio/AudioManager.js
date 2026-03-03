// src/audio/AudioManager.js — Full Web Audio API ambient system
class AudioManager {
  constructor() {
    this.ctx = null
    this.engineOsc = null
    this.engineGain = null
    this.engineFilter = null
    this.ambientNode = null
    this.ambientGain = null
    this.ambientType = null // 'space', 'cabin', 'reentry', 'lunar'
  }

  _ensureCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
  }

  // ─── ENGINE ──────────────────────────────────────────
  startEngine() {
    this._ensureCtx()
    if (this.engineOsc && this.engineGain) return

    // Clear any pending stop timeouts
    if (this._engineStopTimeout) {
      clearTimeout(this._engineStopTimeout)
      this._engineStopTimeout = null
    }

    this.engineOsc = this.ctx.createOscillator()
    this.engineGain = this.ctx.createGain()
    this.engineFilter = this.ctx.createBiquadFilter()

    this.engineOsc.type = 'sawtooth'
    this.engineOsc.frequency.value = 60

    this.engineFilter.type = 'lowpass'
    this.engineFilter.frequency.value = 400

    this.engineGain.gain.value = 0
    this.engineOsc.connect(this.engineFilter).connect(this.engineGain).connect(this.ctx.destination)
    this.engineOsc.start()
  }

  setEnginePower(power, cameraMode = 'external', distance = 0) {
    if (!this.engineGain || !this.engineOsc) this.startEngine()

    const distanceFactor = 1 / (1 + (distance / 400))
    // Cabin should feel like a deep muffled rumble, External should be a roar
    const baseVolume = cameraMode === 'cabin' ? 0.4 : 0.7
    const volume = Math.pow(power, 1.25) * baseVolume * distanceFactor

    this.engineGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05)

    if (this.engineOsc) {
      // Frequency goes higher as you throttle up
      const baseFreq = cameraMode === 'cabin' ? 45 : 65
      this.engineOsc.frequency.setTargetAtTime(baseFreq + power * 60, this.ctx.currentTime, 0.1)
      this.engineOsc.type = cameraMode === 'cabin' ? 'triangle' : 'sawtooth'
    }

    if (this.engineFilter) {
      // External has high frequencies, Cabin is heavily filtered
      const targetFreq = (cameraMode === 'cabin' ? 180 : 2500) * distanceFactor
      this.engineFilter.frequency.setTargetAtTime(Math.max(60, targetFreq), this.ctx.currentTime, 0.1)
      this.engineFilter.Q.value = cameraMode === 'cabin' ? 10 : 1 // Add resonance to cabin rumble
    }
  }

  stopEngine() {
    // Capture references to current nodes BEFORE nullifying
    const osc = this.engineOsc
    const gain = this.engineGain
    const filter = this.engineFilter

    // Immediately clear references so startEngine can create fresh ones
    this.engineOsc = null
    this.engineGain = null
    this.engineFilter = null

    if (this._engineStopTimeout) {
      clearTimeout(this._engineStopTimeout)
      this._engineStopTimeout = null
    }

    if (gain) {
      try { gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3) } catch (e) { }
      this._engineStopTimeout = setTimeout(() => {
        try { if (osc) { osc.stop(); osc.disconnect() } } catch (e) { }
        try { if (gain) gain.disconnect() } catch (e) { }
        try { if (filter) filter.disconnect() } catch (e) { }
        this._engineStopTimeout = null
      }, 400)
    }
  }

  // ─── AMBIENT SOUNDS (Pure JS synthesis) ─────────────
  // Creates looping ambient soundscapes for each mission phase

  startAmbient(type) {
    // If same type is requested and nodes are still valid, skip
    if (this.ambientType === type && this.ambientNode && this.ambientGain) {
      // Verify audio context is still active
      try {
        if (this.ambientGain.gain.value !== undefined) return // Still alive
      } catch (e) {
        // Nodes are dead, fall through to restart
      }
    }
    this.stopAmbient()
    this._ensureCtx()
    this.ambientType = type

    switch (type) {
      case 'space': this._ambientSpace(); break
      case 'cabin': this._ambientCabin(); break
      case 'reentry': this._ambientReentry(); break
      case 'lunar': this._ambientLunar(); break
      case 'launch': this._ambientLaunch(); break
      default: break
    }
  }

  // Adjust ambient volume for camera mode — SAME sound, just quieter inside cabin
  adjustAmbientForCamera(cameraMode) {
    if (!this.ambientGain || !this.ctx) return
    try {
      if (cameraMode === 'cabin') {
        // Muffled — 30% volume, NOT silent
        this.ambientGain.gain.setTargetAtTime(0.07, this.ctx.currentTime, 0.3)
      } else {
        // Full exterior volume
        const fullVol = this.ambientType === 'reentry' ? 0.25 :
          this.ambientType === 'cabin' ? 0.06 :
            this.ambientType === 'launch' ? 0.05 : 0.08
        this.ambientGain.gain.setTargetAtTime(fullVol, this.ctx.currentTime, 0.3)
      }
    } catch (e) { /* ok */ }
  }

  _ambientSpace() {
    // Deep space hum: very low drone + occasional pings
    const master = this.ctx.createGain()
    master.gain.value = 0.08
    master.connect(this.ctx.destination)

    // Low drone
    const drone = this.ctx.createOscillator()
    drone.type = 'sine'
    drone.frequency.value = 42
    const droneGain = this.ctx.createGain()
    droneGain.gain.value = 0.5
    drone.connect(droneGain).connect(master)
    drone.start()

    // Filtered noise (life support hiss)
    const bufSize = this.ctx.sampleRate * 2
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3
    const noise = this.ctx.createBufferSource()
    noise.buffer = buf
    noise.loop = true
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 800
    filter.Q.value = 2
    const noiseGain = this.ctx.createGain()
    noiseGain.gain.value = 0.15
    noise.connect(filter).connect(noiseGain).connect(master)
    noise.start()

    // Random computer pings
    this._startPingLoop(master)

    this.ambientNode = { drone, noise, master, pingInterval: this._pingInterval }
    this.ambientGain = master
  }

  _ambientCabin() {
    // Cockpit ambience: fans, electronics hum, subtle beeps
    const master = this.ctx.createGain()
    master.gain.value = 0.06
    master.connect(this.ctx.destination)

    // Fan hum
    const fan = this.ctx.createOscillator()
    fan.type = 'triangle'
    fan.frequency.value = 120
    const fanGain = this.ctx.createGain()
    fanGain.gain.value = 0.3
    fan.connect(fanGain).connect(master)
    fan.start()

    // Electronics buzz
    const buzz = this.ctx.createOscillator()
    buzz.type = 'sawtooth'
    buzz.frequency.value = 60
    const buzzFilter = this.ctx.createBiquadFilter()
    buzzFilter.type = 'lowpass'
    buzzFilter.frequency.value = 100
    const buzzGain = this.ctx.createGain()
    buzzGain.gain.value = 0.2
    buzz.connect(buzzFilter).connect(buzzGain).connect(master)
    buzz.start()

    this._startPingLoop(master)

    this.ambientNode = { fan, buzz, master, pingInterval: this._pingInterval }
    this.ambientGain = master
  }

  _ambientReentry() {
    // Intense plasma roar: heavy noise + rumble
    const master = this.ctx.createGain()
    master.gain.value = 0.25
    master.connect(this.ctx.destination)

    // Heavy noise
    const bufSize = this.ctx.sampleRate * 2
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
    const noise = this.ctx.createBufferSource()
    noise.buffer = buf
    noise.loop = true
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 600
    noise.connect(filter).connect(master)
    noise.start()

    // Rumble
    const rumble = this.ctx.createOscillator()
    rumble.type = 'sawtooth'
    rumble.frequency.value = 30
    const rumbleGain = this.ctx.createGain()
    rumbleGain.gain.value = 0.4
    rumble.connect(rumbleGain).connect(master)
    rumble.start()

    this.ambientNode = { noise, rumble, master }
    this.ambientGain = master
  }

  _ambientLunar() {
    // Near silence on the Moon: just very faint suit fans + breathing-like oscillation
    const master = this.ctx.createGain()
    master.gain.value = 0.04
    master.connect(this.ctx.destination)

    // Suit fan
    const bufSize = this.ctx.sampleRate * 2
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.15
    const noise = this.ctx.createBufferSource()
    noise.buffer = buf
    noise.loop = true
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 300
    filter.Q.value = 5
    noise.connect(filter).connect(master)
    noise.start()

    // Breathing LFO
    const lfo = this.ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.25 // Breathing rate
    const lfoGain = this.ctx.createGain()
    lfoGain.gain.value = 0.02
    lfo.connect(lfoGain).connect(master.gain)
    lfo.start()

    this.ambientNode = { noise, lfo, master }
    this.ambientGain = master
  }

  _ambientLaunch() {
    // Pre-launch: wind, distant machinery
    const master = this.ctx.createGain()
    master.gain.value = 0.05
    master.connect(this.ctx.destination)

    // Wind noise
    const bufSize = this.ctx.sampleRate * 2
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.4
    const noise = this.ctx.createBufferSource()
    noise.buffer = buf
    noise.loop = true
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 250
    noise.connect(filter).connect(master)
    noise.start()

    this.ambientNode = { noise, master }
    this.ambientGain = master
  }

  _startPingLoop(masterNode) {
    this._pingInterval = setInterval(() => {
      if (Math.random() > 0.6 && this.ctx) {
        try {
          const osc = this.ctx.createOscillator()
          const gain = this.ctx.createGain()
          osc.type = 'sine'
          const freq = 800 + Math.random() * 2000
          osc.frequency.value = freq
          gain.gain.setValueAtTime(0.05, this.ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15)
          osc.connect(gain).connect(masterNode)
          osc.start()
          osc.stop(this.ctx.currentTime + 0.15)
        } catch (e) { /* context might be closed */ }
      }
    }, 3000)
  }

  stopAmbient() {
    if (this._pingInterval) {
      clearInterval(this._pingInterval)
      this._pingInterval = null
    }
    // Capture old references
    const oldNode = this.ambientNode
    const oldGain = this.ambientGain

    // Clear immediately so startAmbient can create fresh ones
    this.ambientNode = null
    this.ambientGain = null
    this.ambientType = null

    if (oldNode) {
      try {
        if (oldGain) oldGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3)
      } catch (e) { }
      setTimeout(() => {
        if (oldNode) {
          Object.values(oldNode).forEach(node => {
            try { if (node.stop) node.stop() } catch (e) { }
            try { if (node.disconnect) node.disconnect() } catch (e) { }
          })
        }
      }, 400)
    }
  }

  // Stop everything (for scene transitions)
  stopAll() {
    this.stopEngine()
    this.stopAmbient()
    this.stopAlarmLoop()
  }

  // ─── ALARM SYSTEM ───────────────────────────────────
  // Continuous alarm that loops until stopped
  startAlarmLoop(type = 'master') {
    this.stopAlarmLoop()
    this._ensureCtx()
    this._alarmLoopActive = true

    const loop = () => {
      if (!this._alarmLoopActive) return
      switch (type) {
        case 'master': this._playMasterCaution(); break
        case 'fuel': this._playFuelWarning(); break
        case 'altitude': this._playAltitudeWarning(); break
        case 'program': this._playProgramAlarm(); break
        case 'voltage': this._playCautionVoltage(); break
        case 'pressure': this._playCautionPressure(); break
        case 'temp': this._playCautionTemp(); break
        case 'co2': this._playCautionCO2(); break
      }
    }
    loop()
    this._alarmInterval = setInterval(loop, ['fuel', 'voltage', 'temp'].includes(type) ? 800 : 1500)
  }

  stopAlarmLoop() {
    this._alarmLoopActive = false
    if (this._alarmInterval) {
      clearInterval(this._alarmInterval)
      this._alarmInterval = null
    }
  }

  // Master Caution — alternating hi-lo (classic Apollo)
  _playMasterCaution() {
    this._ensureCtx()
    const now = this.ctx.currentTime
    // Two-tone: 800Hz then 600Hz
    for (let i = 0; i < 4; i++) {
      const freq = i % 2 === 0 ? 800 : 600
      const osc = this.ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.value = freq
      const g = this.ctx.createGain()
      g.gain.setValueAtTime(0.25, now + i * 0.15)
      g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.12)
      osc.connect(g).connect(this.ctx.destination)
      osc.start(now + i * 0.15)
      osc.stop(now + i * 0.15 + 0.12)
    }
  }

  // Fuel Warning — rapid high beeps
  _playFuelWarning() {
    this._ensureCtx()
    const now = this.ctx.currentTime
    for (let i = 0; i < 6; i++) {
      const osc = this.ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.value = 1200
      const g = this.ctx.createGain()
      g.gain.setValueAtTime(0.3, now + i * 0.1)
      g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.06)
      osc.connect(g).connect(this.ctx.destination)
      osc.start(now + i * 0.1)
      osc.stop(now + i * 0.1 + 0.06)
    }
  }

  // Altitude Warning — descending sweep
  _playAltitudeWarning() {
    this._ensureCtx()
    const osc = this.ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(1500, this.ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.8)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.3, this.ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.9)
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 2000
    osc.connect(filter).connect(g).connect(this.ctx.destination)
    osc.start()
    osc.stop(this.ctx.currentTime + 0.9)
  }

  // Program Alarm — 1202 style (3 quick beeps)
  _playProgramAlarm() {
    this._ensureCtx()
    const now = this.ctx.currentTime
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = 2000
      const g = this.ctx.createGain()
      g.gain.setValueAtTime(0.35, now + i * 0.2)
      g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.2 + 0.1)
      osc.connect(g).connect(this.ctx.destination)
      osc.start(now + i * 0.2)
      osc.stop(now + i * 0.2 + 0.15)
    }
  }

  // ─── CAUTION ALARMS (Yellow lights) ─────────────────
  _playCautionVoltage() {
    this._ensureCtx()
    const now = this.ctx.currentTime
    for (let i = 0; i < 2; i++) {
      const osc = this.ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = 150
      const g = this.ctx.createGain()
      g.gain.setValueAtTime(0.2, now + i * 0.4)
      g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.4 + 0.3)
      osc.connect(g).connect(this.ctx.destination)
      osc.start(now + i * 0.4)
      osc.stop(now + i * 0.4 + 0.3)
    }
  }

  _playCautionPressure() {
    this._ensureCtx()
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(400, now)
    osc.frequency.linearRampToValueAtTime(300, now + 1.0)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.25, now)
    g.gain.linearRampToValueAtTime(0.01, now + 1.0)
    osc.connect(g).connect(this.ctx.destination)
    osc.start(now)
    osc.stop(now + 1.0)
  }

  _playCautionTemp() {
    this._ensureCtx()
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = 1000
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.15, now)
    g.gain.linearRampToValueAtTime(0.01, now + 0.5)
    osc.connect(g).connect(this.ctx.destination)
    osc.start(now)
    osc.stop(now + 0.5)
  }

  _playCautionCO2() {
    this._ensureCtx()
    const now = this.ctx.currentTime
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.value = 450
      const g = this.ctx.createGain()
      g.gain.setValueAtTime(0.15, now + i * 0.25)
      g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.25 + 0.1)
      osc.connect(g).connect(this.ctx.destination)
      osc.start(now + i * 0.25)
      osc.stop(now + i * 0.25 + 0.1)
    }
  }

  // ─── ONE-SHOT SOUNDS ────────────────────────────────
  playAlarm() {
    this._playMasterCaution()
  }

  playStageSep() {
    this._ensureCtx()
    const bufferSize = this.ctx.sampleRate * 0.5
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

    const noise = this.ctx.createBufferSource()
    noise.buffer = buffer
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 200
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.8, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.8)

    const thump = this.ctx.createOscillator()
    thump.type = 'sine'
    thump.frequency.setValueAtTime(40, this.ctx.currentTime)
    thump.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.5)

    const thumpGain = this.ctx.createGain()
    thumpGain.gain.setValueAtTime(0.5, this.ctx.currentTime)
    thumpGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5)

    noise.connect(filter).connect(gain).connect(this.ctx.destination)
    thump.connect(thumpGain).connect(this.ctx.destination)

    noise.start()
    thump.start()
    thump.stop(this.ctx.currentTime + 0.8)
  }

  // Explosive liftoff burst (for lunar ascent)
  playExplosiveLiftoff() {
    this._ensureCtx()
    const bufSize = this.ctx.sampleRate * 1.2
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) {
      const t = i / this.ctx.sampleRate
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 3)
    }
    const noise = this.ctx.createBufferSource()
    noise.buffer = buf
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(2000, this.ctx.currentTime)
    filter.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.8)
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.9, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.2)
    noise.connect(filter).connect(gain).connect(this.ctx.destination)
    noise.start()

    const sub = this.ctx.createOscillator()
    sub.type = 'sine'
    sub.frequency.setValueAtTime(80, this.ctx.currentTime)
    sub.frequency.exponentialRampToValueAtTime(15, this.ctx.currentTime + 0.6)
    const subGain = this.ctx.createGain()
    subGain.gain.setValueAtTime(0.7, this.ctx.currentTime)
    subGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.6)
    sub.connect(subGain).connect(this.ctx.destination)
    sub.start()
    sub.stop(this.ctx.currentTime + 0.8)
  }

  playAbort() {
    this._ensureCtx()
    const now = this.ctx.currentTime
    // Sirena de emergencia: sweep rápido
    for (let i = 0; i < 10; i++) {
      const osc = this.ctx.createOscillator()
      osc.type = 'square'
      const startFreq = i % 2 === 0 ? 2500 : 1800
      osc.frequency.setValueAtTime(startFreq, now + i * 0.15)
      osc.frequency.exponentialRampToValueAtTime(startFreq * 0.6, now + i * 0.15 + 0.12)
      const g = this.ctx.createGain()
      g.gain.setValueAtTime(0.35, now + i * 0.15)
      g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.12)
      osc.connect(g).connect(this.ctx.destination)
      osc.start(now + i * 0.15)
      osc.stop(now + i * 0.15 + 0.15)
    }
  }

  playDock() {
    this._ensureCtx()
    this.playBeep(200, 0.1)
    setTimeout(() => this.playBeep(150, 0.2), 100)
    setTimeout(() => this.playBeep(100, 0.4), 200)
  }

  playClick() {
    this.playBeep(800, 0.05)
  }

  playSuccess() {
    this._ensureCtx()
    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => {
      this.playBeep(freq, 0.3, this.ctx.currentTime + i * 0.15)
    })
  }

  // Splash / water impact
  playSplash() {
    this._ensureCtx()
    const bufSize = this.ctx.sampleRate * 1.5
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) {
      const t = i / this.ctx.sampleRate
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 2) * 0.8
    }
    const noise = this.ctx.createBufferSource()
    noise.buffer = buf
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(3000, this.ctx.currentTime)
    filter.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 1.0)
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.7, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.5)
    noise.connect(filter).connect(gain).connect(this.ctx.destination)
    noise.start()
  }

  playBeep(freq = 1000, duration = 0.1, time = null) {
    this._ensureCtx()
    const startTime = time || this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, startTime)
    gain.gain.setValueAtTime(0.2, startTime)
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
    osc.connect(gain).connect(this.ctx.destination)
    osc.start(startTime)
    osc.stop(startTime + duration)
  }
}

const audio = new AudioManager()
export default audio