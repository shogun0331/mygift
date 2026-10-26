import { useTranslation } from '../locales/i18n'

export type MonthEventFlags = {
  fanMeeting: boolean
  casino: boolean
}

export function emptyMonthEvents(): MonthEventFlags {
  return { fanMeeting: false, casino: false }
}

function FanMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="game-hud-event-mark">
      <path
        fill="currentColor"
        d="M8 13.2 2.7 8.1a3.1 3.1 0 0 1 4.4-4.4L8 4.6l.9-.9a3.1 3.1 0 0 1 4.4 4.4L8 13.2Z"
      />
    </svg>
  )
}

function CasinoMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="game-hud-event-mark">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="2.15" fill="currentColor" />
      <path
        d="M8 1.7v2M8 12.3v2M1.7 8h2M12.3 8h2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function EventChips({ flags }: { flags: MonthEventFlags }) {
  const { t } = useTranslation()
  if (!flags.fanMeeting && !flags.casino) {
    return <p className="game-hud-event-empty">{t('hud.noEvent')}</p>
  }
  return (
    <div className="game-hud-event-list">
      {flags.fanMeeting ? (
        <span className="game-hud-event game-hud-event--fan">
          <FanMark />
          <span>{t('hud.eventFan')}</span>
        </span>
      ) : null}
      {flags.casino ? (
        <span className="game-hud-event game-hud-event--casino">
          <CasinoMark />
          <span>{t('hud.eventCasino')}</span>
        </span>
      ) : null}
    </div>
  )
}

export function MonthEventStrip({
  previous,
  current,
  next,
}: {
  previous: MonthEventFlags
  current: MonthEventFlags
  next: MonthEventFlags
}) {
  const { t } = useTranslation()
  const columns = [
    { key: 'prev', label: t('hud.monthPrev'), flags: previous },
    { key: 'now', label: t('hud.monthNow'), flags: current },
    { key: 'next', label: t('hud.monthNext'), flags: next },
  ]
  return (
    <div className="game-hud-cell game-hud-cell--months">
      <div className="game-hud-month-grid">
        {columns.map((column) => (
          <div key={column.key} className="game-hud-month-col">
            <p className="game-stat-label game-hud-month-label">{column.label}</p>
            <EventChips flags={column.flags} />
          </div>
        ))}
      </div>
    </div>
  )
}
