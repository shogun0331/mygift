import { playSfx } from '../game/uiSfx'

type CreditsModalProps = {
  onClose: () => void
}

export function CreditsModal({ onClose }: CreditsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900/95 border-2 border-indigo-500/40 shadow-[0_0_80px_rgba(99,102,241,0.25)] p-6 sm:p-8 flex flex-col gap-6 overflow-hidden">
        {/* Background Cyber Scanlines */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_4px] opacity-40" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-indigo-500/20 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-400/30 text-indigo-300 text-xl shadow-inner">
              📜
            </span>
            <div>
              <h2 className="text-lg font-black tracking-widest text-slate-100 uppercase">
                PRODUCTION CREDITS
              </h2>
              <p className="text-xs text-indigo-300 font-mono tracking-wider">
                STAR BROADCASTING CO. // AURA STUDIOS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playSfx('ui-click')
              onClose()
            }}
            className="h-8 w-8 rounded-lg flex items-center justify-center border border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:border-pink-500 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Content List */}
        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2 text-xs sm:text-sm font-medium text-slate-300">
          <div className="rounded-2xl border border-indigo-500/20 bg-slate-950/60 p-4 space-y-2">
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-widest font-mono">
              ★ PLANNING & DIRECTION
            </div>
            <div className="text-slate-100 font-bold text-sm">AURA STUDIOS</div>
            <p className="text-xs text-slate-400">
              Cyberpunk Broadcaster Simulation Engine & Interactive Scenarios
            </p>
          </div>

          <div className="rounded-2xl border border-indigo-500/20 bg-slate-950/60 p-4 space-y-2">
            <div className="text-[11px] font-bold text-pink-400 uppercase tracking-widest font-mono">
              ★ VISUALS & CAST DESIGN
            </div>
            <div className="text-slate-100 font-bold text-sm">STAR BROADCASTING MEDIA LAB</div>
            <p className="text-xs text-slate-400">
              Character Live Visuals, Proposal Illustrations & UI/UX Design System
            </p>
          </div>

          <div className="rounded-2xl border border-indigo-500/20 bg-slate-950/60 p-4 space-y-2">
            <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest font-mono">
              ★ SOUND & LOCALIZATION
            </div>
            <div className="text-slate-100 font-bold text-sm">GLOBAL BROADCAST NETWORK</div>
            <p className="text-xs text-slate-400">
              Full Multilingual Support (KO, EN, JA, ZH-CN, ZH-TW, RU, ES, DE) & Audio Dynamics
            </p>
          </div>

          <div className="rounded-2xl border border-indigo-500/20 bg-slate-950/60 p-4 text-center">
            <p className="text-xs text-slate-400">
              Thank you for playing <span className="text-amber-300 font-bold">STAR BROADCASTING CO.</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-1 font-mono">
              © 2031 AURA STUDIOS. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>

        {/* Footer Close */}
        <div className="flex justify-end border-t border-indigo-500/20 pt-4">
          <button
            type="button"
            onClick={() => {
              playSfx('ui-click')
              onClose()
            }}
            className="px-6 py-2.5 rounded-xl font-bold text-xs border border-indigo-400/40 bg-indigo-600/20 text-slate-100 hover:bg-indigo-600/40 transition-all"
          >
            CONFIRM & BACK
          </button>
        </div>
      </div>
    </div>
  )
}
