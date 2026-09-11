import { useEffect, useState } from 'react'
import { setBgmSuspended } from './bgm'
import { setSfxSuspended } from './uiSfx'

let suspended = false
const listeners = new Set<(value: boolean) => void>()

function isRuntimeBgm(el: HTMLMediaElement) {
  return el.dataset.broadcastBgm === '1'
}

function pauseExternalMedia() {
  if (typeof document === 'undefined') return
  document.querySelectorAll('audio, video').forEach((node) => {
    const el = node as HTMLMediaElement
    if (isRuntimeBgm(el)) return
    if (!el.paused && !el.ended) {
      el.dataset.lifecyclePaused = '1'
      el.pause()
    }
  })
}

function resumeExternalMedia() {
  if (typeof document === 'undefined') return
  document.querySelectorAll('audio, video').forEach((node) => {
    const el = node as HTMLMediaElement
    if (el.dataset.lifecyclePaused !== '1') return
    delete el.dataset.lifecyclePaused
    void el.play().catch(() => {})
  })
}

export function isAppSuspended() {
  return suspended
}

export function setAppSuspended(next: boolean) {
  if (suspended === next) return
  suspended = next
  setBgmSuspended(next)
  setSfxSuspended(next)
  if (next) pauseExternalMedia()
  else resumeExternalMedia()
  listeners.forEach((fn) => fn(next))
}

export function useAppSuspended() {
  const [value, setValue] = useState(suspended)
  useEffect(() => {
    listeners.add(setValue)
    setValue(suspended)
    return () => {
      listeners.delete(setValue)
    }
  }, [])
  return value
}

export function initAppLifecycle() {
  const api = window.electronAPI
  if (api?.onWindowLifecycle) {
    api.onWindowLifecycle((state) => {
      setAppSuspended(state === 'suspended')
    })
    return
  }
  document.addEventListener('visibilitychange', () => {
    setAppSuspended(document.visibilityState === 'hidden')
  })
}
