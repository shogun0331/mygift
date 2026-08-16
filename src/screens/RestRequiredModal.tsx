import { useTranslation } from '../locales/i18n'

type RestRequiredModalProps = {
  creatorName: string
  onConfirm: () => void
}

export function RestRequiredModal({ creatorName, onConfirm }: RestRequiredModalProps) {
  const { t } = useTranslation()
  const body = t('dashboard.restRequiredBody').replace('{name}', creatorName)

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rest-required-title"
    >
      <div className="game-panel-strong w-full max-w-sm overflow-hidden rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="border-b border-rose-400/20 bg-gradient-to-br from-rose-500/15 via-transparent to-transparent px-6 pb-5 pt-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-rose-400/35 bg-rose-500/15 text-rose-300">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 8v5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
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

        <div className="flex justify-center px-6 py-5">
          <button
            type="button"
            onClick={onConfirm}
            className="game-btn game-btn-primary min-w-[140px] px-6 py-2.5 text-sm"
          >
            {t('dashboard.restRequiredConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
