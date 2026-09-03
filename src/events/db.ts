import { fetchPublicJson } from '../game/publicJson'
import { commonSoundMediaPath } from '../game/mediaUrl'
import { EVENT_LOCALES, mergeEventLocalization } from './eventLocales'
import {
  normalizeCommonEventLinks,
  type CommonEventLinks,
} from './commonEventLinks'
import { normalizeOwnerCharacterId, type GameEvent } from './types'
import type { RegisteredCharacter } from '../game/characters'
import {
  defaultStationGradeConfig,
  normalizeStationGradeConfig,
  type StationGradeConfig,
} from '../game/stationGradeConfig'

const STATION_GRADE_CONFIG_KEY = 'broadcast-station-grade-config'
const STATION_GRADE_CONFIG_PUBLIC = '/chapter_assets/station_grade_config.json'
const COMMON_EVENT_LINKS_KEY = 'broadcast-common-event-links'
const COMMON_EVENT_LINKS_PUBLIC = '/chapter_assets/common_event_links.json'
const COMMON_SOUNDS_PUBLIC = '/chapter_assets/common_sounds.json'

function withOwner(events: GameEvent[]): GameEvent[] {
  return events.map((event) => ({
    ...event,
    ownerCharacterId: normalizeOwnerCharacterId(event.ownerCharacterId),
  }))
}
const DB_NAME = 'broadcast-game'
const DB_VERSION = 2

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('events')) {
        db.createObjectStore('events', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('characters')) {
        db.createObjectStore('characters', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('common_sounds')) {
        db.createObjectStore('common_sounds', { keyPath: 'id' })
      }
    }
  })
}

function isBinaryLike(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  if (typeof File !== 'undefined' && value instanceof File) return true
  if (typeof Blob !== 'undefined' && value instanceof Blob) return true
  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) return true
  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(value)) return true
  return false
}

function sanitizeEventsForSave(events: GameEvent[]): GameEvent[] {
  const json = JSON.stringify(events ?? [], (key, value) => {
    if (key === 'blob' || isBinaryLike(value)) return undefined
    if (typeof value === 'function' || typeof value === 'bigint' || typeof value === 'symbol') {
      return undefined
    }
    return value
  })
  const parsed = JSON.parse(json) as GameEvent[]
  return parsed
    .filter((ev) => ev && typeof ev === 'object' && typeof ev.id === 'string' && ev.id.trim())
    .map((ev) => ({
      ...ev,
      media: Array.isArray(ev.media) ? ev.media.filter((m) => m && typeof m === 'object') : [],
    }))
}

export async function saveEvents(events: GameEvent[]): Promise<void> {
  const cleanedEvents = sanitizeEventsForSave(events)

  if (window.electronAPI?.saveEventsJson) {
    try {
      const res = await window.electronAPI.saveEventsJson(cleanedEvents)
      if (!res.success) throw new Error(res.error || 'Failed to save events JSON')
      return
    } catch (ipcErr) {
      const canFallback = typeof window !== 'undefined' && window.location.protocol.startsWith('http')
      if (!canFallback) throw ipcErr
      console.warn('Electron save-events-json failed, falling back to Vite API:', ipcErr)
    }
  }

  // 브라우저 개발 서버 (Vite HTTP API) 지원
  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    try {
      const res = await fetch('/api/save-events-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: cleanedEvents }),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success) return
        throw new Error(json.error || 'Server responded with error')
      }
    } catch (apiErr) {
      console.warn('Failed to save events to Vite dev API, falling back to IndexedDB:', apiErr)
    }
  }

  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('events', 'readwrite')
    const store = tx.objectStore('events')

    const clearReq = store.clear()
    clearReq.onsuccess = () => {
      for (const event of events) {
        // Blobs are stored natively in IndexedDB
        store.put(event)
      }
    }

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadEvents(): Promise<GameEvent[]> {
  // 브라우저 백업용 IndexedDB 데이터를 먼저 확보 (실패 시 복구용)
  let indexedDbEvents: GameEvent[] = []
  try {
    const db = await openDB()
    indexedDbEvents = await new Promise<GameEvent[]>((resolve, reject) => {
      const tx = db.transaction('events', 'readonly')
      const store = tx.objectStore('events')
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result as GameEvent[])
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('Failed to read IndexedDB backup events:', err)
  }

  if (window.electronAPI?.loadEventsJson) {
    const res = await window.electronAPI.loadEventsJson()
    if (!res.success) throw new Error(res.error || 'Failed to load events JSON')
    
    let loadedEvents = res.events as GameEvent[]

    if (loadedEvents.length === 0 && typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
      try {
        const metadataList = await fetchPublicJson<any[]>('/chapter_assets/events.json')
        if (Array.isArray(metadataList) && metadataList.length > 0) {
          const restored: GameEvent[] = []
          for (const meta of metadataList) {
            const full = await fetchPublicJson<GameEvent>(`/chapter_assets/events/${meta.id}.json`)
            const base = (full || {
              ...meta,
              nodes: [],
              characters: [],
              points: [],
              media: [],
            }) as GameEvent
            const loc = mergeEventLocalization(base.localization)
            for (const lang of EVENT_LOCALES) {
              const locMap = await fetchPublicJson<Record<string, string>>(
                `/chapter_assets/events/${meta.id}/loc/${lang}.json`,
              )
              if (locMap && typeof locMap === 'object') {
                loc[lang] = { ...loc[lang], ...locMap }
              }
            }
            restored.push({ ...base, localization: loc })
          }
          loadedEvents = restored
        }
      } catch (err) {
        console.warn('Failed to load events.json from public folder:', err)
      }
    }

    // 복구 로직: 로컬 JSON이 비어있는데 IndexedDB 백업에 이벤트 데이터가 존재하면 복구 가동!
    if (loadedEvents.length === 0 && indexedDbEvents.length > 0) {
      console.log('Restoring events from IndexedDB backup:', indexedDbEvents)
      loadedEvents = indexedDbEvents
      try {
        await window.electronAPI.saveEventsJson?.(loadedEvents)
      } catch (saveErr) {
        console.error('Failed to auto-save restored events to JSON:', saveErr)
      }
    }

    // 디스크 에셋은 media:// 로만 연결한다. 전체를 blob으로 올리면 큰 영상에서 메인 프로세스가 멈춘다.
    for (const event of loadedEvents) {
      for (const asset of event.media) {
        const folderMap = { image: 'images', video: 'videos', sound: 'sounds' }
        const folderName = folderMap[asset.kind] || 'assets'
        asset.url = `media://chapter_assets/events/${event.id}/${folderName}/${asset.fileName}`
      }
    }
    return withOwner(loadedEvents)
  }

  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readonly')
    const store = tx.objectStore('events')
    const request = store.getAll()

    request.onsuccess = () => {
      const events = request.result as GameEvent[]
      // Restore Object URLs from raw Blobs
      for (const event of events) {
        for (const asset of event.media) {
          if (asset.blob) {
            asset.url = URL.createObjectURL(asset.blob)
          }
        }
      }
      resolve(withOwner(events))
    }

    request.onerror = () => reject(request.error)
  })
}

