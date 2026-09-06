import { playSfx } from '../game/uiSfx'

type CreditsPanelProps = {
  onClose: () => void
}

export function CreditsPanel({ onClose }: CreditsPanelProps) {
  return (
    <div className="save-panel-slide-in relative z-20 flex flex-col h-[84vh] max-h-[720px] w-[clamp(440px,48vw,780px)] rounded-3xl border-2 border-indigo-500/40 bg-slate-950/95 backdrop-blur-2xl p-6 sm:p-7 shadow-[0_0_90px_rgba(79,70,229,0.35)] select-none">
      {/* Background Cyber Scanlines & Ambient Radial Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:100%_4px] opacity-40 rounded-3xl" />
      <div className="pointer-events-none absolute -top-12 -left-12 h-48 w-48 rounded-full bg-teal-500/15 blur-[60px]" />

      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-indigo-500/25 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
            <p className="text-[10px] font-mono font-black tracking-widest text-indigo-400 uppercase">
              PRODUCTION ARCHIVES // CREDITS
            </p>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            제작진 크레딧
          </h2>
        </div>

        <button
          type="button"
          onClick={() => {
            playSfx('ui-click')
            onClose()
          }}
          className="h-9 w-9 rounded-xl flex items-center justify-center border border-slate-700/80 bg-slate-900 text-slate-400 hover:text-white hover:border-pink-500 hover:bg-pink-950/30 transition-all shadow-md"
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Credits Content List */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
        <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/50 p-4 space-y-1.5 backdrop-blur-md">
          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-mono">
            ★ PLANNING & DIRECTION
          </div>
          <div className="text-slate-100 font-bold text-sm">AURA STUDIOS</div>
          <p className="text-xs text-slate-400">
            Cyberpunk Broadcaster Management Engine & Interactive Simulation Systems
          </p>
        </div>

        <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/50 p-4 space-y-1.5 backdrop-blur-md">
          <div className="text-[10px] font-bold text-pink-400 uppercase tracking-widest font-mono">
            ★ VISUALS & CAST DESIGN
          </div>
          <div className="text-slate-100 font-bold text-sm">STAR BROADCASTING MEDIA LAB</div>
          <p className="text-xs text-slate-400">
            Live Streamer Artwork, Proposal Illustrations & Neon UI/UX System
          </p>
        </div>

        <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/50 p-4 space-y-1.5 backdrop-blur-md">
          <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono">
            ★ SOUND & LOCALIZATION
          </div>
          <div className="text-slate-100 font-bold text-sm">GLOBAL BROADCAST NETWORK</div>
          <p className="text-xs text-slate-400">
            Multilingual Support (KO, EN, JA, ZH-CN, RU, ES, DE) & Audio Dynamics
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 text-center">
          <p className="text-xs text-slate-300">
            Thank you for playing <span className="text-amber-300 font-bold">STAR BROADCASTING CO.</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-1.5 font-mono">
            © 2031 AURA STUDIOS. ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>
    </div>
  )
}
