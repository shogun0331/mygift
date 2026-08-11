import { useTranslation } from '../locales/i18n'

type GameClearModalProps = {
  onConfirm: () => void
}

export function GameClearModal({ onConfirm }: GameClearModalProps) {
  const { t } = useTranslation()

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/90 p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-clear-title"
    >
      <div className="max-w-lg text-center">
        <p className="game-kicker text-amber-300">{t('ranking.clearKicker')}</p>
        <h2
          id="game-clear-title"
          className="mt-3 text-3xl font-black tracking-wide text-amber-100 sm:text-4xl"
          style={{ textShadow: '0 0 28px rgba(251, 191, 36, 0.45)' }}
        >
          {t('ranking.clearTitle')}
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-slate-300">{t('ranking.clearBody')}</p>
        <button
          type="button"
          onClick={onConfirm}
          className="game-btn game-btn-primary mt-8 min-w-[160px] px-6 py-2.5 text-sm"
        >
          {t('ranking.clearConfirm')}
        </button>
      </div>
    </div>
  )
}
