import { BlurRegionOverlay } from '../events/BlurRegionEditor'
import { pickCharacterLocaleText } from '../game/characterLocales'
import { formatMoney } from '../game/money'
import { resolveMediaSrc } from '../game/mediaUrl'
import { localizeVipRewardText, type VipVisit } from '../game/vip'
import { useTranslation } from '../locales/i18n'

type VipVisitModalProps = {
  visit: VipVisit
  assets: number
  onAccept: () => void
  onReject: () => void
}

export function VipVisitModal({ visit, assets, onAccept, onReject }: VipVisitModalProps) {
  const { t, locale } = useTranslation()
  const canPay = assets >= visit.pay
  const characterName = pickCharacterLocaleText(visit.names, locale, visit.characterName)

  return (
    <div
      className="fixed inset-0 z-[87] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vip-visit-title"
    >
      <div className="game-panel max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-amber-400/30 px-5 py-6 shadow-[0_0_40px_rgba(251,191,36,0.16)]">
        <p className="game-stat-label text-amber-300/85">VIP</p>
        <h2 id="vip-visit-title" className="mt-1 text-xl font-black text-slate-100">
          {t('vip.visitTitle')}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {t('vip.visitBody').replace('{name}', characterName)}
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/30">
          <div className="relative aspect-video w-full bg-black/50">
            {visit.imageUrl ? (
              <>
                <img src={resolveMediaSrc(visit.imageUrl)} alt="" className="h-full w-full object-cover" />
                {visit.blurRegions.length > 0 ? (
                  <BlurRegionOverlay
                    regions={visit.blurRegions}
                    src={resolveMediaSrc(visit.imageUrl)}
                    kind="image"
                  />
                ) : null}
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-black text-amber-100/80">
                {characterName.slice(0, 1)}
              </div>
            )}
          </div>
          <div className="px-3 py-3">
            <p className="truncate text-sm font-black text-slate-100">{characterName}</p>
            {visit.title ? <p className="truncate text-[12px] text-slate-400">{visit.title}</p> : null}
            <p className="text-[12px] font-bold text-amber-200">
              {t('vip.visitStat').replace('{value}', String(visit.stat))}
            </p>
            <p className="text-[12px] font-bold text-sky-200">
              {t('audit.ironWall')} {visit.ironWall}
            </p>
            <p className="text-[12px] font-bold text-rose-200">
              {t('audit.pressure')} {visit.pressure}
            </p>
          </div>
        </div>

        <section className="mt-4 rounded-xl border border-amber-400/20 bg-amber-950/30 px-3 py-3">
          <p className="text-[12px] font-semibold text-amber-100">
            {t('vip.visitPay').replace('{amount}', formatMoney(visit.pay))}
          </p>
          <p className="mt-2 text-[10px] font-black tracking-wide text-slate-400">{t('vip.visitReward')}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-200">
            {localizeVipRewardText(visit.rewardText, t)}
          </p>
        </section>

        {canPay ? null : (
          <p className="mt-3 text-xs font-semibold text-rose-300">{t('vip.visitNeedMoney')}</p>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            disabled={!canPay}
            onClick={onAccept}
            className="game-btn game-btn-primary min-w-[120px] px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('vip.visitAccept')}
          </button>
          <button type="button" onClick={onReject} className="game-btn min-w-[120px] px-4 py-2.5 text-sm">
            {t('vip.visitReject')}
          </button>
        </div>
      </div>
    </div>
  )
}
