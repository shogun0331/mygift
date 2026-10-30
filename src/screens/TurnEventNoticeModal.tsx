import { useTranslation } from '../locales/i18n'
import { UiDialogBtn, UiDialogShell } from '../ui/UiDialogShell'

export type TurnEventNoticeFlags = {
  fanMeeting: boolean
  casino: boolean
  promotion: boolean
}

type TurnEventNoticeModalProps = {
  flags: TurnEventNoticeFlags
  onConfirm: () => void
}

function FanIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
      <path
        fill="currentColor"
        d="M12 20.2 4.1 12.5a4.7 4.7 0 0 1 6.6-6.6L12 5.6l1.3-1.3a4.7 4.7 0 0 1 6.6 6.6L12 20.2Z"
      />
    </svg>
  )
}

function CasinoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
      <path
        d="M12 3.5v2.4M12 18.1v2.4M3.5 12h2.4M18.1 12h2.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PromotionIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
      <path
        fill="currentColor"
        d="M12 2.8 14.4 8l5.6.5-4.3 3.7 1.3 5.4L12 15.2 6.9 17.6l1.3-5.4L4 8.5 9.6 8 12 2.8Z"
      />
    </svg>
  )
}

export function TurnEventNoticeModal({ flags, onConfirm }: TurnEventNoticeModalProps) {
  const { t } = useTranslation()
  const items: Array<{
    key: string
    title: string
    body: string
    tone: string
    iconTone: string
    Icon: typeof FanIcon
  }> = []
  if (flags.fanMeeting) {
    items.push({
      key: 'fan',
      title: t('turnEventNotice.fanTitle'),
      body: t('turnEventNotice.fanBody'),
      tone: 'border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-100',
      iconTone: 'border-fuchsia-300/40 bg-fuchsia-500/20 text-fuchsia-200',
      Icon: FanIcon,
    })
  }
  if (flags.casino) {
    items.push({
      key: 'casino',
      title: t('turnEventNotice.casinoTitle'),
      body: t('turnEventNotice.casinoBody'),
      tone: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
      iconTone: 'border-amber-300/40 bg-amber-500/20 text-amber-200',
      Icon: CasinoIcon,
    })
  }
  if (flags.promotion) {
    items.push({
      key: 'promotion',
      title: t('turnEventNotice.promotionTitle'),
      body: t('turnEventNotice.promotionBody'),
      tone: 'border-sky-400/40 bg-sky-500/10 text-sky-100',
      iconTone: 'border-sky-300/40 bg-sky-500/20 text-sky-200',
      Icon: PromotionIcon,
    })
  }

  return (
    <UiDialogShell
      labelledBy="turn-event-notice-title"
      tone="indigo"
      zClassName="z-[87]"
      backdropClassName="animate-in fade-in duration-200"
    >
      <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
        {t('turnEventNotice.badge')}
      </div>

      <h2 id="turn-event-notice-title" className="mt-3 text-xl font-black tracking-tight text-slate-100">
        {t('turnEventNotice.title')}
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{t('turnEventNotice.body')}</p>

      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li
            key={item.key}
            className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 ${item.tone}`}
          >
            <span
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${item.iconTone}`}
            >
              <item.Icon />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black">{item.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-300/90">{item.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-center">
        <UiDialogBtn onClick={onConfirm} className="w-full max-w-[220px]">
          {t('turnEventNotice.confirm')}
        </UiDialogBtn>
      </div>
    </UiDialogShell>
  )
}

export function emptyTurnEventNotice(): TurnEventNoticeFlags {
  return { fanMeeting: false, casino: false, promotion: false }
}

export function hasTurnEventNotice(flags: TurnEventNoticeFlags | null | undefined): boolean {
  return Boolean(flags?.fanMeeting || flags?.casino || flags?.promotion)
}
