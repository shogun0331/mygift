import { useState, useMemo, useEffect } from 'react'
import {
  getAllAchievements,
  getAchievementTitle,
  getAchievementDesc,
  registerCharacterAchievements,
  loadUnlockedAchievements,
  type AchievementCategory,
} from '../game/achievements'
import { fetchPublicJson } from '../game/publicJson'
import type { RegisteredCharacter } from '../game/characters'
import { useTranslation } from '../locales/i18n'
import { playSfx } from '../game/uiSfx'
import { resolveMediaSrc } from '../game/mediaUrl'

interface AchievementsPanelProps {
  onClose: () => void
}

type TabFilter = 'all' | AchievementCategory

const TABS: { id: TabFilter; labelKey: string; icon: string }[] = [
  { id: 'all', labelKey: 'achievements.tabAll', icon: '🌟' },
  { id: 'station', labelKey: 'achievements.tabStation', icon: '🏢' },
  { id: 'broadcast', labelKey: 'achievements.tabBroadcast', icon: '🎙️' },
  { id: 'creator', labelKey: 'achievements.tabCreator', icon: '💖' },
  { id: 'casino', labelKey: 'achievements.tabCasino', icon: '🎰' },
]

export function AchievementsPanel({ onClose }: AchievementsPanelProps) {
  const { t, locale } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [characterVersion, setCharacterVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function loadCharacters() {
      try {
        let charList: RegisteredCharacter[] = []
        if (window.electronAPI?.loadCharactersJson) {
          const res = await window.electronAPI.loadCharactersJson().catch(() => null)
          if (res?.success && Array.isArray(res.characters) && res.characters.length > 0) {
            charList = res.characters
          }
        }
        if (charList.length === 0) {
          const fromPub = await fetchPublicJson<RegisteredCharacter[]>('/characters/characters.json').catch(() => null)
          if (Array.isArray(fromPub) && fromPub.length > 0) {
            charList = fromPub
          }
        }
        if (!cancelled && charList.length > 0) {
          registerCharacterAchievements(charList)
          setCharacterVersion((v) => v + 1)
        }
      } catch (err) {
        console.error('Failed to load characters for achievements panel:', err)
      }
    }
    loadCharacters()
    return () => {
      cancelled = true
    }
  }, [])

  const [unlockedMap, setUnlockedMap] = useState<Record<string, number>>(() => loadUnlockedAchievements())

  useEffect(() => {
    const handleReset = () => {
      setUnlockedMap(loadUnlockedAchievements())
    }
    window.addEventListener('achievements-reset', handleReset)
    return () => {
      window.removeEventListener('achievements-reset', handleReset)
    }
  }, [])

  const allAchievements = useMemo(() => getAllAchievements(), [characterVersion])

  const totalCount = allAchievements.length
  const unlockedCount = allAchievements.filter((a) => Boolean(unlockedMap[a.id])).length
  const progressPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0

  const filteredList = useMemo(() => {
    if (activeTab === 'all') return allAchievements
    return allAchievements.filter((a) => a.category === activeTab)
  }, [activeTab, allAchievements])

  const formatUnlockDate = (timestamp?: number) => {
    if (!timestamp) return ''
    const d = new Date(timestamp)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${y}.${m}.${day} ${h}:${min}`
  }

  return (
    <div className="save-panel-slide-in relative z-20 flex flex-col h-[86vh] max-h-[760px] w-[clamp(440px,52vw,860px)] rounded-3xl border-2 border-yellow-500/40 bg-slate-950/95 backdrop-blur-2xl p-6 sm:p-7 shadow-[0_0_90px_rgba(234,179,8,0.25)] select-none">
      {/* Background Ambient Radial Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:100%_4px] opacity-40 rounded-3xl" />
      <div className="pointer-events-none absolute -top-12 -left-12 h-52 w-52 rounded-full bg-yellow-500/10 blur-[70px]" />
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-52 w-52 rounded-full bg-amber-600/10 blur-[70px]" />

      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-yellow-500/20 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
            <p className="text-[10px] font-mono font-black tracking-widest text-amber-400 uppercase">
              HALL OF FAME // RECORDS
            </p>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-500 bg-clip-text text-transparent flex items-center gap-2">
            🏆 {t('achievements.title') || '업적 (Achievements)'}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => {
            playSfx('ui-click')
            onClose()
          }}
          className="h-9 w-9 rounded-xl flex items-center justify-center border border-slate-700/80 bg-slate-900 text-slate-400 hover:text-white hover:border-yellow-500 hover:bg-yellow-950/30 transition-all shadow-md cursor-pointer"
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Overall Progress Bar Card */}
      <div className="relative rounded-2xl border border-yellow-500/30 bg-gradient-to-r from-yellow-950/20 via-slate-900/60 to-amber-950/20 p-3.5 mb-4 shadow-inner">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <span>🎖️</span> {t('achievements.totalProgress') || '전체 달성률'}
          </span>
          <span className="text-xs font-black font-mono text-yellow-400 tabular-nums">
            {unlockedCount} / {totalCount} ({progressPct}%)
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-900 border border-yellow-500/30 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-yellow-200 shadow-[0_0_12px_rgba(234,179,8,0.7)] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 shrink-0 custom-scrollbar">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                playSfx('ui-click')
                setActiveTab(tab.id)
              }}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'border border-yellow-400/80 bg-yellow-500/20 text-yellow-200 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                  : 'border border-white/5 bg-slate-900/60 text-slate-400 hover:border-yellow-500/30 hover:text-slate-200'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{t(tab.labelKey) || tab.id.toUpperCase()}</span>
            </button>
          )
        })}
      </div>

      {/* Achievement Cards Scrollable List */}
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1.5 custom-scrollbar">
        {filteredList.map((item) => {
          const unlockedTime = unlockedMap[item.id]
          const isUnlocked = Boolean(unlockedTime)
          const title = getAchievementTitle(item, t, locale)
          const desc = getAchievementDesc(item, t, locale)

          return (
            <div
              key={item.id}
              className={`relative flex items-center justify-between gap-3.5 rounded-2xl p-3.5 transition-all ${
                isUnlocked
                  ? 'border border-yellow-400/40 bg-gradient-to-r from-yellow-950/25 via-slate-900/80 to-slate-950/90 shadow-[0_0_20px_rgba(234,179,8,0.12)]'
                  : 'border border-white/5 bg-slate-900/40 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                {/* Icon Box */}
                <div
                  className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl overflow-hidden ${
                    isUnlocked
                      ? 'border border-yellow-400/50 bg-yellow-500/20 shadow-inner drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]'
                      : 'border border-white/10 bg-slate-950/80 opacity-50'
                  }`}
                >
                  {item.characterProfileUrl ? (
                    <>
                      <img
                        src={resolveMediaSrc(item.characterProfileUrl)}
                        alt=""
                        className={`h-full w-full object-cover ${!isUnlocked ? 'grayscale blur-[0.5px]' : ''}`}
                      />
                      <span className="absolute bottom-0 right-0 bg-slate-950/85 border-t border-l border-white/15 rounded-tl px-1 text-[10px] leading-tight">
                        {isUnlocked ? item.icon : '🔒'}
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl">{isUnlocked ? item.icon : '🔒'}</span>
                  )}
                </div>

                {/* Title & Desc */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4
                      className={`text-xs sm:text-sm font-black truncate ${
                        isUnlocked ? 'text-white' : 'text-slate-400'
                      }`}
                    >
                      {title}
                    </h4>
                    {isUnlocked && (
                      <span className="rounded bg-yellow-400/20 px-1.5 py-0.2 text-[9px] font-bold text-yellow-300 border border-yellow-400/40">
                        CLEARED
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                    {desc}
                  </p>
                </div>
              </div>

              {/* Status / Date Badge */}
              <div className="shrink-0 text-right">
                {isUnlocked ? (
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1">
                      <span>✓</span> {t('achievements.unlocked') || '달성 완료'}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 mt-0.5">
                      {formatUnlockDate(unlockedTime)}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-slate-500 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                    🔒 {t('achievements.locked') || '미달성'}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
