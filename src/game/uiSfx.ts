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
