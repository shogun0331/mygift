import type { GameSave, SaveMeta } from './save'
import { saveMetaFrom } from './save'

const SAVE_PREFIX = 'broadcast-save-'
const AUTO_SAVE_DELAY = 800

/** 현재 게임(세션)의 스냅샷을 만드는 콜백 — InGame이 마운트 시 등록 */
let captureRef: (() => GameSave | null) | null = null
let autoSaveTimer = 0
let savedListener: ((save: GameSave) => void) | null = null

export function registerSaveCapture(fn: (() => GameSave | null) | null): void {
  captureRef = fn
}

/** 디스크 저장 직후 App initialSave 동기화용 */
export function setOnGameSaved(fn: ((save: GameSave) => void) | null): void {
  savedListener = fn
}

export function captureCurrentSave(): GameSave | null {
  return captureRef ? captureRef() : null
}

export function saveGame(save: GameSave): void {
  try {
    localStorage.setItem(SAVE_PREFIX + save.id, JSON.stringify(save))
    savedListener?.(save)
  } catch (err) {
    console.error('세이브 저장 실패:', err)
  }
}

export function loadGame(id: string): GameSave | null {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + id)
    if (!raw) return null
    return JSON.parse(raw) as GameSave
  } catch (err) {
    console.error('세이브 로드 실패:', err)
    return null
  }
}

export function listSaves(): GameSave[] {
  const out: GameSave[] = []
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(SAVE_PREFIX)) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue
      try {
        out.push(JSON.parse(raw) as GameSave)
      } catch {
        // 손상된 슬롯은 건너뜀
      }
    }
  } catch (err) {
    console.error('세이브 목록 조회 실패:', err)
  }
  return out.sort((a, b) => b.savedAt - a.savedAt)
}

export function listSaveMetas(): SaveMeta[] {
  return listSaves().map(saveMetaFrom)
}

export function deleteGame(id: string): void {
  try {
    localStorage.removeItem(SAVE_PREFIX + id)
  } catch (err) {
    console.error('세이브 삭제 실패:', err)
  }
}

export function scheduleAutoSave(): void {
  if (autoSaveTimer) window.clearTimeout(autoSaveTimer)
  autoSaveTimer = window.setTimeout(() => {
    autoSaveTimer = 0
    const save = captureCurrentSave()
    if (save) saveGame(save)
  }, AUTO_SAVE_DELAY)
}

export function flushAutoSave(): void {
  if (autoSaveTimer) {
    window.clearTimeout(autoSaveTimer)
    autoSaveTimer = 0
  }
  const save = captureCurrentSave()
  if (save) saveGame(save)
}
