import { useEffect, useState } from 'react'

const STORAGE_KEY = 'broadcast-mosaic-block-px'
const LEGACY_STRENGTH_KEY = 'broadcast-mosaic-strength'
export const MOSAIC_BLOCK_PRESETS: readonly number[] = [0, 4, 6, 8, 12, 16, 20, 24]
const DEFAULT_BLOCK_PX = 8

let blockPx = loadBlockPx()
const listeners = new Set<() => void>()

function snapToPreset(px: number): number {
  if (px <= 0) return 0
  let best = DEFAULT_BLOCK_PX
  let bestDist = Number.POSITIVE_INFINITY
  for (const p of MOSAIC_BLOCK_PRESETS) {
    const d = Math.abs(p - px)
    if (d < bestDist) {
      bestDist = d
      best = p
    }
  }
  return best
}

function loadBlockPx(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw != null) {
      const n = Number(raw)
      if (Number.isFinite(n)) return snapToPreset(n)
    }
    // 이전 통합 강도(0~100) 저장값이 있으면 블록 px로 마이그레이션
    const legacy = localStorage.getItem(LEGACY_STRENGTH_KEY)
    if (legacy != null) {
      const n = Number(legacy)
      if (Number.isFinite(n)) {
        try {
          localStorage.removeItem(LEGACY_STRENGTH_KEY)
        } catch {
          // ignore
        }
        return snapToPreset(Math.round(n * 0.5))
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
