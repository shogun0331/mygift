import { useLayoutEffect, useState } from 'react'
import { useTranslation } from '../../locales/i18n'

type Rect = { top: number; left: number; width: number; height: number }

type CasinoPracticeCoachProps = {
  titleKey: string
  bodyKey: string
  /** 비우면 설명만 보여주고 계속 버튼으로 넘긴다 */
  selector: string | null
  onSkip: () => void
  onNext?: () => void
}

export function CasinoPracticeCoach({
  titleKey,
  bodyKey,
  selector,
  onSkip,
  onNext,
}: CasinoPracticeCoachProps) {
  const { t } = useTranslation()
  const [targetRect, setTargetRect] = useState<Rect | null>(null)

  useLayoutEffect(() => {
    const measure = () => {
      if (!selector) {
        setTargetRect(null)
        return
      }
      const el = document.querySelector(selector)
      if (!el) {
        setTargetRect(null)
        return
      }
      const box = el.getBoundingClientRect()
      setTargetRect({ top: box.top, left: box.left, width: box.width, height: box.height })
    }
    measure()
    const timer = window.setInterval(measure, 150)
    window.addEventListener('resize', measure)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('resize', measure)
    }
  }, [selector])

  return (
    <div className="pointer-events-none fixed inset-0 z-[100000] overflow-hidden">
      {targetRect ? (
        <>
          <div
            className="pointer-events-auto fixed inset-x-0 top-0 bg-slate-950/78"
            style={{ height: Math.max(0, targetRect.top - 8) }}
          />
          <div
            className="pointer-events-auto fixed inset-x-0 bottom-0 bg-slate-950/78"
            style={{ top: targetRect.top + targetRect.height + 8 }}
          />
          <div
            className="pointer-events-auto fixed left-0 bg-slate-950/78"
            style={{
              top: targetRect.top - 8,
              height: targetRect.height + 16,
              width: Math.max(0, targetRect.left - 8),
            }}
          />
          <div
            className="pointer-events-auto fixed right-0 bg-slate-950/78"
            style={{
              top: targetRect.top - 8,
              height: targetRect.height + 16,
              left: targetRect.left + targetRect.width + 8,
            }}
          />
          <div
            className="pointer-events-none fixed rounded-2xl ring-4 ring-amber-300"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              boxShadow: '0 0 28px rgba(251,191,36,0.85)',
            }}
          />
        </>
      ) : (
        <div className="pointer-events-auto fixed inset-0 bg-slate-950/55" />
      )}
      <div className="pointer-events-auto fixed left-1/2 top-16 z-[100001] w-[420px] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-2xl border-2 border-amber-400/80 bg-slate-950/95 p-4 shadow-[0_0_35px_rgba(245,158,11,0.45)]">
        <div className="flex items-center justify-between gap-3 border-b border-amber-400/30 pb-2">
          <p className="truncate text-xs font-black tracking-wider text-amber-200">{t(titleKey)}</p>
          <button
            type="button"
            onClick={onSkip}
            className="shrink-0 rounded-lg border border-white/15 px-2 py-1 text-[11px] font-bold text-slate-300 hover:text-white"
          >
            {t('casino.tutorial.skip')}
          </button>
        </div>
        <p className="mt-2.5 text-sm font-medium leading-relaxed text-slate-100">{t(bodyKey)}</p>
        {selector ? (
          <p className="mt-2 text-xs font-black text-amber-200">{t('casino.tutorial.tap')}</p>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="mt-3 w-full cursor-pointer rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 py-2.5 text-xs font-black text-slate-950"
          >
            {t('casino.tutorial.next')}
          </button>
        )}
      </div>
    </div>
  )
}
