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
let sfxSuspended = false

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

const DEFAULT_SFX_GAIN: Partial<Record<SfxId, number>> = {
  'live-donation': 0.4,
  'live-viewers': 0.3,
}

export function setSfxSuspended(next: boolean) {
  if (sfxSuspended === next) return
  sfxSuspended = next
  if (next) {
    for (const audio of loops.values()) audio.pause()
    for (const list of pools.values()) {
      for (const audio of list) audio.pause()
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'running') {
      void sharedAudioCtx.suspend()
    }
    return
  }
  for (const audio of loops.values()) {
    void audio.play().catch(() => {})
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume()
  }
}

export function playSfx(id: SfxId, options?: { loop?: boolean; gain?: number }) {
  if (sfxSuspended) return
  const defaultGain = DEFAULT_SFX_GAIN[id] ?? 1
  const gain = clamp01(options?.gain ?? defaultGain)
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
  if (sfxSuspended) return null
  if (typeof window === 'undefined') return null
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioCtx) return null
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx()
  }
  if (sharedAudioCtx.state === 'suspended' && !sfxSuspended) {
    void sharedAudioCtx.resume()
  }
  return sharedAudioCtx
}

/** 팬미팅 오프닝 제목. 글자가 모일 때 올라가고, 0.84초에 맺히며, 사라질 때 내려간다. */
export function playFanOpeningSting(): () => void {
  const stoppers: Array<() => void> = []
  try {
    const ctx = getSharedAudioContext()
    if (!ctx) return () => {}
    const vol = volume * 0.5
    if (vol <= 0.01) return () => {}
    const now = ctx.currentTime

    const sweep = ctx.createOscillator()
    const sweepGain = ctx.createGain()
    sweep.type = 'sine'
    sweep.frequency.setValueAtTime(220, now)
    sweep.frequency.exponentialRampToValueAtTime(880, now + 0.72)
    sweepGain.gain.setValueAtTime(0.001, now)
    sweepGain.gain.exponentialRampToValueAtTime(vol * 0.16, now + 0.32)
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)
    sweep.connect(sweepGain)
    sweepGain.connect(ctx.destination)
    sweep.start(now)
    sweep.stop(now + 0.82)
    stoppers.push(() => sweep.stop())

    ;[523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => {
      const start = 0.4 + index * 0.1
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + start)
      gain.gain.setValueAtTime(0.001, now + start)
      gain.gain.exponentialRampToValueAtTime(vol * 0.22, now + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + 0.22)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + 0.24)
      stoppers.push(() => osc.stop())
    })

    ;[523.25, 659.25, 783.99].forEach((freq) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + 0.84)
      gain.gain.setValueAtTime(0.001, now + 0.84)
      gain.gain.exponentialRampToValueAtTime(vol * 0.28, now + 0.88)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.7)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + 0.84)
      osc.stop(now + 1.72)
      stoppers.push(() => osc.stop())
    })

    const exit = ctx.createOscillator()
    const exitGain = ctx.createGain()
    exit.type = 'sine'
    exit.frequency.setValueAtTime(740, now + 2.3)
    exit.frequency.exponentialRampToValueAtTime(196, now + 2.95)
    exitGain.gain.setValueAtTime(0.001, now + 2.3)
    exitGain.gain.exponentialRampToValueAtTime(vol * 0.14, now + 2.42)
    exitGain.gain.exponentialRampToValueAtTime(0.001, now + 2.98)
    exit.connect(exitGain)
    exitGain.connect(ctx.destination)
    exit.start(now + 2.3)
    exit.stop(now + 3)
    stoppers.push(() => exit.stop())
  } catch {
    return () => {}
  }
  return () => {
    for (const stop of stoppers) {
      try {
        stop()
      } catch {
        // already stopped
      }
    }
  }
}

/** 팬미팅 취향 저격. 부드러운 차임. */
export function playFanTasteSting(delay = 0) {
  try {
    const ctx = getSharedAudioContext()
    if (!ctx) return
    const vol = volume * 0.55
    if (vol <= 0.01) return
    const now = ctx.currentTime + delay
    ;[523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => {
      const start = index * 0.07
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + start)
      gain.gain.setValueAtTime(0.001, now + start)
      gain.gain.exponentialRampToValueAtTime(vol * 0.28, now + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + 0.38)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + 0.4)
    })
  } catch {
    // ignore
  }
}

