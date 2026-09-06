import { createPortal } from 'react-dom'
import type { StaffKind } from '../game/staff'
import { resolveMediaSrc } from '../game/mediaUrl'
import { StaffKindIcon } from './StaffManagerUi'
import { useTranslation } from '../locales/i18n'

type StaffSalaryRaiseModalProps = {
  staffName: string
  staffKind: StaffKind
  iconUrl?: string | null
  mediaRevision?: number
  currentSalary: number
  requestedSalary: number
  onAccept: () => void
  onReject: () => void
}

export function StaffSalaryRaiseModal({
  staffName,
  staffKind,
  iconUrl,
  mediaRevision,
  currentSalary,
  requestedSalary,
  onAccept,
  onReject,
}: StaffSalaryRaiseModalProps) {
  const { t } = useTranslation()
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md transition-all animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-b from-slate-900/95 via-slate-950/98 to-slate-900/95 p-6 text-center shadow-[0_0_50px_rgba(245,158,11,0.22)] ring-1 ring-amber-400/20 transition-all animate-in zoom-in-95 duration-200">
        {/* 상단 포인트 조명 네온 바 */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]" />

        {/* 아바타 프로필 */}
        <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-amber-400/50 bg-slate-900 shadow-[0_0_25px_rgba(245,158,11,0.3)] ring-2 ring-amber-400/20 shrink-0">
          {iconUrl ? (
            <img
              src={resolveMediaSrc(iconUrl, mediaRevision)}
              alt={staffName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-800 text-xl font-bold text-amber-300">
              <StaffKindIcon kind={staffKind} className="h-8 w-8" />
            </div>
          )}
        </div>

        {/* 뱃지 & 헤더 */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-amber-300 shadow-sm">
          <span className="text-xs">💼</span>
          <span>{t('salaryRaise.title')}</span>
        </div>

        <h3 className="mt-2 text-xl font-black text-slate-100 tracking-tight">
          {t('salaryRaise.staffNameFormat').replace('{name}', staffName)}
        </h3>

        {/* 대화 인용 & 연폭 정보 카드 */}
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3.5 text-xs leading-relaxed text-slate-300 italic shadow-inner">
            "{t('salaryRaise.dialogue').replace(/^"/, '').replace(/"$/, '')}"
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-amber-400/20 bg-slate-900/80 p-3.5 shadow-inner">
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2.5">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t('salaryRaise.currentSalary')}
              </span>
              <span className="mt-0.5 block text-sm font-extrabold text-slate-300 font-mono tabular-nums">
                ${currentSalary.toLocaleString()}/yr
              </span>
            </div>

            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-2.5">
              <span className="block text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                {t('salaryRaise.requiredSalary')}
              </span>
              <span className="mt-0.5 block text-base font-black text-emerald-300 font-mono tabular-nums drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                ${requestedSalary.toLocaleString()}/yr
              </span>
            </div>
          </div>
        </div>

        {/* 수락 / 거절 버튼 */}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onReject}
            className="flex-1 cursor-pointer rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-950/70 to-slate-900 px-4 py-3 text-xs sm:text-sm font-extrabold text-rose-300 shadow-md transition-all hover:bg-rose-900/60 hover:border-rose-400 hover:scale-[1.02] active:scale-95"
          >
            {t('salaryRaise.reject')}
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 cursor-pointer rounded-xl border border-amber-400/60 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 px-4 py-3 text-xs sm:text-sm font-black text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all hover:scale-[1.02] hover:brightness-110 active:scale-95"
          >
            {t('salaryRaise.accept')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
