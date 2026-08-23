import { createPortal } from 'react-dom'
import { resolveMediaSrc } from '../game/mediaUrl'
import {
  STAFF_HIRE_COST,
  STAFF_SLOT_KINDS,
  staffBonusOf,
  type SlotManagerState,
  type StaffKind,
} from '../game/slotManagers'
import {
  STAFF_KIND_LABEL_KEY,
  staffCardUrl,
  staffDisplayName,
  staffIconUrl,
  type RegisteredStaff,
} from '../game/staff'
import { useTranslation } from '../locales/i18n'

export const KIND_TONE: Record<StaffKind, string> = {
  security: 'border-rose-400/50 bg-rose-500/15 text-rose-200 shadow-[0_0_10px_rgba(244,63,94,0.25)]',
  repair: 'border-amber-400/50 bg-amber-500/15 text-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.25)]',
  care: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200 shadow-[0_0_10px_rgba(52,211,153,0.25)]',
  production: 'border-violet-400/50 bg-violet-500/15 text-violet-200 shadow-[0_0_10px_rgba(167,139,250,0.25)]',
}

const KIND_EMPTY = 'border-white/10 bg-black/30 text-slate-500'

export function StaffKindIcon({ kind, className }: { kind: StaffKind; className?: string }) {
  const cn = className ?? 'h-3 w-3'
  switch (kind) {
    case 'security':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'repair':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-1.5 1.5-2.8-2.8 1.5-1.5z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'care':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 20s-6.5-4.5-6.5-9a3.5 3.5 0 0 1 6-2 3.5 3.5 0 0 1 6 2c0 4.5-6.5 9-6.5 9z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'production':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="6" width="18" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M7 6V4h10v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M10 11h4M10 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
  }
}

export function StaffSlotIcons({
  slotId,
  managerState,
  registeredStaff,
  size = 'md',
}: {
  slotId: string
  managerState: SlotManagerState
  registeredStaff: RegisteredStaff[]
  size?: 'sm' | 'md'
}) {
  const { t, locale } = useTranslation()
  const box = size === 'sm' ? 'h-5 w-5 text-[8px]' : 'h-6 w-6 text-[9px]'
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
  return (
    <div className="flex items-center gap-1">
      {STAFF_SLOT_KINDS.map((kind) => {
        const bonus = staffBonusOf(managerState, slotId, kind)
        const staff = bonus.staffId
          ? registeredStaff.find((row) => row.id === bonus.staffId)
          : null
        const icon = staffIconUrl(staff)
        return (
          <div
            key={kind}
            title={staff ? staffDisplayName(staff, locale) : t(STAFF_KIND_LABEL_KEY[kind])}
            className={`flex items-center justify-center overflow-hidden rounded-md border ${box} ${
              bonus.equipped ? KIND_TONE[kind] : KIND_EMPTY
            }`}
          >
            {icon ? (
              <img src={resolveMediaSrc(icon, staff?.mediaRevision)} alt="" className="h-full w-full object-cover" />
            ) : (
              <StaffKindIcon kind={kind} className={iconSize} />
            )}
          </div>
        )
      })}
    </div>
  )
}

type ManagerPopupProps = {
  slotId: string
  slotLabel: string
  managerState: SlotManagerState
  registeredStaff: RegisteredStaff[]
  assets: number
  placementLocked: boolean
  onClose: () => void
  onHire: (staffId: string) => boolean
  onEquip: (kind: StaffKind, staffId: string) => void
  onUnequip: (kind: StaffKind) => void
}

export function ManagerEquipPopup({
  slotId,
  slotLabel,
  managerState,
  registeredStaff,
  assets,
  placementLocked,
  onClose,
  onHire,
  onEquip,
  onUnequip,
}: ManagerPopupProps) {
  const { t, locale } = useTranslation()
  const hired = registeredStaff.filter((row) => managerState.hiredStaffIds.includes(row.id))

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="game-panel max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-2xl p-4 sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="game-kicker">STAFF</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-100">
              {t('studio.managersTitle')} · {slotLabel}
            </h2>
            <p className="mt-1 text-xs text-slate-400">{t('studio.managersDesc')}</p>
          </div>
          <button type="button" onClick={onClose} className="game-btn rounded-xl px-3 py-1.5 text-sm">
            {t('studio.managersClose')}
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {STAFF_SLOT_KINDS.map((kind) => {
            const equippedId = managerState.equippedBySlotId[slotId]?.[kind] ?? null
            const ofKind = hired.filter((row) => row.kind === kind)
            const unhired = registeredStaff.filter(
              (row) => row.kind === kind && !managerState.hiredStaffIds.includes(row.id),
            )
            return (
              <section key={kind} className="rounded-xl border border-white/8 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-100">{t(STAFF_KIND_LABEL_KEY[kind])}</p>
                  <p className="text-[10px] text-slate-500">{t(`studio.managerFx.${kind}`)}</p>
                </div>
                {ofKind.length === 0 && unhired.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-500">{t('studio.managersEmptyKind')}</p>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {ofKind.map((staff) => {
                      const card = staffCardUrl(staff)
                      const equipped = equippedId === staff.id
                      const displayName = staffDisplayName(staff, locale)
                      return (
                        <article
                          key={staff.id}
                          className={`overflow-hidden rounded-xl border ${
                            equipped ? 'border-indigo-400/60' : 'border-white/10'
                          }`}
                        >
                          <div className="relative aspect-[3/4] bg-slate-950">
                            {card ? (
                              <img
                                src={resolveMediaSrc(card, staff.mediaRevision)}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-2xl font-black text-slate-600">
                                {displayName.slice(0, 1)}
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="truncate text-xs font-semibold text-slate-100">{displayName}</p>
                            {placementLocked ? (
                              <p className="mt-1 text-[10px] text-slate-500">
                                {equipped ? t('studio.managerEquipped') : t('studio.managersLocked')}
                              </p>
                            ) : equipped ? (
                              <button
                                type="button"
                                onClick={() => onUnequip(kind)}
                                className="mt-1 w-full rounded-lg border border-white/15 px-2 py-1 text-[10px] font-bold text-slate-200"
                              >
                                {t('studio.managerUnequip')}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onEquip(kind, staff.id)}
                                className="game-btn-primary mt-1 w-full rounded-lg px-2 py-1 text-[10px] font-bold"
                              >
                                {t('studio.managerEquip')}
                              </button>
                            )}
                          </div>
                        </article>
                      )
                    })}
                    {unhired.map((staff) => {
                      const card = staffCardUrl(staff)
                      const canHire = assets >= STAFF_HIRE_COST
                      const displayName = staffDisplayName(staff, locale)
                      return (
                        <article key={staff.id} className="overflow-hidden rounded-xl border border-dashed border-white/15">
                          <div className="relative aspect-[3/4] bg-slate-950">
                            {card ? (
                              <img
                                src={resolveMediaSrc(card, staff.mediaRevision)}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-2xl font-black text-slate-600">
                                {displayName.slice(0, 1)}
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="truncate text-xs font-semibold text-slate-100">{displayName}</p>
                            {placementLocked ? (
                              <p className="mt-1 text-[10px] text-slate-500">{t('studio.managersLocked')}</p>
                            ) : (
                              <button
                                type="button"
                                disabled={!canHire}
                                onClick={() => onHire(staff.id)}
                                className="game-btn-primary mt-1 w-full rounded-lg px-2 py-1 text-[10px] font-bold disabled:opacity-40"
                              >
                                {t('studio.managerHire')} ${STAFF_HIRE_COST.toLocaleString()}
                              </button>
                            )}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