/** 승급심사관이 마음에 들어 할 때의 반응. full이면 게이지를 채운 순간. */
export function playAuditJudgePleased(full = false) {
  try {
    const ctx = getSharedAudioContext()
    if (!ctx) return
    const vol = volume * (full ? 0.92 : 0.72)
    if (vol <= 0.01) return
    const now = ctx.currentTime

    const body = ctx.createOscillator()
    const bodyGain = ctx.createGain()
    body.type = 'sine'
    body.frequency.setValueAtTime(full ? 196 : 164, now)
    body.frequency.exponentialRampToValueAtTime(full ? 98 : 110, now + 0.28)
    bodyGain.gain.setValueAtTime(vol * (full ? 0.42 : 0.22), now)
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + (full ? 0.42 : 0.26))
    body.connect(bodyGain)
    bodyGain.connect(ctx.destination)
    body.start(now)
    body.stop(now + (full ? 0.44 : 0.28))

    const notes = full
      ? [
          { freq: 523.25, start: 0.02, duration: 0.22 },
          { freq: 659.25, start: 0.1, duration: 0.24 },
          { freq: 783.99, start: 0.18, duration: 0.28 },
          { freq: 1046.5, start: 0.28, duration: 0.7 },
          { freq: 1318.51, start: 0.34, duration: 0.64 },
          { freq: 1567.98, start: 0.4, duration: 0.58 },
        ]
      : [
          { freq: 392, start: 0.02, duration: 0.2 },
          { freq: 493.88, start: 0.08, duration: 0.22 },
          { freq: 587.33, start: 0.15, duration: 0.28 },
          { freq: 783.99, start: 0.22, duration: 0.36 },
        ]

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = full ? 'triangle' : 'sine'
      osc.frequency.setValueAtTime(freq, now + start)
      gain.gain.setValueAtTime(0.001, now + start)
      gain.gain.exponentialRampToValueAtTime(vol * (full ? 0.22 : 0.2), now + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + duration + 0.02)
    })

    if (!full) return

    const shine = ctx.createOscillator()
    const shineGain = ctx.createGain()
    shine.type = 'sine'
    shine.frequency.setValueAtTime(2093, now + 0.36)
    shineGain.gain.setValueAtTime(0.001, now + 0.36)
    shineGain.gain.exponentialRampToValueAtTime(vol * 0.12, now + 0.4)
    shineGain.gain.exponentialRampToValueAtTime(0.001, now + 0.95)
    shine.connect(shineGain)
    shineGain.connect(ctx.destination)
    shine.start(now + 0.36)
    shine.stop(now + 0.98)
  } catch {
    // ignore
  }
}

/** 팬미팅 크리티컬. 짧은 타격 뒤에 높은 핑. */
export function playFanCriticalSting() {
  try {
    const ctx = getSharedAudioContext()
    if (!ctx) return
    const vol = volume * 0.6
    if (vol <= 0.01) return
    const now = ctx.currentTime

    const hit = ctx.createOscillator()
    const hitGain = ctx.createGain()
    hit.type = 'square'
    hit.frequency.setValueAtTime(180, now)
    hit.frequency.exponentialRampToValueAtTime(70, now + 0.12)
    hitGain.gain.setValueAtTime(vol * 0.2, now)
    hitGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14)
    hit.connect(hitGain)
    hitGain.connect(ctx.destination)
    hit.start(now)
    hit.stop(now + 0.16)

    ;[880, 1318.5].forEach((freq, index) => {
      const start = 0.04 + index * 0.06
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + start)
      gain.gain.setValueAtTime(0.001, now + start)
      gain.gain.exponentialRampToValueAtTime(vol * 0.34, now + start + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + 0.22)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + 0.24)
    })
  } catch {
    // ignore
  }
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

/** 카드 넘기기 / 드로우 효과음 (Swish / Flip Sound) */
export function playCardFlipSound() {
  try {
    const ctx = getSharedAudioContext()
    if (!ctx) return
    const vol = volume * 0.5
    if (vol <= 0.01) return

    const now = ctx.currentTime

    // 노이즈 버스트 (카드 마찰음)
    const bufferSize = ctx.sampleRate * 0.06
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(1200, now)
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.06)
    filter.Q.setValueAtTime(3, now)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(vol * 0.4, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    noise.start(now)
    noise.stop(now + 0.06)

    // 카드 착지 스냅 톤 (Snap tone)
    const osc = ctx.createOscillator()
    const snapGain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(450, now)
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.04)

    snapGain.gain.setValueAtTime(vol * 0.3, now)
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)

    osc.connect(snapGain)
    snapGain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.04)
  } catch {
    // ignore
  }
}

