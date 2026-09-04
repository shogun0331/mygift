import { useEffect } from 'react'
import { resolveMediaSrc } from './mediaUrl'

export const BGM_TRACKS = ['menu', 'ingame', 'live', 'audit', 'casino'] as const

export type BgmTrack = (typeof BGM_TRACKS)[number]

export type BgmSlot = {
  fileName: string | null
}

export type GameBgmConfig = Record<BgmTrack, BgmSlot>

export const BGM_TRACK_META: Record<
  BgmTrack,
  { title: string; desc: string }
> = {
  menu: {
    title: '메인화면 BGM',
    desc: '타이틀·메인 메뉴에서 재생됩니다.',
  },
  ingame: {
    title: '인게임 기본 BGM',
    desc: '방송 준비·사무실 화면에서 재생됩니다.',
  },
  live: {
    title: '방송중 BGM',
    desc: 'ON AIR 방송 진행 중에 재생됩니다.',
  },
  audit: {
    title: '방송국 승급심사 BGM',
    desc: '방송국 승급심사(서류 통과·덱 편성·공연 심사)에서 재생됩니다.',
  },
  casino: {
    title: '카지노 BGM',
    desc: 'VIP 하이-로우 카지노에서 재생됩니다.',
  },
}

export function emptyBgmConfig(): GameBgmConfig {
  return {
    menu: { fileName: null },
    ingame: { fileName: null },
    live: { fileName: null },
    audit: { fileName: null },
    casino: { fileName: null },
  }
}

function normalizeSlot(raw: unknown): BgmSlot {
  if (!raw || typeof raw !== 'object') return { fileName: null }
  const fileName = String((raw as { fileName?: unknown }).fileName ?? '').trim()
  return { fileName: fileName || null }
}

export function normalizeBgmConfig(raw: unknown): GameBgmConfig {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const next = emptyBgmConfig()
  for (const track of BGM_TRACKS) {
    next[track] = normalizeSlot(row[track])
  }
  return next
}

export function bgmMediaPath(fileName: string) {
  return `media://chapter_assets/bgm/${fileName}`
}

export function bgmTrackUrl(config: GameBgmConfig, track: BgmTrack): string | null {
  const fileName = config[track]?.fileName
  if (!fileName) return null
  return resolveMediaSrc(bgmMediaPath(fileName))
}

const VOLUME_KEY = 'broadcast-bgm-volume'

type BgmRuntime = {
  library: GameBgmConfig
  desiredTrack: BgmTrack | null
  silenceLocks: number
  audio: HTMLAudioElement | null
  volume: number
  persistTimer: ReturnType<typeof setTimeout> | null
}

function clamp01(value: number) {
  if (Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function loadBgmVolume() {
  try {
    const raw = localStorage.getItem(VOLUME_KEY)
    if (raw == null) return 0.7
    const asPercent = Number(raw)
    if (asPercent > 1) return clamp01(asPercent / 100)
    return clamp01(asPercent)
  } catch {
    return 0.7
  }
}

/** HMR 후에도 같은 Audio 인스턴스를 쓰도록 런타임 상태를 유지 */
const runtime: BgmRuntime = (() => {
  const g = globalThis as typeof globalThis & { __broadcastBgmRuntime?: BgmRuntime }
  if (g.__broadcastBgmRuntime) return g.__broadcastBgmRuntime
  const created: BgmRuntime = {
    library: emptyBgmConfig(),
    desiredTrack: null,
    silenceLocks: 0,
    audio: null,
    volume: loadBgmVolume(),
    persistTimer: null,
  }
  g.__broadcastBgmRuntime = created
  return created
})()

function applyBgmVolume() {
  const el = runtime.audio
  if (!el) return
  const level = runtime.volume
  el.muted = level <= 0.001
  el.volume = level
}

export function getBgmVolumePercent() {
  return Math.round(runtime.volume * 100)
}

export function setBgmVolumePercent(percent: number) {
  runtime.volume = clamp01(percent / 100)
  applyBgmVolume()
  if (runtime.persistTimer) clearTimeout(runtime.persistTimer)
  runtime.persistTimer = setTimeout(() => {
    runtime.persistTimer = null
    try {
      localStorage.setItem(VOLUME_KEY, String(Math.round(runtime.volume * 100)))
    } catch {
      // ignore
    }
  }, 120)
}

export function setBgmLibrary(config: GameBgmConfig) {
  runtime.library = normalizeBgmConfig(config)
  syncPlayback()
}

function stopBgmAudio() {
  const el = runtime.audio
  if (!el) return
  try {
    el.pause()
    el.currentTime = 0
    el.removeAttribute('src')
    el.load()
  } catch {
    // ignore
  }
}

function ensureAudio() {
  if (runtime.audio) return runtime.audio
  const el = new Audio()
  el.loop = true
  el.preload = 'auto'
  runtime.audio = el
  applyBgmVolume()
  return el
}

function startTrack(track: BgmTrack, force = false) {
  const url = bgmTrackUrl(runtime.library, track)
  if (!url) {
    stopBgmAudio()
    return
  }
  const el = ensureAudio()
  applyBgmVolume()
  if (!force && !el.paused && el.getAttribute('src') === url) {
    return
  }
  if (el.getAttribute('src') !== url) {
    el.src = url
  }
  void el.play().catch(() => {})
}

function syncPlayback(force = false) {
  if (runtime.silenceLocks > 0 || !runtime.desiredTrack) {
    stopBgmAudio()
    return
  }
  startTrack(runtime.desiredTrack, force)
}

/** 게임 BGM 즉시 정지 */
export function stopBgm() {
  runtime.desiredTrack = null
  stopBgmAudio()
}

/** VN 등 오버레이용 — 잠금 동안 게임 BGM 재생 금지 */
export function acquireBgmSilence() {
  runtime.silenceLocks += 1
  stopBgmAudio()
}

export function releaseBgmSilence() {
  runtime.silenceLocks = Math.max(0, runtime.silenceLocks - 1)
  syncPlayback()
}

export function playBgmTrack(track: BgmTrack | null) {
  runtime.desiredTrack = track
  syncPlayback()
}

export function useGameBgm(track: BgmTrack | null) {
  useEffect(() => {
    playBgmTrack(track)
  }, [track])
}

/** 마운트 동안 게임 BGM을 강제 무음 */
export function useBgmSilence(active = true) {
  useEffect(() => {
    if (!active) return
    acquireBgmSilence()
    return () => releaseBgmSilence()
  }, [active])
}
