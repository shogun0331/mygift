import { useTranslation } from '../locales/i18n'
import { HUD_UI_ASSETS } from '../ui/hudAssets'

export type MonthEventFlags = {
  fanMeeting: boolean
  casino: boolean
}

export function emptyMonthEvents(): MonthEventFlags {
  return { fanMeeting: false, casino: false }
}

function summarizeFlags(
  flags: MonthEventFlags,
  t: (key: string) => string,
): string {
  const parts: string[] = []
  if (flags.fanMeeting) parts.push(t('hud.eventFan'))
  if (flags.casino) parts.push(t('hud.eventCasino'))
  return parts.length > 0 ? parts.join(' · ') : t('hud.noEvent')
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
  const chips: Array<{ key: string; src: string; label: string; tone: 'fan' | 'casino' }> = []
  if (current.fanMeeting) {
    chips.push({
      key: 'fan',
      src: HUD_UI_ASSETS.fan,
      label: t('hud.eventFan'),
      tone: 'fan',
    })
  }
  if (current.casino) {
    chips.push({
      key: 'casino',
      src: HUD_UI_ASSETS.casino,
      label: t('hud.eventCasino'),
      tone: 'casino',
    })
  }

  const prevTip = `${t('hud.monthPrev')}: ${summarizeFlags(previous, t)}`
  const nextTip = `${t('hud.monthNext')}: ${summarizeFlags(next, t)}`

  return (
    <div
      className="game-hud-schedule"
      aria-label={`${t('hud.monthNow')}: ${summarizeFlags(current, t)}`}
    >
      <span className="game-hud-schedule-arrow" title={prevTip} aria-hidden>
        ◀
      </span>
      <div className="game-hud-schedule-current">
        {chips.length === 0 ? (
          <span className="game-hud-schedule-empty">—</span>
        ) : (
          chips.map((chip) => (
            <span
              key={chip.key}
              className={`game-hud-schedule-chip game-hud-schedule-chip--${chip.tone}`}
            >
              <img src={chip.src} alt="" className="hud-ico" draggable={false} />
              <span>{chip.label}</span>
            </span>
          ))
        )}
      </div>
      <span className="game-hud-schedule-arrow" title={nextTip} aria-hidden>
        ▶
      </span>
    </div>
  )
}
