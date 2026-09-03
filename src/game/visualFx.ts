import { useEffect, useState } from 'react'

const STORAGE_KEY = 'broadcast-mosaic-strength'
const DEFAULT_STRENGTH = 50

let strength = loadStrength()
const listeners = new Set<() => void>()

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function loadStrength() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw == null) return DEFAULT_STRENGTH
    const n = Number(raw)
    if (!Number.isFinite(n)) return DEFAULT_STRENGTH
    return clamp(Math.round(n), 0, 100)
  } catch {
    return DEFAULT_STRENGTH
  }
}

function emit() {
  for (const listener of listeners) listener()
}

export function getMosaicStrength() {
  return strength
}

/** 50 = 원래 강도, 0 = 없음, 100 = 2배 */
export function getMosaicScale() {
  return strength / 50
}

export function setMosaicStrength(next: number) {
  strength = clamp(Math.round(next), 0, 100)
  try {
    localStorage.setItem(STORAGE_KEY, String(strength))
  } catch {
    // ignore
  }
  emit()
}

export function useMosaicStrength() {
  const [value, setValue] = useState(strength)
  useEffect(() => {
    const onChange = () => setValue(getMosaicStrength())
    listeners.add(onChange)
    return () => {
      listeners.delete(onChange)
    }
  }, [])
  return value
}
