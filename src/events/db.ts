import type { GameEvent } from './types'
import type { RegisteredCharacter } from '../game/characters'

const DB_NAME = 'broadcast-game-db'
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
      resolve(events)
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
