// sounds.js
export const Sounds = {
  countdownBeep: () => oscillator(800, 0.1, 'square'),
  ignition: () => noise(80, 3, 'white'),           // rugido F-1
  stageSep: () => oscillator(200, 0.4, 'sawtooth'),
  alarm: () => oscillator(600, 0.3, 'sine', true), // alarma Master Alarm
  rcs: () => noise(0.15, 0.08, 'pink'),            // thrusters
  eagleLanding: () => [oscillator(300, 0.5), oscillator(302, 0.5)], // "contact light"
  splashdown: () => noise(120, 2, 'brown'),
  armstrong: () => textToSpeech("Tranquility base here...") // opcional con Web Speech API
};