/** 배팅 버튼 클릭 / 칩 베팅 사운드 (Chip Drop / Bet Snap Sound) */
export function playBetClickSound() {
  try {
    const ctx = getSharedAudioContext()
    if (!ctx) return
    const vol = volume * 0.6
    if (vol <= 0.01) return

    const now = ctx.currentTime

    // 1. 칩 팅기는 맑은 피치 핑
    const pingOsc = ctx.createOscillator()
    const pingGain = ctx.createGain()
    pingOsc.type = 'sine'
    pingOsc.frequency.setValueAtTime(1800, now)
    pingOsc.frequency.exponentialRampToValueAtTime(800, now + 0.05)

    pingGain.gain.setValueAtTime(vol * 0.5, now)
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)

    pingOsc.connect(pingGain)
    pingGain.connect(ctx.destination)

    pingOsc.start(now)
    pingOsc.stop(now + 0.05)

    // 2. 칩 묵직한 탁 소리 (Low Thud)
    const thudOsc = ctx.createOscillator()
    const thudGain = ctx.createGain()
    thudOsc.type = 'triangle'
    thudOsc.frequency.setValueAtTime(250, now)
    thudOsc.frequency.exponentialRampToValueAtTime(60, now + 0.08)

    thudGain.gain.setValueAtTime(vol * 0.6, now)
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

    thudOsc.connect(thudGain)
    thudGain.connect(ctx.destination)

    thudOsc.start(now)
    thudOsc.stop(now + 0.08)
  } catch {
    // ignore
  }
}

/** 하이로우 승리 사운드 (High-Low Win Fanfare Sound) */
export function playHighLowWinSound(isBigWin = false) {
  try {
    const ctx = getSharedAudioContext()
    if (!ctx) return
    const vol = volume * 0.75
    if (vol <= 0.01) return

    const now = ctx.currentTime

    if (isBigWin) {
      // 대형 3연승/6연승 팡파르 (C5 -> E5 -> G5 -> C6 -> E6 메가 아르페지오)
      const notes = [
        { freq: 523.25, start: 0, duration: 0.1 },
        { freq: 659.25, start: 0.08, duration: 0.1 },
        { freq: 783.99, start: 0.16, duration: 0.1 },
        { freq: 1046.5, start: 0.24, duration: 0.15 },
        { freq: 1318.51, start: 0.36, duration: 0.7 },
        { freq: 1567.98, start: 0.36, duration: 0.7 },
      ]

      notes.forEach(({ freq, start, duration }) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, now + start)

        gain.gain.setValueAtTime(0, now + start)
        gain.gain.linearRampToValueAtTime(vol * 0.45, now + start + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now + start)
        osc.stop(now + start + duration)
      })
    } else {
      // 일반 승리 3화음 (G5 -> C6 -> E6)
      const notes = [
        { freq: 783.99, start: 0, duration: 0.12 },
        { freq: 1046.5, start: 0.09, duration: 0.15 },
        { freq: 1318.51, start: 0.18, duration: 0.45 },
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
    }
  } catch {
    // ignore
  }
}

/** 하이로우 패배 사운드 (High-Low Defeat Sound) */
export function playHighLowLossSound() {
  try {
    const ctx = getSharedAudioContext()
    if (!ctx) return
    const vol = volume * 0.7
    if (vol <= 0.01) return

    const now = ctx.currentTime

    // 하강하는 어두운 톤 (Sawtooth pitch drop)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(320, now)
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.35)

    gain.gain.setValueAtTime(vol * 0.35, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.35)

    // 패배 쿵 베이스
    const subOsc = ctx.createOscillator()
    const subGain = ctx.createGain()
    subOsc.type = 'sine'
    subOsc.frequency.setValueAtTime(110, now + 0.05)
    subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.4)

    subGain.gain.setValueAtTime(vol * 0.5, now + 0.05)
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

    subOsc.connect(subGain)
    subGain.connect(ctx.destination)

    subOsc.start(now + 0.05)
    subOsc.stop(now + 0.4)
  } catch {
    // ignore
  }
}

