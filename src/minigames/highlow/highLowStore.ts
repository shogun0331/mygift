import { fetchPublicJson } from '../../game/publicJson'
import {
  DEFAULT_HIGH_LOW_CONFIG,
  type HighLowConfigMap,
  type HighLowRoomId,
  type CasinoItem,
} from './highLowConfig'

const CONFIG_STORAGE_KEY = 'broadcast-highlow-config-v1'
const CHIPS_STORAGE_KEY_PREFIX = 'broadcast-highlow-chips-'
const HIGH_LOW_CONFIG_PUBLIC = '/chapter_assets/highlow.json'
const ROOM_IDS: HighLowRoomId[] = ['local', 'star', 'legend']

function roomHasMedia(room: HighLowConfigMap[HighLowRoomId] | undefined): boolean {
  if (!room) return false
  if (room.dealerMediaUrl) return true
  const stages = room.dealerMediaStages
  return Boolean(stages?.tier1?.url || stages?.tier2?.url || stages?.tier3?.url)
}

export function highLowConfigHasMedia(config: HighLowConfigMap | null | undefined): boolean {
  if (!config) return false
  return ROOM_IDS.some((id) => roomHasMedia(config[id]))
}

function mergeLoadedConfig(
  overlay: Partial<HighLowConfigMap> | null | undefined,
  packed: Partial<HighLowConfigMap> | null | undefined,
): HighLowConfigMap {
  const pickRoom = (id: HighLowRoomId) => {
    const over = overlay?.[id]
    const pack = packed?.[id]
    return {
      ...DEFAULT_HIGH_LOW_CONFIG[id],
      ...(pack || {}),
      ...(over || {}),
    }
  }
  return {
    local: pickRoom('local'),
    star: pickRoom('star'),
    legend: pickRoom('legend'),
  }
}

export function loadHighLowConfig(): HighLowConfigMap {
  if (typeof window === 'undefined') return DEFAULT_HIGH_LOW_CONFIG
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return mergeLoadedConfig(parsed, DEFAULT_HIGH_LOW_CONFIG)
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
    if (window.electronAPI?.saveHighLowConfigJson) {
      void window.electronAPI.saveHighLowConfigJson(config).catch((err) => {
        console.error('Failed to save highlow config json:', err)
      })
    }
    return true
  } catch (e) {
    console.error('Failed to save highlow config to localStorage:', e)
    return false
  }
}

export async function saveHighLowConfigAsync(config: HighLowConfigMap): Promise<HighLowConfigMap> {
  saveHighLowConfig(config)
  if (window.electronAPI?.saveHighLowConfigJson) {
    const res = await window.electronAPI.saveHighLowConfigJson(config)
    if (!res?.success) throw new Error(res?.error || 'Failed to save highlow config')
    if (res.config) {
      const next = mergeLoadedConfig(res.config, DEFAULT_HIGH_LOW_CONFIG)
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(next))
      return next
    }
  }
  return config
}

export async function loadHighLowConfigFromDisk(): Promise<HighLowConfigMap> {
  const fromLs = loadHighLowConfig()
  let fromDisk: HighLowConfigMap | null = null

  try {
    if (window.electronAPI?.loadHighLowConfigJson) {
      const res = await window.electronAPI.loadHighLowConfigJson()
      if (res?.success && res.config) {
        fromDisk = mergeLoadedConfig(res.config, DEFAULT_HIGH_LOW_CONFIG)
      }
    }
  } catch (err) {
    console.error('Failed to load highlow config via Electron:', err)
  }

  if (!fromDisk) {
    const fromPub = await fetchPublicJson<Partial<HighLowConfigMap>>(HIGH_LOW_CONFIG_PUBLIC)
    if (fromPub) fromDisk = mergeLoadedConfig(fromPub, DEFAULT_HIGH_LOW_CONFIG)
  }

  if (!fromDisk) return fromLs

  if (!highLowConfigHasMedia(fromDisk) && highLowConfigHasMedia(fromLs)) {
    try {
      return await saveHighLowConfigAsync(fromLs)
    } catch (err) {
      console.error('Failed to migrate highlow config to disk:', err)
      return fromLs
    }
  }

  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(fromDisk))
  return fromDisk
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