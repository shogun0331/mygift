export const SFX_IDS = [
  'ui-click',
  'condition-recover',
  'toxic',
  'toxic-defend',
  'gear-fail',
  'gear-defend',
  'gear-cctv-fix',
  'toxic-cctv-fix',
  'sns-write',
  'studio-place',
  'rank-up',
  'training',
  'training-promote',
  'training-exam-success',
  'training-exam-fail',
  'training-roll',
  'audit-judge-attack',
  'audit-judge-hit',
  'audit-card-hit',
  'audit-card-perform',
  'live-donation',
  'live-viewers',
  'asset-spend',
  'sns-heat3',
] as const

export type SfxId = (typeof SFX_IDS)[number]

const VOLUME_KEY = 'broadcast-se-volume'
const BUTTON_SELECTOR = [
  'button',
  '[role="button"]',
  'label.game-btn',
  'label.game-btn-primary',
  '.game-btn',
  '.game-btn-primary',
  '.game-btn-tab',
  '.game-menu-btn',
  '.game-btn-pink',
].join(',')

const SRC: Record<SfxId, string> = Object.fromEntries(
  SFX_IDS.map((id) => [id, `${import.meta.env.BASE_URL}sfx/${id}.wav`]),
) as Record<SfxId, string>

let volume = loadVolume()
const pools = new Map<SfxId, HTMLAudioElement[]>()
const poolIndex = new Map<SfxId, number>()
const loops = new Map<SfxId, HTMLAudioElement>()
let listening = false

function clamp01(value: number) {
  if (Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function loadVolume() {
  try {
    const raw = localStorage.getItem(VOLUME_KEY)
    if (raw == null) return 0.8
    const asPercent = Number(raw)
    if (asPercent > 1) return clamp01(asPercent / 100)
    return clamp01(asPercent)
  } catch {
    return 0.8
  }
}

function poolFor(id: SfxId) {
  let list = pools.get(id)
  if (!list) {
    list = Array.from({ length: 3 }, () => {
      const audio = new Audio(SRC[id])
      audio.preload = 'auto'
      return audio
    })
    pools.set(id, list)
    poolIndex.set(id, 0)
  }
  return list
}

export function getSeVolumePercent() {
  return Math.round(volume * 100)
}

export function setSeVolumePercent(percent: number) {
  volume = clamp01(percent / 100)
  try {
    localStorage.setItem(VOLUME_KEY, String(Math.round(volume * 100)))
  } catch {
    // ignore
  }
  for (const audio of loops.values()) audio.volume = volume
}

export function playSfx(id: SfxId, options?: { loop?: boolean; gain?: number }) {
  const gain = clamp01(options?.gain ?? 1)
  const level = volume * gain
  if (level <= 0.001) return
  if (options?.loop) {
    stopSfx(id)
    const audio = new Audio(SRC[id])
    audio.loop = true
    audio.volume = level
    loops.set(id, audio)
    void audio.play().catch(() => {})
    return
  }
  const list = poolFor(id)
  const index = poolIndex.get(id) ?? 0
  const audio = list[index % list.length]
  poolIndex.set(id, index + 1)
  audio.volume = level
  audio.currentTime = 0
  void audio.play().catch(() => {})
}

export function stopSfx(id: SfxId) {
  const audio = loops.get(id)
  if (!audio) return
  audio.pause()
  audio.removeAttribute('src')
  audio.load()
  loops.delete(id)
}

export function playUiClick() {
  playSfx('ui-click')
}

function isUiButton(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  const hit = target.closest(BUTTON_SELECTOR)
  if (!(hit instanceof Element)) return false
  if (hit.closest('[data-no-ui-click]')) return false
  if (hit instanceof HTMLButtonElement && hit.disabled) return false
  if (hit.getAttribute('aria-disabled') === 'true') return false
  return true
}

export function initUiClickSounds() {
  if (listening) return
  listening = true
  document.addEventListener(
    'click',
    (event) => {
      if (!isUiButton(event.target)) return
      playUiClick()
    },
    true,
  )
}

let sharedAudioCtx: AudioContext | null = null

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioCtx) return null
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx()
  }
  if (sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume()
  }
  return sharedAudioCtx
}

