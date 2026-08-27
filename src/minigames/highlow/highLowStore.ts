import {
  DEFAULT_HIGH_LOW_CONFIG,
  type HighLowConfigMap,
  type HighLowRoomId,
  type CasinoItem,
} from './highLowConfig'

const CONFIG_STORAGE_KEY = 'broadcast-highlow-config-v1'
const CHIPS_STORAGE_KEY_PREFIX = 'broadcast-highlow-chips-'

export function loadHighLowConfig(): HighLowConfigMap {
  if (typeof window === 'undefined') return DEFAULT_HIGH_LOW_CONFIG
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        local: { ...DEFAULT_HIGH_LOW_CONFIG.local, ...(parsed.local || {}) },
        star: { ...DEFAULT_HIGH_LOW_CONFIG.star, ...(parsed.star || {}) },
        legend: { ...DEFAULT_HIGH_LOW_CONFIG.legend, ...(parsed.legend || {}) },
      }
    }
  } catch (e) {
    console.error('Failed to load highlow config from localStorage:', e)
  }
  return DEFAULT_HIGH_LOW_CONFIG
}

export function saveHighLowConfig(config: HighLowConfigMap): boolean {
  if (typeof window === 'undefined') return false
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
    return true
  } catch (e) {
    console.error('Failed to save highlow config to localStorage:', e)
    return false
  }
}

export function loadUserChips(roomId: HighLowRoomId, defaultChips: number): number {
  if (typeof window === 'undefined') return defaultChips
  try {
    const val = localStorage.getItem(`${CHIPS_STORAGE_KEY_PREFIX}${roomId}`)
    if (val !== null) {
      const num = Number(val)
      if (!isNaN(num) && num >= 0) return num
    }
  } catch (e) {
    console.error('Failed to load chips:', e)
  }
  return defaultChips
}

export function saveUserChips(roomId: HighLowRoomId, chips: number): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${CHIPS_STORAGE_KEY_PREFIX}${roomId}`, String(chips))
  } catch (e) {
    console.error('Failed to save chips:', e)
  }
}

const INVENTORY_STORAGE_KEY_PREFIX = 'broadcast-highlow-inventory-'

export function loadUserInventory(roomId: HighLowRoomId): CasinoItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`${INVENTORY_STORAGE_KEY_PREFIX}${roomId}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) {
    console.error('Failed to load user inventory from localStorage:', e)
  }
  return []
}

export function saveUserInventory(roomId: HighLowRoomId, items: CasinoItem[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${INVENTORY_STORAGE_KEY_PREFIX}${roomId}`, JSON.stringify(items))
  } catch (e) {
    console.error('Failed to save user inventory to localStorage:', e)
  }
}

export function resetHighLowData(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(CONFIG_STORAGE_KEY)
    const rooms: HighLowRoomId[] = ['local', 'star', 'legend']
    for (const r of rooms) {
      localStorage.removeItem(`${CHIPS_STORAGE_KEY_PREFIX}${r}`)
      localStorage.removeItem(`${INVENTORY_STORAGE_KEY_PREFIX}${r}`)
    }
  } catch (e) {
    console.error('Failed to reset highlow data:', e)
  }
}
