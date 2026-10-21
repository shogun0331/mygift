export type DisplayMode = 'fullscreen' | 'borderless'

export type WindowResolution = '1280x720' | '1920x1080' | 'full'

export const WINDOW_RESOLUTIONS: { id: WindowResolution; width: number; height: number }[] = [
  { id: '1280x720', width: 1280, height: 720 },
  { id: '1920x1080', width: 1920, height: 1080 },
  { id: 'full', width: 0, height: 0 },
]

const STORAGE_KEY = 'broadcast-display-mode'
const RESOLUTION_KEY = 'broadcast-window-resolution'

function parseResolution(raw: string | null | undefined): WindowResolution {
  if (raw === '2560x1440' || raw === 'full') return 'full'
  if (raw === '1280x720' || raw === '1920x1080') return raw
  return '1920x1080'
}

let currentMode: DisplayMode =
  (localStorage.getItem(STORAGE_KEY) as DisplayMode) || 'fullscreen'

let currentResolution: WindowResolution = parseResolution(localStorage.getItem(RESOLUTION_KEY))

const listeners = new Set<(mode: DisplayMode) => void>()
const resolutionListeners = new Set<(resolution: WindowResolution) => void>()

export function getDisplayMode(): DisplayMode {
  return currentMode
}

export function getWindowResolution(): WindowResolution {
  return currentResolution
}

export function resolutionSize(id: WindowResolution = currentResolution) {
  return WINDOW_RESOLUTIONS.find((item) => item.id === id) ?? WINDOW_RESOLUTIONS[1]
}

export function isCurrentlyFullscreen(): boolean {
  return !!document.fullscreenElement
}

function persistResolution(id: WindowResolution) {
  currentResolution = id
  try {
    localStorage.setItem(RESOLUTION_KEY, id)
  } catch (e) {
    console.warn('[DisplayMode] LocalStorage write error:', e)
  }
  resolutionListeners.forEach((fn) => fn(currentResolution))
}

function electronSizePayload() {
  const size = resolutionSize()
  if (size.id === 'full') return { full: true as const }
  return { width: size.width, height: size.height }
}

async function applyElectronDisplay(): Promise<boolean> {
  const api = window.electronAPI?.setDisplayMode
  if (!api) return false
  try {
    await api(currentMode, electronSizePayload())
  } catch (err) {
    console.warn('[DisplayMode] Electron setDisplayMode error:', err)
  }
  return true
}

export async function setWindowResolution(id: WindowResolution) {
  persistResolution(parseResolution(id))
  if (currentMode === 'borderless') {
    await applyElectronDisplay()
  }
}

export async function setDisplayMode(mode: DisplayMode) {
  currentMode = mode
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch (e) {
    console.warn('[DisplayMode] LocalStorage write error:', e)
  }

  const applied = await applyElectronDisplay()
  if (!applied) {
    try {
      if (mode === 'fullscreen') {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen()
        }
      } else if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen()
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

export function subscribeWindowResolution(listener: (resolution: WindowResolution) => void) {
  resolutionListeners.add(listener)
  return () => {
    resolutionListeners.delete(listener)
  }
}

function notifyListeners() {
  listeners.forEach((fn) => fn(currentMode))
}

let initialized = false

export function initDisplayMode() {
  if (initialized) return
  initialized = true

  if (window.electronAPI?.setDisplayMode) {
    window.electronAPI.setDisplayMode(currentMode, electronSizePayload()).catch(() => {})
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