export type DbCharacterRecord = {
  id: string
  character: RegisteredCharacter
  profileBlob: Blob | null
}

export async function saveCharacters(records: DbCharacterRecord[]): Promise<void> {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('characters', 'readwrite')
    const store = tx.objectStore('characters')

    const clearReq = store.clear()
    clearReq.onsuccess = () => {
      for (const record of records) {
        store.put(record)
      }
    }

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadCharacters(): Promise<DbCharacterRecord[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('characters', 'readonly')
    const store = tx.objectStore('characters')
    const request = store.getAll()

    request.onsuccess = () => {
      resolve(request.result as DbCharacterRecord[])
    }

    request.onerror = () => reject(request.error)
  })
}

export async function saveCommonEventLinks(links: CommonEventLinks): Promise<void> {
  const normalized = normalizeCommonEventLinks(links)
  if (window.electronAPI?.saveCommonEventLinksJson) {
    const res = await window.electronAPI.saveCommonEventLinksJson(normalized)
    if (!res.success) throw new Error(res.error || 'Failed to save common event links')
    return
  }
  try {
    localStorage.setItem(COMMON_EVENT_LINKS_KEY, JSON.stringify(normalized))
  } catch {
    // ignore quota
  }
}

export async function loadCommonEventLinks(): Promise<CommonEventLinks> {
  if (window.electronAPI?.loadCommonEventLinksJson) {
    const res = await window.electronAPI.loadCommonEventLinksJson()
    if (res.success) return normalizeCommonEventLinks(res.links)
  }
  try {
    const raw = localStorage.getItem(COMMON_EVENT_LINKS_KEY)
    if (raw) return normalizeCommonEventLinks(JSON.parse(raw))
  } catch {
    // ignore
  }
  const fromPublic = await fetchPublicJson<unknown>(COMMON_EVENT_LINKS_PUBLIC)
  return normalizeCommonEventLinks(fromPublic)
}

export async function saveStationGradeConfig(config: StationGradeConfig): Promise<StationGradeConfig> {
  const normalized = normalizeStationGradeConfig(config)
  if (window.electronAPI?.saveStationGradeConfigJson) {
    const res = await window.electronAPI.saveStationGradeConfigJson(normalized)
    if (!res.success) throw new Error(res.error || 'Failed to save station grade config')
    if (res.config) return normalizeStationGradeConfig(res.config)
  }
  try {
    localStorage.setItem(STATION_GRADE_CONFIG_KEY, JSON.stringify(normalized))
  } catch {
    // ignore quota
  }
  return normalized
}

export async function loadStationGradeConfig(): Promise<StationGradeConfig> {
  if (window.electronAPI?.loadStationGradeConfigJson) {
    const res = await window.electronAPI.loadStationGradeConfigJson()
    if (res.success) return normalizeStationGradeConfig(res.config)
  }
  try {
    const raw = localStorage.getItem(STATION_GRADE_CONFIG_KEY)
    if (raw) return normalizeStationGradeConfig(JSON.parse(raw))
  } catch {
    // ignore
  }
  const fromPublic = await fetchPublicJson<unknown>(STATION_GRADE_CONFIG_PUBLIC)
  if (fromPublic) return normalizeStationGradeConfig(fromPublic)
  return defaultStationGradeConfig()
}

