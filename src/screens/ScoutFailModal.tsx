import { useTranslation } from '../locales/i18n'

type ScoutFailModalProps = {
  creatorName: string
  onConfirm: () => void
}

export function ScoutFailModal({ creatorName, onConfirm }: ScoutFailModalProps) {
  const { t } = useTranslation()

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scout-fail-title"
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
          <p className="game-stat-label text-rose-300/80">SCOUT RESULT</p>
          <h2
            id="scout-fail-title"
            className="mt-1.5 text-lg font-bold tracking-tight text-slate-100"
          >
            {t('creator.scoutFailTitle')}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {t('creator.scoutFailBody')}
          </p>
          {creatorName ? (
            <p className="mt-3 inline-flex rounded-lg border border-white/10 bg-black/30 px-3 py-1 text-xs font-semibold text-slate-300">
              {creatorName}
            </p>
          ) : null}
        </div>

        <div className="flex justify-center px-6 py-5">
          <button
            type="button"
            onClick={onConfirm}
            className="game-btn game-btn-primary min-w-[140px] px-6 py-2.5 text-sm"
          >
            {t('creator.scoutFailConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
