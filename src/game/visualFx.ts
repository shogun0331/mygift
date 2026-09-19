import { useEffect, useState } from 'react'

const STORAGE_KEY = 'broadcast-mosaic-block-px'
const LEGACY_STRENGTH_KEY = 'broadcast-mosaic-strength'
/** 음수 = DLsite 긴 변 기준 자동 셀 */
export const MOSAIC_ADAPTIVE = -1
export const MOSAIC_BLOCK_PRESETS: readonly number[] = [MOSAIC_ADAPTIVE, 0]
const DEFAULT_BLOCK_PX = MOSAIC_ADAPTIVE

let blockPx = loadBlockPx()
const listeners = new Set<() => void>()

function snapToPreset(px: number): number {
  if (px === 0) return 0
  return MOSAIC_ADAPTIVE
}

function loadBlockPx(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw != null) {
      const n = Number(raw)
      if (Number.isFinite(n)) return snapToPreset(n)
    }
    const legacy = localStorage.getItem(LEGACY_STRENGTH_KEY)
    if (legacy != null) {
      const n = Number(legacy)
      if (Number.isFinite(n)) {
        try {
          localStorage.removeItem(LEGACY_STRENGTH_KEY)
        } catch {
          // ignore
        }
        return MOSAIC_ADAPTIVE
      }
    }
    return DEFAULT_BLOCK_PX
  } catch {
    return DEFAULT_BLOCK_PX
  }
}

function emit() {
  for (const listener of listeners) listener()
}

export function getMosaicBlockPx() {
  return blockPx
}

/** 플레이·굽기: 0(없음)도 적응형으로 본다. 에디터 미리보기만 0을 허용. */
export function getPlaybackMosaicBlockPx() {
  return blockPx <= 0 ? MOSAIC_ADAPTIVE : blockPx
}

export function isMosaicAdaptive(px: number) {
  return px < 0
}

export function mosaicBlockLabel(px: number) {
  if (px === 0) return '없음'
  return 'DLsite 자동'
}

export function setMosaicBlockPx(next: number) {
  blockPx = snapToPreset(Math.round(next))
  try {
    localStorage.setItem(STORAGE_KEY, String(blockPx))
  } catch {
    // ignore
  }
  emit()
}

export function useMosaicBlockPx() {
  const [value, setValue] = useState(blockPx)
  useEffect(() => {
    const onChange = () => setValue(getMosaicBlockPx())
    listeners.add(onChange)
    return () => {
      listeners.delete(onChange)
    }
  }, [])
  return value
}
