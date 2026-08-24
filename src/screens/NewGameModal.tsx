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
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-game-title"
    >
      <div className="game-panel w-full max-w-md rounded-2xl border border-indigo-500/30 bg-slate-950/90 p-6 shadow-[0_0_50px_rgba(79,70,229,0.3)] backdrop-blur-xl">
        <div className="border-b border-indigo-500/20 pb-3.5">
          <p className="text-[11px] font-extrabold tracking-widest text-indigo-400 uppercase">
            STAR BROADCASTING CO.
          </p>
          <h2 id="new-game-title" className="mt-0.5 text-xl font-black tracking-tight text-slate-100 sm:text-2xl">
            {t('save.newGameTitle')}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            새롭게 이끌어갈 방송국(회사)의 이름을 입력하세요.
          </p>
        </div>

        <div className="mt-5">
          <label htmlFor="new-company-name" className="block text-xs font-extrabold text-slate-300">
            🏢 {t('save.companyName')}
          </label>
          <div className="relative mt-2">
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
              className="w-full rounded-xl border border-indigo-400/30 bg-slate-900/90 px-4 py-3 text-base font-black tracking-wide text-indigo-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-400 focus:bg-slate-900 focus:shadow-[0_0_20px_rgba(99,102,241,0.35)]"
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
            {t('save.companyNameHint')}
          </p>
        </div>

        <div className="mt-7 flex justify-end gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="game-btn rounded-xl px-5 py-2.5 text-sm font-bold text-slate-300 hover:text-white"
          >
            {t('save.cancel')}
          </button>
          <button
            type="button"
            onClick={confirm}
            className="rounded-xl border border-indigo-400/50 bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-black text-white transition hover:from-indigo-500 hover:to-purple-500 hover:shadow-[0_0_24px_rgba(99,102,241,0.5)] active:scale-95"
          >
            🚀 {t('save.start')}
          </button>
        </div>
      </div>
    </div>
  )
}
