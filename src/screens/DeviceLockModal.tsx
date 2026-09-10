type DeviceLockModalProps = {
  onDismiss: () => void
}

export function DeviceLockModal({ onDismiss }: DeviceLockModalProps) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="device-lock-title"
    >
      <div className="game-panel-strong w-full max-w-md overflow-hidden rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="border-b border-rose-400/20 bg-gradient-to-br from-rose-500/15 via-transparent to-transparent px-6 pb-5 pt-6 text-center">
          <p className="game-stat-label text-rose-300/80">LICENSE</p>
          <h2 id="device-lock-title" className="mt-1.5 text-lg font-bold tracking-tight text-slate-100">
            Device mismatch
          </h2>
          <p className="mt-3 text-sm leading-relaxed font-semibold text-slate-200">
            This copy is bound to another device. The game cannot start on this computer.
          </p>
        </div>
        <div className="flex justify-center px-6 py-5">
          <button
            type="button"
            onClick={onDismiss}
            className="game-btn game-btn-primary min-w-[140px] px-6 py-2.5 text-sm"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
