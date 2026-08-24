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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4">
      <div
        className="game-panel w-full max-w-md rounded-2xl p-5 text-center shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
        style={{
          background: 'linear-gradient(165deg, #2b2f3a 0%, #151821 100%)',
          border: '1px border rgba(255,255,255,0.08)',
        }}
      >
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full ring-2 ring-amber-400/35 bg-black/30">
          {iconUrl ? (
            <img
              src={resolveMediaSrc(iconUrl, mediaRevision)}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-700/80 text-xl font-bold text-white">
              <StaffKindIcon kind={staffKind} className="h-7 w-7" />
            </div>
          )}
        </div>
        <p className="game-kicker text-amber-400 font-extrabold uppercase tracking-widest text-[10px]">
          {t('salaryRaise.title')}
        </p>
        <h3 className="mt-2 text-lg font-black text-slate-100">
          {t('salaryRaise.staffNameFormat').replace('{name}', staffName)}
        </h3>
        
        <div className="mt-4 rounded-xl bg-black/30 p-4 border border-white/5 space-y-3">
          <p className="text-[12px] leading-5 text-slate-400">
            {t('salaryRaise.dialogue')}
          </p>
          <div className="pt-2.5 border-t border-white/5 flex justify-around text-xs">
            <div>
              <span className="block text-[10px] text-slate-500 font-semibold">{t('salaryRaise.currentSalary')}</span>
              <span className="text-slate-300 font-bold tabular-nums">${currentSalary.toLocaleString()}/yr</span>
            </div>
            <div className="text-emerald-400 font-extrabold">
              <span className="block text-[10px] text-slate-500 font-semibold">{t('salaryRaise.requiredSalary')}</span>
              <span className="tabular-nums font-black">${requestedSalary.toLocaleString()}/yr</span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onReject}
            className="flex-1 game-btn rounded-xl py-2.5 text-xs font-bold text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 transition"
          >
            {t('salaryRaise.reject')}
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 game-btn game-btn-primary rounded-xl py-2.5 text-xs font-bold transition"
          >
            {t('salaryRaise.accept')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
