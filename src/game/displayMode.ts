export type DisplayMode = 'fullscreen' | 'borderless'

const STORAGE_KEY = 'broadcast-display-mode'

let currentMode: DisplayMode =
  (localStorage.getItem(STORAGE_KEY) as DisplayMode) || 'fullscreen'

const listeners = new Set<(mode: DisplayMode) => void>()

export function getDisplayMode(): DisplayMode {
  return currentMode
}

export function isCurrentlyFullscreen(): boolean {
  return !!document.fullscreenElement
}

export async function setDisplayMode(mode: DisplayMode) {
  currentMode = mode
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch (e) {
    console.warn('[DisplayMode] LocalStorage write error:', e)
  }

  try {
    if (mode === 'fullscreen') {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen()
      }
    }
  } catch (err) {
    console.warn('[DisplayMode] Fullscreen toggle error:', err)
  }

  notifyListeners()
}

export function subscribeDisplayMode(listener: (mode: DisplayMode) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notifyListeners() {
  listeners.forEach((fn) => fn(currentMode))
}

let initialized = false

export function initDisplayMode() {
  if (initialized) return
  initialized = true

  const handleFirstInteraction = () => {
    if (currentMode === 'fullscreen' && !document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    }
    window.removeEventListener('click', handleFirstInteraction)
    window.removeEventListener('keydown', handleFirstInteraction)
  }

  // Attempt initial fullscreen if mode is fullscreen
  if (currentMode === 'fullscreen' && !document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {
      // Browser blocked fullscreen without gesture; attach listener for user click/key
      window.addEventListener('click', handleFirstInteraction, { once: true })
      window.addEventListener('keydown', handleFirstInteraction, { once: true })
    })
  }

  document.addEventListener('fullscreenchange', () => {
    notifyListeners()
  })
}
