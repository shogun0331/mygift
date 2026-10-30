import { UiDialogBtn, UiDialogShell } from '../ui/UiDialogShell'

type DeviceLockModalProps = {
  onDismiss: () => void
}

export function DeviceLockModal({ onDismiss }: DeviceLockModalProps) {
  return (
    <UiDialogShell
      labelledBy="device-lock-title"
      tone="rose"
      zClassName="z-[200]"
    >
      <div className="text-center">
        <p className="game-stat-label text-rose-300/80">LICENSE</p>
        <h2 id="device-lock-title" className="mt-1.5 text-lg font-bold tracking-tight text-slate-100">
          Device mismatch
        </h2>
        <p className="mt-3 text-sm leading-relaxed font-semibold text-slate-200">
          This copy is bound to another device. The game cannot start on this computer.
        </p>
      </div>
      <div className="mt-5 flex justify-center">
        <UiDialogBtn onClick={onDismiss} className="min-w-[140px]">
          OK
        </UiDialogBtn>
      </div>
    </UiDialogShell>
  )
}
