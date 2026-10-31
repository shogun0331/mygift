const STORAGE_KEY = 'broadcast-show-fps'

type Listener = (enabled: boolean) => void

const listeners = new Set<Listener>()

function loadShowFps(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw == null) return true
    return raw === '1' || raw === 'true'
  } catch {
    return true
  }
}

let showFps = loadShowFps()

export function getShowFps(): boolean {
  return showFps
}

export function setShowFps(enabled: boolean): void {
  if (showFps === enabled) return
  showFps = enabled
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    /* ignore quota / private mode */
  }
  for (const listener of listeners) listener(showFps)
}

export function subscribeShowFps(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
