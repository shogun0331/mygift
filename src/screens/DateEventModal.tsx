import { useDateOfferSpeech } from './useDateOfferSpeech'
import {
  AFFECTION_MAX,
  AFFECTION_THRESHOLDS,
  clampAffection,
} from '../game/affection'
import { characterDisplayName } from '../game/characterLocales'
import type { DatePending } from '../game/social'
import { useTranslation } from '../locales/i18n'
import { resolveMediaSrc } from '../game/mediaUrl'

function Face({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  const src = imageUrl ? resolveMediaSrc(imageUrl) : null
  if (src) {
    return (
      <div className="relative shrink-0">
        <img
          src={src}
          alt={name}
          className="h-16 w-16 rounded-2xl border-2 border-pink-400/70 object-cover shadow-[0_0_20px_rgba(244,114,182,0.4)] sm:h-20 sm:w-20"
        />
        <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-xs shadow-md">
          ❤️
        </span>
      </div>
    )
  }
  return (
    <div className="relative shrink-0">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-pink-400/70 bg-gradient-to-br from-pink-600 to-purple-800 text-2xl font-black text-pink-100 shadow-[0_0_20px_rgba(244,114,182,0.4)] sm:h-20 sm:w-20">
        {name.slice(0, 1)}
      </div>
      <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-xs shadow-md">
        ❤️
      </span>
    </div>
  )
}

export function DateOfferModal({
  pending,
  affection,
  onStart,
}: {
  pending: DatePending
  affection?: number
  onStart: () => void
}) {
  const { t, locale } = useTranslation()
  const displayName = characterDisplayName(
    { id: pending.creatorId, name: pending.creatorName },
    locale,
  )
  const speech = useDateOfferSpeech(displayName, pending.creatorId)
  const line =
    speech?.text || t('date.offerBody').replace('{name}', displayName)
  const currentAffection = clampAffection(affection)
  const requiredAffection = AFFECTION_THRESHOLDS[pending.step]
  const affectionPct = Math.max(
    0,
    Math.min(100, Math.round((currentAffection / AFFECTION_MAX) * 100)),
  )
  const thresholdPct = Math.max(
    0,
    Math.min(100, Math.round((requiredAffection / AFFECTION_MAX) * 100)),
  )

  return (
    <div
      className="fixed inset-0 z-[87] flex items-center justify-center bg-black/84 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="date-offer-title"
    >
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-pink-500/40 bg-gradient-to-b from-slate-950/96 via-purple-950/50 to-slate-950/96 p-6 shadow-[0_0_75px_rgba(236,72,153,0.4)] sm:max-w-2xl sm:p-8">
        {/* Ambient background light flares */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-purple-500/20 blur-3xl" />

        <div className="relative z-10">
          {/* Header Badge */}
          <div className="flex items-center justify-between border-b border-pink-500/20 pb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-400/40 bg-pink-500/20 px-3.5 py-1 text-xs font-black tracking-wider text-pink-200 shadow-[0_0_15px_rgba(244,114,182,0.3)]">
              <span>💖</span> DATE EVENT
            </span>
            <span className="text-[11px] font-bold tracking-widest text-pink-300/70 uppercase">
              SPECIAL INVITATION
            </span>
          </div>

          {/* Character Info Banner */}
          <div className="mt-5 flex items-center gap-4.5 rounded-2xl border border-pink-400/35 bg-gradient-to-r from-pink-950/50 via-purple-950/35 to-black/60 p-4 shadow-inner">
            <Face name={displayName} imageUrl={pending.profileImageUrl} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg sm:text-xl font-black text-white">{displayName}</p>
              <p className="mt-1 text-xs font-semibold text-pink-200/80">
                {t('date.offerAffectionReady')}
              </p>
            </div>
          </div>

          {/* Affection gauge */}
          <div className="mt-4 rounded-2xl border border-pink-400/30 bg-pink-950/35 px-4 py-3.5 shadow-inner">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black tracking-wide text-pink-200">
                {t('affection.label')}
              </p>
              <p className="text-xs font-black tabular-nums text-pink-100">
                {t('date.offerAffectionValue', {
                  current: currentAffection,
                  max: AFFECTION_MAX,
                })}
              </p>
            </div>
            <div className="relative mt-2.5 h-3 overflow-hidden rounded-full bg-slate-900/90 ring-1 ring-pink-400/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 via-rose-400 to-fuchsia-300 shadow-[0_0_12px_rgba(244,114,182,0.55)] transition-[width] duration-500"
                style={{ width: `${affectionPct}%` }}
              />
              <span
                className="pointer-events-none absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-amber-200/90 shadow-[0_0_8px_rgba(253,230,138,0.9)]"
                style={{ left: `calc(${thresholdPct}% - 1px)` }}
                title={t('date.offerAffectionNeed', { need: requiredAffection })}
              />
            </div>
            <p className="mt-2 text-[11px] font-semibold text-pink-200/75">
              {t('date.offerAffectionNeed', { need: requiredAffection })}
            </p>
          </div>

          {/* Dialogue Line */}
          <p className="mt-6 px-2 text-center text-base sm:text-lg font-semibold leading-relaxed text-pink-100 italic whitespace-pre-wrap drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            “{line}”
          </p>

          {/* CTA Action Button */}
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onStart}
              className="group relative inline-flex min-w-[200px] items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 px-8 py-3.5 text-base font-black text-white shadow-[0_0_30px_rgba(236,72,153,0.5)] transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_0_45px_rgba(236,72,153,0.7)] active:scale-[0.98]"
            >
              <span className="text-lg">💖</span>
              <span className="tracking-wide">{t('date.start')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DateResultModal({
  pending,
  onConfirm,
}: {
  pending: DatePending
  onConfirm: () => void
}) {
  const { t, locale } = useTranslation()
  const displayName = characterDisplayName(
    { id: pending.creatorId, name: pending.creatorName },
    locale,
  )
  return (
    <div
      className="fixed inset-0 z-[87] flex items-center justify-center bg-black/84 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="date-result-title"
    >
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-pink-500/40 bg-gradient-to-b from-slate-950/96 via-purple-950/50 to-slate-950/96 p-6 shadow-[0_0_75px_rgba(236,72,153,0.4)] sm:max-w-2xl sm:p-8">
        {/* Ambient background light flares */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-purple-500/20 blur-3xl" />

        <div className="relative z-10 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-400/40 bg-pink-500/20 px-3.5 py-1 text-xs font-black tracking-wider text-pink-200 shadow-[0_0_15px_rgba(244,114,182,0.3)]">
            <span>🎉</span> DATE COMPLETE
          </span>
          <h2 id="date-result-title" className="mt-4 text-2xl sm:text-3xl font-black text-white drop-shadow-[0_2px_12px_rgba(244,114,182,0.45)]">
            {t('date.resultTitle')}
          </h2>
          <p className="mt-4 text-base font-medium leading-relaxed text-pink-100/90">
            {t('date.resultBody').replace('{name}', displayName)}
          </p>
          {pending.step === 'h' && (
            <div className="mt-5 space-y-2.5">
              <div className="rounded-2xl border border-emerald-400/40 bg-emerald-950/50 p-3 shadow-[0_0_25px_rgba(52,211,153,0.25)]">
                <p className="text-sm font-black text-emerald-300">{t('date.fullRecovery')}</p>
              </div>
              <div className="rounded-2xl border border-pink-400/50 bg-gradient-to-r from-pink-950/80 via-purple-950/80 to-pink-950/80 p-4 shadow-[0_0_30px_rgba(236,72,153,0.35)] text-left">
                <div className="flex items-center gap-2 text-pink-300 font-black text-sm">
                  <span className="text-base">🔓</span>
                  <span>{t('social.hUnlockTitle')}</span>
                </div>
                <p className="mt-1 text-xs text-pink-100/90 leading-relaxed">
                  {t('social.hUnlockDesc').replace('{name}', displayName)}
                </p>
              </div>
            </div>
          )}
          <div className="mt-7 flex justify-center">
            <button
              type="button"
              onClick={onConfirm}
              className="group relative inline-flex min-w-[200px] items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 px-8 py-3.5 text-base font-black text-white shadow-[0_0_30px_rgba(236,72,153,0.5)] transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_0_45px_rgba(236,72,153,0.7)] active:scale-[0.98]"
            >
              <span className="tracking-wide">{t('date.confirm')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