function cleanCommonSoundsForJson(sounds: any[]): any[] {
  return sounds.map((sound) => {
    const { blob, ...rest } = sound as any
    const fileName = String(rest.fileName || '')
    return {
      ...rest,
      kind: 'sound',
      sourcePath: `chapter_assets/common_sounds/${fileName}`,
      url: commonSoundMediaPath(fileName),
    }
  })
}

function attachCommonSoundUrls(sounds: any[]): any[] {
  return sounds.map((sound) => {
    const fileName = String(sound?.fileName || '')
    return {
      ...sound,
      kind: 'sound',
      sourcePath: sound?.sourcePath || `chapter_assets/common_sounds/${fileName}`,
      url: commonSoundMediaPath(fileName),
    }
  })
}

async function saveCommonSoundsToIndexedDb(sounds: any[]): Promise<void> {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('common_sounds', 'readwrite')
    const store = tx.objectStore('common_sounds')
    const clearReq = store.clear()
    clearReq.onsuccess = () => {
      for (const sound of sounds) {
        store.put(sound)
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function loadCommonSoundsFromIndexedDb(): Promise<any[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('common_sounds', 'readonly')
    const store = tx.objectStore('common_sounds')
    const request = store.getAll()
    request.onsuccess = () => {
      const result = (request.result || []) as any[]
      for (const item of result) {
        if (item.blob && !item.url) {
          item.url = URL.createObjectURL(item.blob)
        }
      }
      resolve(result)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function persistCommonSoundFiles(
  assets: Array<{ fileName: string; buffer: ArrayBuffer | number[] }>,
): Promise<{ success: boolean; path?: string; error?: string }> {
  if (window.electronAPI?.saveCommonSoundAssets) {
    return window.electronAPI.saveCommonSoundAssets(assets)
  }
  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    const res = await fetch('/api/save-common-sound-assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assets }),
    })
    return res.json()
  }
  return { success: false, error: '로컬 프로젝트 폴더에 저장할 수 없습니다.' }
}

export async function removeCommonSoundFile(fileName: string): Promise<void> {
  if (window.electronAPI?.deleteCommonSoundFile) {
    await window.electronAPI.deleteCommonSoundFile(fileName)
    return
  }
  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    await fetch('/api/delete-common-sound-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName }),
    })
  }
}

export async function saveCommonSounds(sounds: any[]): Promise<void> {
  const cleaned = cleanCommonSoundsForJson(sounds)

  if (window.electronAPI?.saveCommonSoundsJson) {
    const res = await window.electronAPI.saveCommonSoundsJson(cleaned)
    if (!res.success) throw new Error(res.error || 'Failed to save common sounds JSON')
    try {
      await saveCommonSoundsToIndexedDb([])
    } catch {
      // ignore
    }
    return
  }

  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    try {
      const res = await fetch('/api/save-common-sounds-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sounds: cleaned }),
      })
      if (res.ok) {
        try {
          await saveCommonSoundsToIndexedDb([])
        } catch {
          // ignore
        }
        return
      }
    } catch {
      // IndexedDB fallback
    }
  }

  try {
    await saveCommonSoundsToIndexedDb(cleaned)
  } catch (err) {
    console.error('Failed to save common sounds to IndexedDB:', err)
  }
}

export async function loadCommonSounds(): Promise<any[]> {
  if (window.electronAPI?.loadCommonSoundsJson) {
    const res = await window.electronAPI.loadCommonSoundsJson()
    if (res.success && Array.isArray(res.sounds) && res.sounds.length > 0) {
      return attachCommonSoundUrls(res.sounds)
    }
  } else {
    const fromPublic = await fetchPublicJson<any[]>(COMMON_SOUNDS_PUBLIC)
    if (fromPublic && Array.isArray(fromPublic) && fromPublic.length > 0) {
      return attachCommonSoundUrls(fromPublic)
    }
  }

  try {
    const fromIdb = await loadCommonSoundsFromIndexedDb()
    if (fromIdb.length === 0) return []

    const payloads: Array<{ fileName: string; buffer: number[] }> = []
    for (const sound of fromIdb) {
      if (!sound.blob || !sound.fileName) continue
      const buffer = Array.from(new Uint8Array(await sound.blob.arrayBuffer()))
      payloads.push({ fileName: sound.fileName, buffer })
    }
    if (payloads.length > 0) {
      const persisted = await persistCommonSoundFiles(payloads)
      if (persisted.success) {
        await saveCommonSounds(fromIdb)
        return attachCommonSoundUrls(fromIdb)
      }
    }
    return fromIdb
  } catch (err) {
    console.warn('Failed to load common sounds from IndexedDB:', err)
    return []
  }
}