/** 승급 통과 성공 웅장한 팡파르 (Web Audio Synth Fanfare) */
export function playAuditPassFanfare() {
  try {
    const ctx = getSharedAudioContext()
    if (!ctx) return
    const vol = volume * 0.85
    if (vol <= 0.01) return

    const now = ctx.currentTime

    // 1. 팡파르 트럼펫 아르페지오 (C5 - E5 - G5 - C6) & 빅 승리 3화음
    const notes = [
      { freq: 523.25, start: 0, duration: 0.12 },
      { freq: 659.25, start: 0.12, duration: 0.12 },
      { freq: 783.99, start: 0.24, duration: 0.12 },
      { freq: 1046.5, start: 0.36, duration: 0.4 },
      // 💥 메인 하이라이트 승리 화음 (C6 + E6 + G6)
      { freq: 1046.5, start: 0.8, duration: 1.1 },
      { freq: 1318.51, start: 0.8, duration: 1.1 },
      { freq: 1567.98, start: 0.8, duration: 1.1 },
      { freq: 2093.0, start: 0.8, duration: 1.1 },
    ]

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + start)

      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(vol * 0.35, now + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + start)
      osc.stop(now + start + duration)
    })

    // 축하 팀파니 드럼 쿵 소리
    const drumOsc = ctx.createOscillator()
    const drumGain = ctx.createGain()
    drumOsc.type = 'sine'
    drumOsc.frequency.setValueAtTime(140, now + 0.8)
    drumOsc.frequency.exponentialRampToValueAtTime(35, now + 1.25)
    drumGain.gain.setValueAtTime(vol * 0.6, now + 0.8)
    drumGain.gain.exponentialRampToValueAtTime(0.001, now + 1.25)
    drumOsc.connect(drumGain)
    drumGain.connect(ctx.destination)
    drumOsc.start(now + 0.8)
    drumOsc.stop(now + 1.25)
  } catch {
    // ignore AudioContext error
  }
}

/** 슬롯머신 소형 당첨 사운드 (3단계 상쾌한 차임벨) */
export function playSlotWinSmallSound() {
  try {
    const ctx = getSharedAudioContext()
    if (!ctx) return
    const vol = volume * 0.7
    if (vol <= 0.01) return

    const now = ctx.currentTime
    const notes = [
      { freq: 783.99, start: 0, duration: 0.15 }, // G5
      { freq: 987.77, start: 0.08, duration: 0.15 }, // B5
      { freq: 1174.66, start: 0.16, duration: 0.35 }, // D6
    ]

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + start)

      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(vol * 0.4, now + start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + start)
      osc.stop(now + start + duration)
    })
  } catch {
    // ignore
  }
}

/** 슬롯머신 중형 당첨 사운드 (화려한 5음 팡파르 & 신디 차임) */
export function playSlotWinMediumSound() {
  try {
    const ctx = getSharedAudioContext()
    if (!ctx) return
    const vol = volume * 0.8
    if (vol <= 0.01) return

    const now = ctx.currentTime
    const notes = [
      { freq: 523.25, start: 0, duration: 0.1 }, // C5
      { freq: 659.25, start: 0.08, duration: 0.1 }, // E5
      { freq: 783.99, start: 0.16, duration: 0.1 }, // G5
      { freq: 1046.5, start: 0.24, duration: 0.18 }, // C6
      { freq: 1318.51, start: 0.36, duration: 0.6 }, // E6
      { freq: 1567.98, start: 0.36, duration: 0.6 }, // G6
    ]

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + start)

      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(vol * 0.45, now + start + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + start)
      osc.stop(now + start + duration)
    })
  } catch {
    // ignore
  }
}

/** 슬롯머신 잭팟/대형 당첨 사운드 (웅장한 메가 팡파르 & 쿵 심벌즈) */
export function playSlotWinBigSound() {
  try {
    const ctx = getSharedAudioContext()
    if (!ctx) return
    const vol = volume * 0.9
    if (vol <= 0.01) return

    const now = ctx.currentTime
    const notes = [
      { freq: 523.25, start: 0, duration: 0.12 },
      { freq: 659.25, start: 0.1, duration: 0.12 },
      { freq: 783.99, start: 0.2, duration: 0.12 },
      { freq: 1046.5, start: 0.3, duration: 0.15 },
      { freq: 1318.51, start: 0.45, duration: 0.8 },
      { freq: 1567.98, start: 0.45, duration: 0.8 },
      { freq: 2093.0, start: 0.45, duration: 1.0 },
    ]

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, now + start)

      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(vol * 0.35, now + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + start)
      osc.stop(now + start + duration)
    })

    // 임팩트 베이스 쿵
    const bassOsc = ctx.createOscillator()
    const bassGain = ctx.createGain()
    bassOsc.type = 'sine'
    bassOsc.frequency.setValueAtTime(150, now + 0.45)
    bassOsc.frequency.exponentialRampToValueAtTime(30, now + 1.2)
    bassGain.gain.setValueAtTime(vol * 0.7, now + 0.45)
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2)
    bassOsc.connect(bassGain)
    bassGain.connect(ctx.destination)
    bassOsc.start(now + 0.45)
    bassOsc.stop(now + 1.2)
  } catch {
    // ignore
  }
}

/** 돈 올라가는 카운트업 틱 사운드 */
export function playCoinCountUpTickSound(step = 0) {
  try {
    const ctx = getSharedAudioContext()
    if (!ctx) return
    const vol = volume * 0.4
    if (vol <= 0.01) return

    const now = ctx.currentTime
    const baseFreq = 900 + (step % 8) * 80 // 계단식 피치 상승
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(baseFreq, now)

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(vol * 0.25, now + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.04)
  } catch {
    // ignore
  }
}

