import { createPortal } from 'react-dom'
import type { StaffKind } from '../game/staff'
import { resolveMediaSrc } from '../game/mediaUrl'
import { StaffKindIcon } from './StaffManagerUi'
import { useTranslation } from '../locales/i18n'
import { UiDialogBtn, UiDialogShell } from '../ui/UiDialogShell'

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
    <UiDialogShell
      tone="amber"
      zClassName="z-[100]"
      backdropClassName="animate-in fade-in duration-200"
    >
      <div className="shrink-0 text-center">
        <div className="mx-auto mb-1.5 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-amber-400/50 bg-slate-900 shrink-0">
          {iconUrl ? (
            <img
              src={resolveMediaSrc(iconUrl, mediaRevision)}
              alt={staffName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-800 text-xl font-bold text-amber-300">
              <StaffKindIcon kind={staffKind} className="h-7 w-7" />
            </div>
          )}
        </div>

        <div className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-300">
          <span className="text-[10px]">💼</span>
          <span>{t('salaryRaise.title')}</span>
        </div>

        <h3 className="mt-1 text-base font-black tracking-tight text-slate-100 sm:text-lg">
          {t('salaryRaise.staffNameFormat').replace('{name}', staffName)}
        </h3>
      </div>

      <div className="min-h-0 shrink space-y-2 overflow-hidden">
        <div className="rounded-lg border border-white/5 bg-slate-950/60 px-2.5 py-2 text-[11px] leading-snug text-slate-300 italic shadow-inner line-clamp-4">
          "{t('salaryRaise.dialogue').replace(/^"/, '').replace(/"$/, '')}"
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-lg border border-amber-400/20 bg-slate-900/80 p-2 shadow-inner">
          <div className="rounded-md border border-slate-800 bg-slate-950/50 p-2">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
              {t('salaryRaise.currentSalary')}
            </span>
            <span className="mt-0.5 block font-mono text-xs font-extrabold tabular-nums text-slate-300">
              ${currentSalary.toLocaleString()}/yr
            </span>
          </div>

          <div className="rounded-md border border-emerald-500/30 bg-emerald-950/30 p-2">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-400">
              {t('salaryRaise.requiredSalary')}
            </span>
            <span className="mt-0.5 block font-mono text-sm font-black tabular-nums text-emerald-300">
              ${requestedSalary.toLocaleString()}/yr
            </span>
          </div>
        </div>
      </div>

      <div className="mt-1 flex min-w-0 shrink-0 gap-2">
        <button
          type="button"
          onClick={onReject}
          className="min-w-0 flex-1 cursor-pointer rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-950/70 to-slate-900 px-3 py-2.5 text-xs font-extrabold text-rose-300 shadow-md transition-all hover:border-rose-400 hover:bg-rose-900/60 active:scale-95"
        >
          {t('salaryRaise.reject')}
        </button>
        <UiDialogBtn onClick={onAccept} className="min-w-0 flex-1 px-3 py-2.5 text-xs">
          {t('salaryRaise.accept')}
        </UiDialogBtn>
      </div>
    </UiDialogShell>,
    document.body,
  )
}
