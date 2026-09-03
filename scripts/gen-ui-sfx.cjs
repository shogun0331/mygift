const fs = require('fs')
const path = require('path')

const SR = 44100

function clamp(v) {
  return Math.max(-1, Math.min(1, v))
}

function env(t, attack, decay) {
  if (t < 0) return 0
  if (t < attack) return t / Math.max(0.0001, attack)
  return Math.exp(-(t - attack) / Math.max(0.0001, decay))
}

function sine(freq, t) {
  return Math.sin(2 * Math.PI * freq * t)
}

function square(freq, t) {
  return sine(freq, t) >= 0 ? 1 : -1
}

function noise() {
  return Math.random() * 2 - 1
}

function writeWav(fileName, samples) {
  const n = samples.length
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + n * 2, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(SR, 24)
  buf.writeUInt32LE(SR * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(clamp(samples[i]) * 32767), 44 + i * 2)
  const out = path.join(__dirname, '..', 'public', 'sfx', fileName)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, buf)
}

function render(seconds, fn) {
  const n = Math.floor(SR * seconds)
  const samples = new Float32Array(n)
  for (let i = 0; i < n; i++) samples[i] = fn(i / SR, i, n)
  return samples
}

const recipes = {
  'condition-recover.wav': () =>
    render(0.46, (t) => {
      const a = sine(523.25, t) * env(t, 0.008, 0.18) * 0.22
      const b = sine(659.25, t) * env(t - 0.05, 0.008, 0.2) * 0.2
      const c = sine(783.99, t) * env(t - 0.1, 0.01, 0.24) * 0.18
      const shimmer = sine(1568, t) * env(t - 0.08, 0.004, 0.12) * 0.06
      return a + b + c + shimmer
    }),

  'toxic.wav': () =>
    render(0.42, (t) => {
      const growl = (sine(92, t) + sine(97.5, t)) * env(t, 0.01, 0.22) * 0.22
      const buzz = square(140 + t * 40, t) * env(t, 0.004, 0.14) * 0.1
      const grit = noise() * env(t, 0.002, 0.09) * 0.16
      const sting = sine(740, t) * env(t, 0.001, 0.05) * 0.08
      return growl + buzz + grit + sting
    }),

  'toxic-defend.wav': () =>
    render(0.34, (t) => {
      const clang = (sine(420, t) + sine(840, t) * 0.5) * env(t, 0.002, 0.08) * 0.28
      const body = sine(180, t) * env(t, 0.004, 0.12) * 0.16
      const resolve = sine(660, t) * env(t - 0.08, 0.006, 0.14) * 0.14
      return clang + body + resolve
    }),

  'gear-fail.wav': () =>
    render(0.48, (t) => {
      const fall = 190 * (1 - t * 1.4)
      const hum = square(Math.max(40, fall), t) * env(t, 0.006, 0.2) * 0.1
      const zap = noise() * env(t, 0.001, 0.07) * 0.22
      const crack = sine(980, t) * env(t, 0.001, 0.03) * 0.08
      const down = sine(70, t) * env(t, 0.02, 0.22) * 0.18
      return hum + zap + crack + down
    }),

  'gear-defend.wav': () =>
    render(0.24, (t) => {
      const tick = sine(920, t) * env(t, 0.001, 0.03) * 0.2
      const metal = sine(310, t) * env(t, 0.002, 0.07) * 0.16
      const tick2 = sine(1180, t) * env(t - 0.06, 0.001, 0.035) * 0.14
      return tick + metal + tick2
    }),

  'gear-cctv-fix.wav': () =>
    render(0.3, (t) => {
      const click = noise() * env(t, 0.0006, 0.012) * 0.14
      const thock = sine(160, t) * env(t, 0.002, 0.05) * 0.16
      const up = sine(520 + t * 420, t) * env(t - 0.04, 0.006, 0.12) * 0.18
      return click + thock + up
    }),

  'toxic-cctv-fix.wav': () =>
    render(0.26, (t) => {
      const hit = sine(90, t) * env(t, 0.001, 0.045) * 0.28
      const slap = noise() * env(t, 0.0008, 0.018) * 0.16
      const ping = sine(980, t) * env(t - 0.04, 0.003, 0.08) * 0.12
      return hit + slap + ping
    }),

  'sns-write.wav': () =>
    render(0.28, (t) => {
      const shutter = noise() * env(t, 0.0005, 0.01) * 0.18
      const blade = sine(2100, t) * env(t, 0.0008, 0.018) * 0.1
      const send = sine(740, t) * env(t - 0.05, 0.004, 0.1) * 0.12
      const soft = sine(320, t) * env(t - 0.04, 0.006, 0.12) * 0.08
      return shutter + blade + send + soft
    }),

  'studio-place.wav': () =>
    render(0.16, (t) => {
      const lock = sine(190, t) * env(t, 0.002, 0.04) * 0.2
      const snap = sine(760, t) * env(t, 0.001, 0.025) * 0.14
      const air = noise() * env(t, 0.0008, 0.012) * 0.05
      return lock + snap + air
    }),

  'rank-up.wav': () =>
    render(0.72, (t) => {
      const notes = [
        [0, 523.25],
        [0.09, 659.25],
        [0.18, 783.99],
        [0.3, 1046.5],
      ]
      let v = 0
      for (const [at, f] of notes) {
        v += sine(f, t - at) * env(t - at, 0.008, 0.22) * 0.18
      }
      v += sine(261.63, t) * env(t, 0.02, 0.4) * 0.08
      return v
    }),

  'training.wav': () =>
    render(0.4, (t) => {
      const whoosh = noise() * env(t, 0.004, 0.06) * 0.07
      const spark = sine(880, t) * env(t, 0.006, 0.14) * 0.16
      const spark2 = sine(1320, t) * env(t - 0.05, 0.005, 0.12) * 0.12
      const lift = sine(440 + t * 500, t) * env(t, 0.01, 0.16) * 0.1
      return whoosh + spark + spark2 + lift
    }),

  'training-promote.wav': () =>
    render(0.52, (t) => {
      const a = sine(392, t) * env(t, 0.01, 0.16) * 0.16
      const b = sine(523.25, t) * env(t - 0.08, 0.01, 0.18) * 0.16
      const c = sine(783.99, t) * env(t - 0.18, 0.012, 0.22) * 0.18
      const shimmer = sine(1568, t) * env(t - 0.2, 0.006, 0.12) * 0.05
      return a + b + c + shimmer
    }),

  'training-exam-success.wav': () =>
    render(0.62, (t) => {
      const a = sine(587.33, t) * env(t, 0.008, 0.16) * 0.16
      const b = sine(739.99, t) * env(t - 0.07, 0.008, 0.18) * 0.16
      const c = sine(880, t) * env(t - 0.14, 0.01, 0.22) * 0.18
      const d = sine(1174.66, t) * env(t - 0.24, 0.01, 0.2) * 0.12
      return a + b + c + d
    }),

  'training-exam-fail.wav': () =>
    render(0.58, (t) => {
      const a = sine(392, t) * env(t, 0.01, 0.16) * 0.18
      const b = sine(349.23, t) * env(t - 0.1, 0.01, 0.18) * 0.16
      const c = sine(277.18, t) * env(t - 0.22, 0.012, 0.24) * 0.18
      const dull = sine(110, t) * env(t, 0.02, 0.28) * 0.1
      return a + b + c + dull
    }),

  'training-roll.wav': () =>
    render(0.18, (t) => {
      const tick = sine(1480, t) * env(t, 0.0008, 0.018) * 0.1
      const tick2 = sine(980, t) * env(t - 0.045, 0.0008, 0.016) * 0.08
      const tick3 = sine(1240, t) * env(t - 0.09, 0.0008, 0.016) * 0.08
      const motor = sine(72, t) * 0.04 + noise() * env(t, 0.002, 0.05) * 0.03
      return tick + tick2 + tick3 + motor
    }),

  'audit-judge-attack.wav': () =>
    render(0.42, (t) => {
      const charge = sine(70 + t * 220, t) * env(t, 0.02, 0.22) * 0.2
      const whoosh = noise() * env(t, 0.008, 0.12) * 0.12
      const blade = sine(420 + t * 680, t) * env(t, 0.006, 0.16) * 0.14
      const snap = sine(1100, t) * env(t - 0.08, 0.002, 0.05) * 0.08
      return charge + whoosh + blade + snap
    }),

  'audit-judge-hit.wav': () =>
    render(0.36, (t) => {
      const thud = sine(95, t) * env(t, 0.002, 0.07) * 0.24
      const slap = noise() * env(t, 0.001, 0.02) * 0.12
      const spark = sine(980, t) * env(t, 0.003, 0.08) * 0.1
      const spark2 = sine(1480, t) * env(t - 0.04, 0.003, 0.1) * 0.08
      return thud + slap + spark + spark2
    }),

  'audit-card-hit.wav': () =>
    render(0.3, (t) => {
      const boom = sine(78, t) * env(t, 0.001, 0.06) * 0.28
      const crack = noise() * env(t, 0.0008, 0.022) * 0.16
      const sting = sine(620, t) * env(t, 0.002, 0.05) * 0.1
      const glass = sine(1680, t) * env(t - 0.03, 0.002, 0.04) * 0.06
      return boom + crack + sting + glass
    }),

  'audit-card-perform.wav': () =>
    render(0.34, (t) => {
      const sweep = sine(280 + t * 900, t) * env(t, 0.008, 0.12) * 0.14
      const air = noise() * env(t, 0.004, 0.06) * 0.07
      const hit = sine(520, t) * env(t - 0.06, 0.004, 0.1) * 0.16
      const shine = sine(1240, t) * env(t - 0.08, 0.004, 0.1) * 0.08
      return sweep + air + hit + shine
    }),

  'live-donation.wav': () =>
    render(0.36, (t) => {
      const coin = sine(980, t) * env(t, 0.002, 0.05) * 0.16
      const coin2 = sine(1310, t) * env(t - 0.04, 0.002, 0.06) * 0.14
      const coin3 = sine(1760, t) * env(t - 0.09, 0.003, 0.08) * 0.1
      const bag = sine(220, t) * env(t, 0.004, 0.08) * 0.1
      const sparkle = sine(2340, t) * env(t - 0.08, 0.002, 0.07) * 0.05
      return coin + coin2 + coin3 + bag + sparkle
    }),

  'live-viewers.wav': () =>
    render(0.32, (t) => {
      const pop = sine(360, t) * env(t, 0.003, 0.05) * 0.14
      const rise = sine(540 + t * 420, t) * env(t, 0.008, 0.12) * 0.12
      const ping = sine(1180, t) * env(t - 0.05, 0.003, 0.08) * 0.1
      const air = noise() * env(t, 0.004, 0.04) * 0.04
      return pop + rise + ping + air
    }),

  'asset-spend.wav': () =>
    render(0.28, (t) => {
      const drop = sine(520 - t * 280, t) * env(t, 0.003, 0.08) * 0.16
      const coin = sine(880, t) * env(t, 0.0015, 0.035) * 0.12
      const coin2 = sine(660, t) * env(t - 0.05, 0.002, 0.05) * 0.1
      const soft = sine(180, t) * env(t, 0.004, 0.1) * 0.08
      return drop + coin + coin2 + soft
    }),

  'sns-heat3.wav': () =>
    render(0.72, (t) => {
      const whoosh = noise() * env(t, 0.004, 0.08) * 0.1
      const boom = sine(70, t) * env(t, 0.004, 0.12) * 0.22
      const flash = sine(980, t) * env(t, 0.002, 0.05) * 0.12
      const shine = sine(1320, t) * env(t - 0.08, 0.006, 0.14) * 0.14
      const rise = sine(440 + t * 900, t) * env(t - 0.05, 0.01, 0.2) * 0.12
      const sparkle =
        sine(1760, t) * env(t - 0.16, 0.004, 0.1) * 0.08 +
        sine(2200, t) * env(t - 0.24, 0.004, 0.12) * 0.06
      return whoosh + boom + flash + shine + rise + sparkle
    }),
}

for (const [name, make] of Object.entries(recipes)) {
  writeWav(name, make())
  console.log(name)
}
