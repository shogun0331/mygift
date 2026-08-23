import { fetchPublicJson } from '../game/publicJson'
import { EVENT_LOCALES, mergeEventLocalization } from './eventLocales'
import {
  normalizeCommonEventLinks,
  type CommonEventLinks,
} from './commonEventLinks'
import { normalizeOwnerCharacterId, type GameEvent } from './types'
import type { RegisteredCharacter } from '../game/characters'

const COMMON_EVENT_LINKS_KEY = 'broadcast-common-event-links'
const COMMON_EVENT_LINKS_PUBLIC = '/chapter_assets/common_event_links.json'

function withOwner(events: GameEvent[]): GameEvent[] {
  return events.map((event) => ({
    ...event,
    ownerCharacterId: normalizeOwnerCharacterId(event.ownerCharacterId),
  }))
}
const DB_NAME = 'broadcast-game'
const DB_VERSION = 1

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
    }
  })
}

export async function saveEvents(events: GameEvent[]): Promise<void> {
  if (window.electronAPI?.saveEventsJson) {
    const res = await window.electronAPI.saveEventsJson(events)
    if (!res.success) throw new Error(res.error || 'Failed to save events JSON')
    return
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

    // 로컬 디스크 물리 에셋 복구 (media:// -> blob)
    for (const event of loadedEvents) {
      for (const asset of event.media) {
        const folderMap = { image: 'images', video: 'videos', sound: 'sounds' }
        const folderName = folderMap[asset.kind] || 'assets'
        const mediaUrl = `media://chapter_assets/events/${event.id}/${folderName}/${asset.fileName}`
        asset.url = mediaUrl
        try {
          const fetchRes = await fetch(mediaUrl)
          asset.blob = await fetchRes.blob()
        } catch (err) {
          console.error(`Failed to fetch media asset for blob restoration: ${mediaUrl}`, err)
        }
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
