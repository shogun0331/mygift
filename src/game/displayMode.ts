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

  // 1. Electron IPC Call
  if (typeof window !== 'undefined' && (window as any).electronAPI?.setDisplayMode) {
    try {
      await (window as any).electronAPI.setDisplayMode(mode)
    } catch (err) {
      console.warn('[DisplayMode] Electron setDisplayMode error:', err)
    }
  } else {
    // 2. Web Browser Fallback
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

  // Apply display mode to Electron if available
  if (typeof window !== 'undefined' && (window as any).electronAPI?.setDisplayMode) {
    ;(window as any).electronAPI.setDisplayMode(currentMode).catch(() => {})
  } else {
    const handleFirstInteraction = () => {
      if (currentMode === 'fullscreen' && !document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {})
      }
      window.removeEventListener('click', handleFirstInteraction)
      window.removeEventListener('keydown', handleFirstInteraction)
    }

    if (currentMode === 'fullscreen' && !document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {
        window.addEventListener('click', handleFirstInteraction, { once: true })
        window.addEventListener('keydown', handleFirstInteraction, { once: true })
      })
    }
  }

  document.addEventListener('fullscreenchange', () => {
    notifyListeners()
  })
}
