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
  const preview = (name.trim() || 'STAR').toUpperCase()

  const confirm = () => onConfirm(name.trim() || 'STAR')

  return (
    <div
      className="new-company-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-game-title"
    >
      <div className="new-company-card">
        <div className="new-company-card-glow" aria-hidden />
        <div className="new-company-kicker">
          <span className="new-company-kicker-dot" />
          STAR BROADCASTING CO.
        </div>

        <h2 id="new-game-title" className="new-company-title">
          {t('save.newGameTitle')}
        </h2>
        <p className="new-company-lead">{t('save.newGameBody')}</p>

        <div className="new-company-ident" aria-hidden>
          <span className="new-company-ident-label">CALLSIGN</span>
          <span className="new-company-ident-name">{preview}</span>
        </div>

        <label htmlFor="new-company-name" className="new-company-label">
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
          className="new-company-input"
        />
        <p className="new-company-hint">
          {t('save.companyNameHint')}
          <span className="new-company-count">{name.length}/30</span>
        </p>

        <div className="new-company-actions">
          <button type="button" onClick={onCancel} className="new-company-btn-ghost">
            {t('save.cancel')}
          </button>
          <button type="button" onClick={confirm} className="new-company-btn-go">
            {t('save.start')}
          </button>
        </div>
      </div>
    </div>
  )
}
