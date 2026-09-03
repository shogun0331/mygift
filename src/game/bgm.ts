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

let library: GameBgmConfig = emptyBgmConfig()
let currentTrack: BgmTrack | null = null
let audio: HTMLAudioElement | null = null

export function setBgmLibrary(config: GameBgmConfig) {
  library = normalizeBgmConfig(config)
  if (currentTrack) startTrack(currentTrack, true)
}

function startTrack(track: BgmTrack, force = false) {
  const url = bgmTrackUrl(library, track)
  if (!url) {
    stopBgm()
    currentTrack = track
    return
  }
  if (!force && currentTrack === track && audio && !audio.paused && audio.getAttribute('src') === url) {
    return
  }
  currentTrack = track
  if (!audio) {
    audio = new Audio()
    audio.loop = true
    audio.volume = 0.7
  }
  if (audio.getAttribute('src') !== url) {
    audio.src = url
  }
  void audio.play().catch(() => {})
}

export function stopBgm() {
  if (!audio) return
  audio.pause()
  audio.removeAttribute('src')
  audio.load()
}

export function playBgmTrack(track: BgmTrack | null) {
  if (!track) {
    currentTrack = null
    stopBgm()
    return
  }
  startTrack(track)
}

export function useGameBgm(track: BgmTrack | null) {
  useEffect(() => {
    playBgmTrack(track)
  }, [track])
}
