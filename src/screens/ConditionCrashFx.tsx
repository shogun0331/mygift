import { useEffect, useState } from 'react'
import { useTranslation } from '../locales/i18n'

export type ConditionCrashFxItem = {
  id: string
  creatorId: string
  drop: number
  staminaDrop: number
}

type ConditionCrashFxProps = {
  crashes: ConditionCrashFxItem[]
  onDone: (id: string) => void
}

/** 진상으로 인한 컨디션 급락 연출 — 스트림 화면 전체 강조 */
export function ConditionCrashFx({ crashes, onDone }: ConditionCrashFxProps) {
  if (crashes.length === 0) return null
  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden rounded-[inherit]">
      {crashes.map((crash) => (
        <CrashBurst key={crash.id} crash={crash} onDone={onDone} />
      ))}
    </div>
  )
}

function CrashBurst({
  crash,
  onDone,
}: {
  crash: ConditionCrashFxItem
  onDone: (id: string) => void
}) {
  const [visible, setVisible] = useState(true)
  const { t } = useTranslation()

  useEffect(() => {
    const hide = window.setTimeout(() => setVisible(false), 550)
    const done = window.setTimeout(() => onDone(crash.id), 650)
    return () => {
      window.clearTimeout(hide)
      window.clearTimeout(done)
    }
  }, [crash.id, onDone])

  if (!visible) return null

  return (
    <div className="condition-crash-root absolute inset-0">
      <div className="condition-crash-wash absolute inset-0" />
      <div className="condition-crash-flash absolute inset-0" />
      <div className="condition-crash-scan absolute inset-0" />
      <div className="condition-crash-border absolute inset-0" />

      <div className="condition-crash-copy absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 text-center">
        <p className="condition-crash-badge rounded-lg border-2 border-rose-300/80 bg-rose-600/90 px-3 py-1.5 text-[11px] font-black tracking-[0.18em] text-white shadow-[0_0_24px_rgba(244,63,94,0.75)]">
          {t('toxic.viewer')}
        </p>
        <p className="condition-crash-amount text-2xl font-black tabular-nums text-rose-100 drop-shadow-[0_0_12px_rgba(244,63,94,0.95)] sm:text-3xl">
          {t('toxic.conditionDrop').replace('{drop}', String(crash.drop))}
        </p>
        <p className="condition-crash-sub text-[10px] font-bold tracking-wide text-rose-200/95">
          {t('toxic.trollingHint')}
        </p>
      </div>
    </div>
  )
}
