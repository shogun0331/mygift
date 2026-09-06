import { useTranslation } from '../locales/i18n'
import { getBgmVolumePercent, setBgmVolumePercent } from '../game/bgm'
import { getSeVolumePercent, setSeVolumePercent, playSfx } from '../game/uiSfx'
import { getDisplayMode, setDisplayMode, type DisplayMode } from '../game/displayMode'
import { useState } from 'react'

type SettingsPanelProps = {
  onClose: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { t, locale, setLocale } = useTranslation()
  const [bgmVolume, setBgmVolumeState] = useState(() => getBgmVolumePercent())
  const [seVolume, setSeVolumeState] = useState(() => getSeVolumePercent())
  const [displayModeState, setDisplayModeState] = useState<DisplayMode>(() => getDisplayMode())

  return (
    <div className="save-panel-slide-in relative z-20 flex flex-col h-[84vh] max-h-[720px] w-[clamp(440px,48vw,780px)] rounded-3xl border-2 border-indigo-500/40 bg-slate-950/95 backdrop-blur-2xl p-6 sm:p-7 shadow-[0_0_90px_rgba(79,70,229,0.35)] select-none">
      {/* Background Cyber Scanlines & Ambient Radial Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:100%_4px] opacity-40 rounded-3xl" />
      <div className="pointer-events-none absolute -top-12 -left-12 h-48 w-48 rounded-full bg-indigo-500/15 blur-[60px]" />

      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-indigo-500/25 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
            <p className="text-[10px] font-mono font-black tracking-widest text-indigo-400 uppercase">
              SYSTEM CONFIGURATION // SETTINGS
            </p>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            {t('settings.title') || '환경설정'}
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

      {/* Settings Options List */}
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
        {/* Display Mode */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 space-y-2.5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-200 tracking-wide uppercase flex items-center gap-2 font-mono">
                <span className="text-indigo-400">📺</span> {t('settings.displayMode') || '화면 모드'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t('settings.displayModeDesc') || '전체화면 또는 테두리 없는 창모드를 선택합니다.'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                playSfx('ui-click')
                setDisplayMode('fullscreen')
                setDisplayModeState('fullscreen')
              }}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
                displayModeState === 'fullscreen'
                  ? 'border-indigo-400 bg-indigo-600/30 text-indigo-100 shadow-[0_0_16px_rgba(99,102,241,0.35)]'
                  : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-indigo-500/40 hover:text-slate-200'
              }`}
            >
              🖥️ {t('settings.fullscreen') || '전체화면'}
            </button>
            <button
              type="button"
              onClick={() => {
                playSfx('ui-click')
                setDisplayMode('borderless')
                setDisplayModeState('borderless')
              }}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
                displayModeState === 'borderless'
                  ? 'border-indigo-400 bg-indigo-600/30 text-indigo-100 shadow-[0_0_16px_rgba(99,102,241,0.35)]'
                  : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-indigo-500/40 hover:text-slate-200'
              }`}
            >
              🔲 {t('settings.borderless') || '창모드 (전체)'}
            </button>
          </div>
        </div>

        {/* Language Selection */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 space-y-2.5 backdrop-blur-md">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-200 tracking-wide uppercase flex items-center gap-2 font-mono">
              <span className="text-pink-400">🌐</span> {t('settings.language') || '언어 설정 (LANGUAGE)'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t('settings.languageDesc') || '표시할 언어를 선택합니다.'}
            </p>
          </div>
          <div className="relative pt-1">
            <select
              value={locale}
              onChange={(e) => {
                playSfx('ui-click')
                setLocale(e.target.value as any)
              }}
              className="w-full bg-slate-950 border border-indigo-500/30 rounded-xl px-4 py-3 text-xs text-slate-200 font-bold focus:outline-none focus:border-pink-500/60 appearance-none cursor-pointer transition-all shadow-inner"
            >
              <option value="KO">한국어 (KO)</option>
              <option value="EN">English (EN)</option>
              <option value="JA">日本語 (JA)</option>
              <option value="ZH-CN">简体中文 (ZH-CN)</option>
              <option value="RU">Русский (RU)</option>
              <option value="ES">Español (ES)</option>
              <option value="DE">Deutsch (DE)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-indigo-400 pt-1">
              ▼
            </div>
          </div>
        </div>

        {/* Audio Volumes */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 space-y-4 backdrop-blur-md">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-200 tracking-wide uppercase flex items-center gap-2 font-mono">
              <span className="text-amber-400">🔊</span> {t('settings.audio') || '오디오 설정'}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>{t('settings.bgm') || '배경음악 (BGM)'}</span>
                <span className="font-mono text-amber-300">{bgmVolume}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={bgmVolume}
                onInput={(e) => {
                  const next = Number(e.currentTarget.value)
                  setBgmVolumeState(next)
                  setBgmVolumePercent(next)
                }}
                onChange={(e) => {
                  const next = Number(e.currentTarget.value)
                  setBgmVolumeState(next)
                  setBgmVolumePercent(next)
                }}
                className="accent-pink-500 bg-slate-900 border border-indigo-500/20 h-2 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>{t('settings.se') || '효과음 (SFX)'}</span>
                <span className="font-mono text-pink-300">{seVolume}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={seVolume}
                onInput={(e) => {
                  const next = Number(e.currentTarget.value)
                  setSeVolumeState(next)
                  setSeVolumePercent(next)
                }}
                onChange={(e) => {
                  const next = Number(e.currentTarget.value)
                  setSeVolumeState(next)
                  setSeVolumePercent(next)
                }}
                className="accent-pink-500 bg-slate-900 border border-indigo-500/20 h-2 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
