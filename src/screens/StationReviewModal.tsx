import { formatMoney } from '../game/money'
import {
  stationGradeLabel,
  stationPromotionAssetReward,
  type StationReviewStatus,
} from '../game/station'
import { useTranslation } from '../locales/i18n'

import type { StationReviewCheck } from '../game/stationGradeConfig'

type StationReviewModalProps = {
  promoted: boolean
  status: StationReviewStatus
  onConfirm: () => void
  onDecline?: () => void
  onClose?: () => void
}

function formatCheckText(
  check: StationReviewCheck,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  let label = check.label
  let detail = check.detail

  if (check.id === 'viewers') {
    label = t('station.needViewers')
    if (check.currentValue != null && check.targetValue != null) {
      const c = check.currentValue.toLocaleString()
      const r = check.targetValue.toLocaleString()
      const unit = t('ranking.viewersUnit') || ''
      detail = `${c} / ${r}${unit}`
    }
  } else if (check.id === 'slots') {
    label = t('ranking.cond.slots', { n: '' }).trim() || 'Open Slots'
    if (check.currentValue != null && check.targetValue != null) {
      detail = `${check.currentValue} / ${check.targetValue}`
    }
  } else if (check.id === 'assets') {
    label = t('ranking.cond.assets', { n: '' }).trim() || 'Assets'
    if (check.currentValue != null && check.targetValue != null) {
      detail = `$${check.currentValue.toLocaleString()} / $${check.targetValue.toLocaleString()}`
    }
  } else if (check.id === 'snsSubscribers') {
    label = t('sns.subscribers') || 'SNS Subscribers'
    if (check.currentValue != null && check.targetValue != null) {
      const countStr = `${check.currentValue.toLocaleString()} / ${check.targetValue.toLocaleString()}`
      detail = t('sns.countUnit', { count: countStr })
    }
  } else if (check.grade && check.currentValue != null && check.targetValue != null) {
    label = t('station.needCreators', { grade: check.grade, count: check.targetValue })
    detail = t('sns.countUnit', { count: `${check.currentValue} / ${check.targetValue}` })
  }

  return { label, detail }
}

