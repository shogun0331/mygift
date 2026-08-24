import { formatViewers } from '../game/ranking'
import {
  VIP_ACCEPT_BY_GRADE,
  VIP_REJECT_VIEWERS_BY_GRADE,
  type VipOffer,
} from '../game/vip'
import { useTranslation } from '../locales/i18n'

type VipOfferModalProps = {
  offer: VipOffer
  onAccept: () => void
  onReject: () => void
}

export function VipOfferModal({ offer, onAccept, onReject }: VipOfferModalProps) {
  const { t } = useTranslation()
  const accept = VIP_ACCEPT_BY_GRADE[offer.grade]
  const reject = VIP_REJECT_VIEWERS_BY_GRADE[offer.grade]

  return (
    <div
      className="fixed inset-0 z-[87] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vip-offer-title"
    >
      <div className="game-panel w-full max-w-md rounded-2xl border border-violet-400/30 px-5 py-6 shadow-[0_0_40px_rgba(167,139,250,0.18)]">
        <p className="game-stat-label text-violet-300/85">VIP REQUEST</p>
        <h2 id="vip-offer-title" className="mt-1 text-xl font-black text-slate-100">
          {t('vip.offerTitle')}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {t('vip.offerBody').replace('{name}', offer.creatorName)}
        </p>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-3">
          <CreatorFace name={offer.creatorName} imageUrl={offer.profileImageUrl} />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-100">{offer.creatorName}</p>
            <p className="text-[11px] font-bold text-amber-300">
              {t('vip.gradeLabel').replace('{grade}', offer.grade)}
            </p>
          </div>
        </div>

        <section className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-950/30 px-3 py-3">
          <p className="text-[10px] font-black tracking-wide text-emerald-300/80">
            {t('vip.acceptHeader')}
          </p>
          <p className="mt-1.5 text-[12px] font-semibold text-rose-200">
            {t('vip.acceptStamina').replace('{n}', String(accept.staminaMaxLoss))}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            {t('vip.acceptStaminaHint').replace('{n}', String(accept.staminaMaxLoss))}
          </p>
        </section>

        <section className="mt-2.5 rounded-xl border border-rose-400/20 bg-rose-950/30 px-3 py-3">
          <p className="text-[10px] font-black tracking-wide text-rose-300/80">
            {t('vip.rejectHeader')}
          </p>
          <p className="mt-1.5 text-[12px] font-semibold text-rose-100">
            {t('vip.rejectViewers').replace(
              '{range}',
              `${formatViewers(reject.min)} ~ ${formatViewers(reject.max)}`,
            )}
          </p>
        </section>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onAccept}
            className="game-btn game-btn-primary min-w-[120px] px-4 py-2.5 text-sm"
          >
            {t('vip.accept')}
          </button>
          <button
            type="button"
            onClick={onReject}
            className="game-btn min-w-[120px] px-4 py-2.5 text-sm"
          >
            {t('vip.reject')}
          </button>
        </div>
      </div>
    </div>
  )
}

function CreatorFace({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="h-12 w-12 shrink-0 rounded-full border border-white/15 object-cover"
      />
    )
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-violet-400/40 bg-violet-500/20 text-sm font-black text-violet-100">
      {name.slice(0, 1)}
    </div>
  )
}
