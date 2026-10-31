import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { resolveMediaSrc } from '../game/mediaUrl'

const CURSOR_SRC = '/ui/cursor/cursor_lips.png'
/** Hotspot inside the 64×64 asset (spike tip on upper-left lip). */
const HOTSPOT_X = 10
const HOTSPOT_Y = 8

export function GameCursor() {
  const elRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = elRef.current
    if (!el) return

    let pressed = false
    let visible = false
    let pendingX = 0
    let pendingY = 0
    let dirty = false
    let rafId = 0

    const syncClass = () => {
      el.className = `game-cursor${visible ? ' is-visible' : ''}${pressed ? ' is-pressed' : ''}`
    }

    const flush = () => {
      rafId = 0
      if (!dirty) return
      dirty = false
      el.style.transform = `translate3d(${pendingX - HOTSPOT_X}px, ${pendingY - HOTSPOT_Y}px, 0)`
    }

    const moveTo = (x: number, y: number) => {
      pendingX = x
      pendingY = y
      dirty = true
      if (!rafId) rafId = requestAnimationFrame(flush)
    }

    const show = () => {
      if (visible) return
      visible = true
      syncClass()
    }

    const hide = () => {
      if (!visible && !pressed) return
      visible = false
      pressed = false
      syncClass()
    }

    const onMove = (e: PointerEvent) => {
      moveTo(e.clientX, e.clientY)
      show()
    }

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      if (e.button !== 0) return
      pressed = true
      moveTo(e.clientX, e.clientY)
      visible = true
      syncClass()
    }

    const onUp = () => {
      if (!pressed) return
      pressed = false
      syncClass()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('pointercancel', onUp, { passive: true })
    document.addEventListener('mouseleave', hide)
    document.addEventListener('mouseenter', show)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      document.removeEventListener('mouseleave', hide)
      document.removeEventListener('mouseenter', show)
    }
  }, [])

  return createPortal(
    <div ref={elRef} className="game-cursor" aria-hidden>
      <img src={resolveMediaSrc(CURSOR_SRC)} alt="" draggable={false} />
    </div>,
    document.body,
  )
}
