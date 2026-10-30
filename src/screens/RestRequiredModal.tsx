import { useTranslation } from '../locales/i18n'
import { UiDialogBtn, UiDialogShell } from '../ui/UiDialogShell'

type RestRequiredModalProps = {
  creatorName: string
  onConfirm: () => void
}

export function RestRequiredModal({ creatorName, onConfirm }: RestRequiredModalProps) {
  const { t } = useTranslation()
  const body = t('dashboard.restRequiredBody').replace('{name}', creatorName)

  return (
    <UiDialogShell labelledBy="rest-required-title" size="sm" tone="rose" zClassName="z-[85]">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-rose-400/35 bg-rose-500/15 text-rose-300">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 8v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1.1" fill="currentColor" />
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </div>
        <p className="game-stat-label text-rose-300/80">STAMINA</p>
        <h2
          id="rest-required-title"
          className="mt-1.5 text-lg font-bold tracking-tight text-slate-100"
        >
          {t('dashboard.restRequiredTitle')}
        </h2>
        <p className="mt-3 text-sm leading-relaxed font-semibold text-slate-200">{body}</p>
      </div>
      <div className="mt-5 flex justify-center">
        <UiDialogBtn onClick={onConfirm} className="min-w-[140px]">
          {t('dashboard.restRequiredConfirm')}
        </UiDialogBtn>
      </div>
    </UiDialogShell>
  )
}
