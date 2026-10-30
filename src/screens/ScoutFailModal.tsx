import { useTranslation } from '../locales/i18n'
import { UiDialogBtn, UiDialogShell } from '../ui/UiDialogShell'

type ScoutFailModalProps = {
  creatorName: string
  onConfirm: () => void
}

export function ScoutFailModal({ creatorName, onConfirm }: ScoutFailModalProps) {
  const { t } = useTranslation()

  return (
    <UiDialogShell labelledBy="scout-fail-title" size="sm" tone="rose" zClassName="z-[85]">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-rose-400/35 bg-rose-500/15 text-rose-300">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 8v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1.1" fill="currentColor" />
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </div>
        <p className="game-stat-label text-rose-300/80">SCOUT RESULT</p>
        <h2
          id="scout-fail-title"
          className="mt-1.5 text-lg font-bold tracking-tight text-slate-100"
        >
          {t('creator.scoutFailTitle')}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{t('creator.scoutFailBody')}</p>
        {creatorName ? (
          <p className="mt-3 inline-flex rounded-lg border border-white/10 bg-black/30 px-3 py-1 text-xs font-semibold text-slate-300">
            {creatorName}
          </p>
        ) : null}
      </div>
      <div className="mt-5 flex justify-center">
        <UiDialogBtn onClick={onConfirm} className="min-w-[140px]">
          {t('creator.scoutFailConfirm')}
        </UiDialogBtn>
      </div>
    </UiDialogShell>
  )
}
