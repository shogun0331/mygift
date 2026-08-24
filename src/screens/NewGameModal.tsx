import { useState } from 'react'
import { useTranslation } from '../locales/i18n'

type NewGameModalProps = {
  onConfirm: (companyName: string) => void
  onCancel: () => void
}

/** 영문 대문자/소문자/숫자/공백만 허용 */
function sanitizeEnglishInput(value: string): string {
  return value.replace(/[^A-Za-z0-9 ]/g, '').slice(0, 30)
}

export function NewGameModal({ onConfirm, onCancel }: NewGameModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')

  const confirm = () => onConfirm(name.trim() || 'STAR')

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-game-title"
    >
      <div className="game-panel w-full max-w-sm rounded-2xl border border-indigo-400/25 px-5 py-6">
        <p className="game-stat-label">STAR</p>
        <h2 id="new-game-title" className="mt-1 text-xl font-black text-slate-100">
          {t('save.newGameTitle')}
        </h2>

        <label htmlFor="new-company-name" className="mt-4 block text-[11px] font-bold text-slate-400">
          {t('save.companyName')}
        </label>
        <input
          id="new-company-name"
          autoFocus
          value={name}
          onChange={(e) => setName(sanitizeEnglishInput(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirm()
            if (e.key === 'Escape') onCancel()
          }}
          placeholder={t('save.companyNamePlaceholder')}
          maxLength={30}
          spellCheck={false}
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-bold tracking-wide text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-400/50"
        />
        <p className="mt-1.5 text-[10px] text-slate-500">{t('save.companyNameHint')}</p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="game-btn rounded-full px-4 py-2 text-sm font-bold"
          >
            {t('save.cancel')}
          </button>
          <button
            type="button"
            onClick={confirm}
            className="game-btn game-btn-primary rounded-full px-5 py-2 text-sm font-bold"
          >
            {t('save.start')}
          </button>
        </div>
      </div>
    </div>
  )
}
