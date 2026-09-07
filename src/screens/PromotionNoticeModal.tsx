import { useTranslation } from '../locales/i18n'
import type { Grade, OwnedCreator } from '../game/characters'
import { characterDisplayName, characterDisplayJob } from '../game/characterLocales'
import { resolveMediaSrc } from '../game/mediaUrl'
import { findCharacterIconUrl } from '../game/characters'

type PromotionNoticeModalProps = {
  creator: OwnedCreator
  fromGrade: Grade
  toGrade: Grade
  onConfirm: () => void
  onGoToCreator: () => void
}

const GRADE_STYLE: Record<Grade, string> = {
  S: 'border-amber-400 text-amber-200 bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 shadow-[0_0_12px_rgba(251,191,36,0.85)] ring-1 ring-amber-400/50',
  A: 'border-purple-400 text-purple-200 bg-gradient-to-r from-purple-950 via-indigo-900 to-purple-950 shadow-[0_0_12px_rgba(168,85,247,0.85)] ring-1 ring-purple-400/50',
  B: 'border-cyan-400 text-cyan-200 bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 shadow-[0_0_12px_rgba(6,182,212,0.8)] ring-1 ring-cyan-400/50',
  C: 'border-slate-500 text-slate-200 bg-gradient-to-r from-slate-900 to-slate-800',
}

export function PromotionNoticeModal({
  creator,
  fromGrade,
  toGrade,
  onConfirm,
  onGoToCreator,
}: PromotionNoticeModalProps) {
  const { t, locale } = useTranslation()
  const displayName = characterDisplayName(creator, locale)
  const displayJob = characterDisplayJob(creator, locale)
  const iconUrl = findCharacterIconUrl(creator) || creator.profileImageUrl

  return (
    <div
      className="fixed inset-0 z-[88] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="game-panel-strong relative w-full max-w-md overflow-hidden rounded-3xl border-2 border-indigo-500/40 shadow-[0_0_50px_rgba(99,102,241,0.25)]">
        {/* 상단 화려한 광원 배너 */}
        <div className="relative border-b border-indigo-400/20 bg-gradient-to-b from-indigo-950/80 via-purple-950/40 to-transparent px-6 pb-5 pt-7 text-center">
          <div className="mx-auto mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-500/20 px-3 py-1 text-[11px] font-black tracking-widest text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.3)]">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
            {t('promotionNotice.badge')}
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-100">
            {t('promotionNotice.title')}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {t('promotionNotice.desc')}
          </p>
        </div>

        {/* 크리에이터 프로필 & 등급 전환 표시 */}
        <div className="space-y-4 px-6 py-6">
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-950/60 p-3.5 shadow-inner">
            {iconUrl ? (
              <img
                src={resolveMediaSrc(iconUrl, creator.mediaRevision)}
                alt={displayName}
                className="h-14 w-14 rounded-2xl object-cover border border-white/15 shadow"
              />
            ) : (
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-bold text-slate-950 shadow ${creator.avatarTone}`}
              >
                {displayName.slice(0, 1)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-base font-bold text-slate-100">{displayName}</p>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">{displayJob}</p>
            </div>
          </div>

          {/* 등급 전환 박스 */}
          <div className="flex items-center justify-center gap-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-indigo-950/40 px-4 py-3.5 shadow">
            <div className="text-center">
              <span className="text-[10px] font-bold text-slate-400 block mb-1">{t('promotionNotice.currentGrade')}</span>
              <span
                className={`inline-block rounded-lg border px-3.5 py-1 text-sm font-black italic tracking-widest ${GRADE_STYLE[fromGrade]}`}
              >
                {fromGrade}
              </span>
            </div>
            <div className="text-xl font-bold text-indigo-300 animate-pulse">➔</div>
            <div className="text-center">
              <span className="text-[10px] font-bold text-amber-300 block mb-1">{t('promotionNotice.targetGrade')}</span>
              <span
                className={`inline-block rounded-lg border px-3.5 py-1 text-sm font-black italic tracking-widest ${GRADE_STYLE[toGrade]}`}
              >
                {toGrade}
              </span>
            </div>
          </div>

          <p className="text-center text-xs leading-relaxed text-slate-400">
            {t('promotionNotice.readyDesc', { name: displayName, toGrade })}<br />
            {t('promotionNotice.readyHint')}
          </p>
        </div>

        {/* 액션 버튼 */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 border-t border-white/10 bg-slate-950/40 px-6 py-4">
          <button
            type="button"
            onClick={onConfirm}
            className="game-btn w-full sm:w-auto rounded-xl px-4 py-2.5 text-xs text-slate-400 hover:text-slate-200"
          >
            {t('promotionNotice.later')}
          </button>
          <button
            type="button"
            onClick={onGoToCreator}
            className="game-btn game-btn-primary w-full sm:w-auto rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]"
          >
            {t('promotionNotice.goToCreator')}
          </button>
        </div>
      </div>
    </div>
  )
}