/** 하이로우 무승부 / 쉴드 발동 사운드 */
export function playHighLowDrawSound() {
  try {
    const ctx = getSharedAudioContext()
    if (!ctx) return
    const vol = volume * 0.5
    if (vol <= 0.01) return

    const now = ctx.currentTime
    const notes = [
      { freq: 587.33, start: 0, duration: 0.15 }, // D5
      { freq: 587.33, start: 0.12, duration: 0.25 }, // D5 double tap
    ]

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + start)

      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(vol * 0.3, now + start + 0.01)
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

/** 아이템 사용 이펙트 사운드 (Magic Sparkle Up Sound) */
export function playItemUseSound() {
  try {
    const ctx = getSharedAudioContext()
    if (!ctx) return
    const vol = volume * 0.65
    if (vol <= 0.01) return

    const now = ctx.currentTime
    const notes = [
      { freq: 1318.51, start: 0, duration: 0.1 }, // E6
      { freq: 1567.98, start: 0.06, duration: 0.1 }, // G6
      { freq: 1975.53, start: 0.12, duration: 0.1 }, // B6
      { freq: 2637.02, start: 0.18, duration: 0.35 }, // E7
    ]

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + start)

      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(vol * 0.35, now + start + 0.01)
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

/** QWAPPY 로고 스플래시 — 귀여운 글자 팝 + 소프트 징글 */
export function playQwappyLogoSound() {
  try {
    const ctx = getSharedAudioContext()
    if (!ctx) return
    const vol = volume * 0.72
    if (vol <= 0.01) return

    const now = ctx.currentTime

    // 1) 부드러운 등장 후쉬
    {
      const bufferSize = Math.floor(ctx.sampleRate * 0.35)
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
      }
      const noise = ctx.createBufferSource()
      noise.buffer = buffer
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(900, now)
      filter.frequency.exponentialRampToValueAtTime(2200, now + 0.28)
      filter.Q.value = 0.7
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(vol * 0.12, now + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
      noise.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      noise.start(now)
      noise.stop(now + 0.35)
    }

    // 2) 글자 팝에 맞춘 퐁퐁 플링크 (CSS delay: 80 + i*70ms)
    const letterFreqs = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]
    letterFreqs.forEach((freq, i) => {
      const start = 0.08 + i * 0.07
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + start)
      osc.frequency.exponentialRampToValueAtTime(freq * 1.04, now + start + 0.08)
      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(vol * 0.28, now + start + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + 0.18)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + 0.2)

      const harm = ctx.createOscillator()
      const harmGain = ctx.createGain()
      harm.type = 'triangle'
      harm.frequency.setValueAtTime(freq * 2, now + start)
      harmGain.gain.setValueAtTime(0, now + start)
      harmGain.gain.linearRampToValueAtTime(vol * 0.08, now + start + 0.01)
      harmGain.gain.exponentialRampToValueAtTime(0.001, now + start + 0.12)
      harm.connect(harmGain)
      harmGain.connect(ctx.destination)
      harm.start(now + start)
      harm.stop(now + start + 0.14)
    })

    // 3) 로고 완성 소프트 메이저 징글
    const resolve = [
      { freq: 523.25, start: 0.55, duration: 0.35, level: 0.22 },
      { freq: 659.25, start: 0.55, duration: 0.4, level: 0.2 },
      { freq: 783.99, start: 0.62, duration: 0.45, level: 0.24 },
      { freq: 1046.5, start: 0.7, duration: 0.7, level: 0.3 },
      { freq: 1318.51, start: 0.78, duration: 0.55, level: 0.16 },
    ]
    resolve.forEach(({ freq, start, duration, level }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + start)
      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(vol * level, now + start + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + duration + 0.02)
    })

    // 4) 꼬리 스파클
    ;[1567.98, 1975.53, 2349.32].forEach((freq, i) => {
      const start = 1.05 + i * 0.07
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + start)
      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(vol * 0.14, now + start + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + 0.22)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + 0.24)
    })
  } catch {
    // ignore
  }
}

/** 로고 씬 퇴장 — 짧은 소프트 차임 */
export function playQwappyLogoExitSound() {
  try {
    const ctx = getSharedAudioContext()
    if (!ctx) return
    const vol = volume * 0.55
    if (vol <= 0.01) return

    const now = ctx.currentTime
    const notes = [
      { freq: 880.0, start: 0, duration: 0.18 },
      { freq: 659.25, start: 0.06, duration: 0.22 },
      { freq: 523.25, start: 0.12, duration: 0.28 },
    ]
    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + start)
      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(vol * 0.18, now + start + 0.015)
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