export function StationReviewModal({ promoted, status, onConfirm, onDecline, onClose }: StationReviewModalProps) {
  const { t, locale } = useTranslation()
  const maxed = status.next == null
  const assetReward =
    promoted && status.next ? stationPromotionAssetReward(status.next) : 0

  return (
    <div
      className="fixed inset-0 z-[86] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md transition-all animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="station-review-title"
    >
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-2xl border bg-gradient-to-b from-slate-900/95 via-slate-950/98 to-slate-900/95 p-6 shadow-2xl transition-all ${
          promoted
            ? 'border-amber-400/40 shadow-[0_0_50px_rgba(245,158,11,0.22)]'
            : 'border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.18)]'
        }`}
      >
        {/* 상단 포인트 조명 네온 바 */}
        <div
          className={`absolute inset-x-0 top-0 h-1.5 ${
            promoted
              ? 'bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]'
              : 'bg-gradient-to-r from-indigo-500 via-sky-400 to-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)]'
          }`}
        />

        {/* 상단 뱃지 & 헤더 */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-amber-300 shadow-sm">
            <span className="text-xs">📊</span>
            <span>{t('station.reviewKicker')}</span>
          </div>

          <div className="flex items-center gap-2">
            {promoted && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-300 animate-pulse">
                <span>✨</span>
                <span>SUCCESS</span>
              </span>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 타이틀 */}
        <h2 id="station-review-title" className="mt-3 flex items-center gap-2 text-2xl font-black tracking-tight">
          {maxed ? (
            <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
              👑 {t('station.reviewMax')}
            </span>
          ) : promoted ? (
            <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent drop-shadow">
              🏆 {t('station.reviewPass')}
            </span>
          ) : (
            <span className="text-slate-100">
              ⚓ {t('station.reviewFail')}
            </span>
          )}
        </h2>

        {/* 등급 변환 (Transition UI) */}
        <div className="mt-4 rounded-xl border border-white/5 bg-slate-900/60 p-3.5 shadow-inner">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 rounded-lg border border-slate-700/60 bg-slate-800/80 px-3 py-2 text-center shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">이전 등급</p>
              <p className="mt-0.5 text-sm font-extrabold text-slate-200">
                {stationGradeLabel(status.current, locale)}
              </p>
            </div>

            {promoted && status.next ? (
              <>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/20 text-sm font-black text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse">
                  ➔
                </div>
                <div className="flex-1 rounded-lg border border-amber-400/50 bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 px-3 py-2 text-center shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                  <p className="text-[10px] font-bold text-amber-300/80 uppercase tracking-wider">승급 등급</p>
                  <p className="mt-0.5 text-sm font-black text-amber-200">
                    {stationGradeLabel(status.next, locale)}
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* 심사 조건 항목 리스트 */}
        {!maxed ? (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              {t('station.reviewChecks')}
            </p>
            <ul className="space-y-2">
              {status.checks.map((check) => {
                const { label, detail } = formatCheckText(check, t)
                return (
                  <li
                    key={check.id}
                    className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-all ${
                      check.met
                        ? 'border-emerald-500/35 bg-gradient-to-r from-emerald-950/50 to-slate-900/60 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.06)]'
                        : 'border-rose-500/35 bg-gradient-to-r from-rose-950/50 to-slate-900/60 text-rose-100 shadow-[0_0_15px_rgba(244,63,94,0.06)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black border ${
                          check.met
                            ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300'
                            : 'border-rose-400/50 bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {check.met ? '✓' : '✕'}
                      </span>
                      <span className="truncate text-slate-200 font-bold">{label}</span>
                    </div>

                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold font-mono border ${
                        check.met
                          ? 'border-emerald-500/30 bg-emerald-900/40 text-emerald-300'
                          : 'border-rose-500/30 bg-rose-900/40 text-rose-300'
                      }`}
                    >
                      {detail}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3.5 text-xs font-medium leading-relaxed text-amber-200">
            {t('station.reviewMaxBody')}
          </p>
        )}

        {/* 승급 보상 정보 */}
        {promoted && status.next ? (
          <div className="mt-4 rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-slate-900/80 to-amber-950/20 p-3.5 shadow-inner">
            <p className="flex items-center gap-1.5 text-xs font-black tracking-wider text-amber-300 uppercase">
              <span>🎁</span>
              <span>{t('station.rewardTitle')}</span>
            </p>
            <div className="mt-2.5 space-y-1.5">
              {assetReward > 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200">
                  <span className="text-sm">💰</span>
                  <span>{t('station.rewardAssets').replace('{amount}', formatMoney(assetReward))}</span>
                </div>
              ) : null}
              {status.next !== 'tiny' ? (
                <div className="flex items-center gap-2 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs font-bold text-sky-200">
                  <span className="text-sm">🔬</span>
                  <span>{t(`station.rewardScout.${status.next}` as 'station.rewardScout.sme')}</span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* 미승급 시 안대 가이드 */}
        {!promoted && !maxed ? (
          <p className="mt-4 rounded-xl border border-slate-700/50 bg-slate-900/50 p-3 text-xs font-medium leading-relaxed text-slate-400">
            {t('station.reviewFailBody')}
          </p>
        ) : null}

        {/* 승급 심사 도전 확인 멘트 및 버튼 영역 */}
        {promoted && status.next ? (
          <div className="mt-6 space-y-3">
            <p className="text-center text-sm font-bold text-amber-300 drop-shadow">
              {t('station.challengePrompt')}
            </p>
            <div className="flex items-center justify-center gap-3">
              {onDecline && (
                <button
                  type="button"
                  onClick={onDecline}
                  className="flex-1 cursor-pointer rounded-xl border border-slate-600 bg-slate-800/90 py-3 px-4 text-xs sm:text-sm font-bold text-slate-300 shadow-md hover:bg-slate-700 hover:text-white transition-all active:scale-95"
                >
                  {t('station.challengeDecline')}
                </button>
              )}
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 cursor-pointer rounded-xl border-2 border-yellow-200 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 py-3 px-4 text-xs sm:text-sm font-black text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all hover:scale-105 active:scale-95 hover:brightness-110"
              >
                {t('station.challengeAccept')}
              </button>
            </div>
          </div>
        ) : (
          /* 기본 확인 버튼 (미승급 또는 최고 등급일 때) */
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onConfirm}
              className="w-full max-w-[200px] cursor-pointer rounded-xl px-5 py-3 text-sm font-black shadow-lg transition-all hover:scale-105 active:scale-95 bg-slate-800 text-slate-200 border border-slate-600 hover:bg-slate-700"
            >
              {t('station.confirm')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
