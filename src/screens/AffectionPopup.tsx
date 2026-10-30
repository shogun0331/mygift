import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '../locales/i18n'
import type { AffectionGain } from '../game/affection'
import { SHELL_UI_ASSETS } from '../ui/shellAssets'
import '../ui/shellFrames.css'

function Gauge({ before, after }: { before: number; after: number }) {
  const [shown, setShown] = useState(before)
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setShown(after))
    return () => window.cancelAnimationFrame(frame)
  }, [after])
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
      <div
        className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-300 transition-[width] duration-700 ease-out"
        style={{ width: `${Math.max(0, Math.min(100, shown))}%` }}
      />
    </div>
  )
}

function useAutoClose(onClose: () => void, ms: number, key: string) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const closedRef = useRef(false)
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    closedRef.current = false
    setLeaving(false)
    const hide = window.setTimeout(() => setLeaving(true), Math.max(0, ms - 400))
    const done = window.setTimeout(() => {
      if (closedRef.current) return
      closedRef.current = true
      onCloseRef.current()
    }, ms)
    return () => {
      window.clearTimeout(hide)
      window.clearTimeout(done)
    }
  }, [ms, key])
  const dismiss = () => {
    if (closedRef.current) return
    closedRef.current = true
    onCloseRef.current()
  }
  return { leaving, dismiss }
}

export function AffectionGainPopup({
  gain,
  onClose,
}: {
  gain: AffectionGain
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { leaving, dismiss } = useAutoClose(onClose, 2200, `${gain.creatorId}:${gain.after}:${gain.amount}`)
  return createPortal(
    <button
      type="button"
      data-no-ui-click
      onClick={dismiss}
      className={`pointer-events-auto fixed right-5 top-20 z-[240] w-[min(88vw,20rem)] cursor-pointer border-0 bg-transparent p-0 text-left transition-all duration-300 ${
        leaving ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="ui-toast-frame relative">
        <img
          src={SHELL_UI_ASSETS.toastFrame}
          alt=""
          draggable={false}
          className="ui-toast-frame__bezel"
        />
        <div className="ui-toast-frame__body">
          <p className="text-[11px] font-black tracking-wide text-pink-200">{t('affection.rose')}</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-800">
              {gain.portraitUrl ? (
                <img src={gain.portraitUrl} alt="" className="h-full w-full object-cover object-top" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-bold text-slate-100">{gain.name}</p>
                <p className="shrink-0 text-sm font-black text-pink-300">+{gain.amount}</p>
              </div>
              <div className="mt-1.5">
                <Gauge before={gain.before} after={gain.after} />
              </div>
              <p className="mt-1 text-right text-[10px] font-semibold tabular-nums text-slate-500">
                {gain.before} → {gain.after}
              </p>
            </div>
          </div>
        </div>
      </div>
    </button>,
    document.body,
  )
}

export function AffectionBroadcastPopup({
  gains,
  onClose,
}: {
  gains: AffectionGain[]
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { leaving, dismiss } = useAutoClose(
    onClose,
    Math.min(5200, 2600 + gains.length * 350),
    gains.map((row) => `${row.creatorId}:${row.after}:${row.amount}`).join(','),
  )
  return createPortal(
    <button
      type="button"
      data-no-ui-click
      onClick={dismiss}
      className={`pointer-events-auto fixed right-5 top-20 z-[240] w-[min(88vw,22rem)] cursor-pointer border-0 bg-transparent p-0 text-left transition-all duration-300 ${
        leaving ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="ui-toast-frame relative max-h-[46vh]">
        <img
          src={SHELL_UI_ASSETS.toastFrame}
          alt=""
          draggable={false}
          className="ui-toast-frame__bezel"
        />
        <div className="ui-toast-frame__body max-h-[42vh] overflow-hidden">
          <p className="text-[11px] font-black tracking-wide text-pink-200">{t('affection.rose')}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">{t('affection.summaryBody')}</p>
          <ul className="mt-2 max-h-[34vh] space-y-2 overflow-auto pr-1">
            {gains.map((gain) => (
              <li key={gain.creatorId} className="flex items-center gap-2.5">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-800">
                  {gain.portraitUrl ? (
                    <img src={gain.portraitUrl} alt="" className="h-full w-full object-cover object-top" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-bold text-slate-100">{gain.name}</p>
                    <p className="shrink-0 text-xs font-black text-pink-300">+{gain.amount}</p>
                  </div>
                  <div className="mt-1">
                    <Gauge before={gain.before} after={gain.after} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </button>,
    document.body,
  )
}
