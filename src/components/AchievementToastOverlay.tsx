import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  ACHIEVEMENT_UNLOCK_EVENT,
  subscribeAchievementUnlock,
  ackAchievementToasts,
  getAchievementTitle,
  getAchievementDesc,
  type AchievementDef,
} from '../game/achievements'
import { useTranslation } from '../locales/i18n'
import { playAuditPassFanfare } from '../game/uiSfx'
import { resolveMediaSrc } from '../game/mediaUrl'

export function AchievementToastOverlay() {
  const { t, locale } = useTranslation()
  const [queue, setQueue] = useState<AchievementDef[]>([])
  const [current, setCurrent] = useState<AchievementDef | null>(null)
  const [isExiting, setIsExiting] = useState(false)
  const currentIdRef = useRef<string | null>(null)

  useEffect(() => {
    currentIdRef.current = current?.id ?? null
  }, [current])

  useEffect(() => {
    const push = (achievement: AchievementDef | null | undefined) => {
      if (!achievement?.id) return
      if (currentIdRef.current === achievement.id) return
      setQueue((prev) => (prev.some((row) => row.id === achievement.id) ? prev : [...prev, achievement]))
    }

    const onWindowUnlock = (event: Event) => {
      const detail = (event as CustomEvent<AchievementDef>).detail
      push(detail)
    }

    window.addEventListener(ACHIEVEMENT_UNLOCK_EVENT, onWindowUnlock)
    const unsubscribe = subscribeAchievementUnlock(push)
    return () => {
      window.removeEventListener(ACHIEVEMENT_UNLOCK_EVENT, onWindowUnlock)
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (current || queue.length === 0) return
    const [next, ...rest] = queue
    if (!next) return
    setQueue(rest)
    setCurrent(next)
    setIsExiting(false)
  }, [current, queue])

  useEffect(() => {
    if (!current) return
    try {
      playAuditPassFanfare()
    } catch (e) {
      console.error('Failed to play achievement sound:', e)
    }

    const hideTimer = window.setTimeout(() => {
      setIsExiting(true)
      window.setTimeout(() => {
        ackAchievementToasts([current.id])
        setCurrent(null)
        setIsExiting(false)
      }, 380)
    }, 3200)

    return () => {
      window.clearTimeout(hideTimer)
    }
  }, [current])

  const handleDismiss = () => {
    if (isExiting || !current) return
    const id = current.id
    setIsExiting(true)
    window.setTimeout(() => {
      ackAchievementToasts([id])
      setCurrent(null)
      setIsExiting(false)
    }, 280)
  }

  if (typeof document === 'undefined' || !current) return null

  let title = current.titleKey
  let desc = current.descKey
  try {
    title = getAchievementTitle(current, t, locale)
    desc = getAchievementDesc(current, t, locale)
  } catch (e) {
    console.error('Failed to format achievement toast:', e)
  }

  return createPortal(
    <div
      className="pointer-events-none select-none font-sans"
      style={{
        position: 'fixed',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2147483000,
      }}
    >
      <button
        type="button"
        onClick={handleDismiss}
        className="pointer-events-auto flex cursor-pointer items-center justify-between gap-4 rounded-2xl border-2 border-yellow-400 bg-slate-950 px-6 py-4 text-left shadow-[0_0_40px_rgba(234,179,8,0.55)]"
        style={{
          minWidth: 440,
          maxWidth: 660,
          opacity: isExiting ? 0 : 1,
          transform: isExiting ? 'translateY(-24px)' : 'translateY(0)',
          transition: 'opacity 280ms ease, transform 280ms ease',
        }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-yellow-400/60 bg-yellow-500/20">
            {current.characterProfileUrl ? (
              <>
                <img
                  src={resolveMediaSrc(current.characterProfileUrl)}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-0 right-0 rounded-tl bg-slate-950/85 px-1 text-[11px] leading-tight">
                  {current.icon}
                </span>
              </>
            ) : (
              <span className="text-3xl">{current.icon}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 text-[11px] font-black uppercase tracking-widest text-amber-400">
              🏆 {t('achievements.unlockedBadge') || 'ACHIEVEMENT UNLOCKED'}
            </p>
            <h4 className="truncate text-base font-black text-white">{title}</h4>
            <p className="mt-0.5 truncate text-xs font-medium text-slate-300">{desc}</p>
          </div>
        </div>
        <span className="shrink-0 text-amber-400">✨</span>
      </button>
    </div>,
    document.body,
  )
}
