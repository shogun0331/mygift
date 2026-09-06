import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from '../locales/i18n'
import { playSfx } from '../game/uiSfx'
import { listSaves } from '../game/saveService'
import { fetchPublicJson } from '../game/publicJson'
import { loadEvents } from '../events/db'
import type { GameEvent } from '../events/types'
import { CHARACTER_EVENT_SLOTS } from '../events/types'
import type { RegisteredCharacter } from '../game/characters'
import { characterDisplayName, characterDisplayJob } from '../game/characterLocales'
import { resolveMediaSrc } from '../game/mediaUrl'
import { EventSimulator } from '../events/EventSimulator'
import { SnsMediaLightbox, SnsMediaWithBlur } from './SnsMediaWithBlur'
import { pickCharacterLocaleText } from '../game/characterLocales'
import { snsPostMedia } from '../game/sns'

type EndingGalleryPanelProps = {
  onClose: () => void
}

type GalleryTab = 'vn' | 'sns'

const SLOT_LABEL_KEYS: Record<string, string> = {
  scout: 'gallery.slotScout',
  salary: 'gallery.slotSalary',
  vip: 'gallery.slotVip',
  h: 'gallery.slotH',
  date1: 'gallery.slotDate1',
  date2: 'gallery.slotDate2',
  endingVn: 'gallery.slotEnding',
}

function getEventThumbnailUrl(event: GameEvent, character?: RegisteredCharacter | null): string {
  if (event.media && event.media.length > 0) {
    const imgMedia = event.media.find((m) => m.kind === 'image')
    if (imgMedia?.url) return resolveMediaSrc(imgMedia.url)
  }

  if (Array.isArray(event.nodes)) {
    for (const node of event.nodes) {
      if (node && typeof node === 'object') {
        const n = node as Record<string, unknown>
        if (typeof n.image === 'string' && n.image.trim()) {
          const matched = event.media?.find((m) => m.fileName === (n.image as string).trim())
          if (matched?.url) return resolveMediaSrc(matched.url)
        }
      }
    }
  }

  if (character?.images && character.images.length > 0) {
    return resolveMediaSrc(character.images[0].url)
  }
  if (character?.profileImageUrl) {
    return resolveMediaSrc(character.profileImageUrl)
  }
  return ''
}

export function EndingGalleryPanel({ onClose }: EndingGalleryPanelProps) {
  const { t, locale } = useTranslation()
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<GalleryTab>('vn')
  const [characters, setCharacters] = useState<RegisteredCharacter[]>([])
  const [events, setEvents] = useState<GameEvent[]>([])
  const [playingEvent, setPlayingEvent] = useState<GameEvent | null>(null)
  const [lightbox, setLightbox] = useState<{
    url: string
    kind: 'image' | 'video'
    regions?: import('../events/types').BlurRegion[]
  } | null>(null)

  // 1. Top Grade Clear Check (All Unlocked)
  const isTopGradeCleared = useMemo(() => {
    try {
      if (
        localStorage.getItem('broadcast-top-grade-cleared') === 'true' ||
        localStorage.getItem('broadcast-game-cleared') === 'true'
      ) {
        return true
      }
      const saves = listSaves()
      return saves.some((s) => s.stationGrade === 'top' || s.league?.currentRank === 1 || s.league?.gameCleared === true)
    } catch {
      return false
    }
  }, [])

  // 2. Aggregate Unlocked Content from Saves & LocalStorage
  const { watchedEventIds, publishedSnsIds } = useMemo(() => {
    const evIds = new Set<string>()
    const snsIds = new Set<string>()

    try {
      const rawWatched = localStorage.getItem('broadcast-watched-events')
      if (rawWatched) {
        const parsed = JSON.parse(rawWatched)
        if (Array.isArray(parsed)) parsed.forEach((id) => evIds.add(String(id)))
      }

      const saves = listSaves()
      for (const save of saves) {
        if (Array.isArray(save.watchedEventIds)) {
          save.watchedEventIds.forEach((id) => evIds.add(String(id)))
        }
        if (save.ownedCreators) {
          for (const c of save.ownedCreators) {
            if (Array.isArray(c.snsPublishedIds)) {
              c.snsPublishedIds.forEach((id) => snsIds.add(String(id)))
            }
            if (Array.isArray(c.snsFeed)) {
              c.snsFeed.forEach((item) => {
                if (item?.postId) snsIds.add(String(item.postId))
              })
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to aggregate gallery unlock data:', e)
    }

    return {
      watchedEventIds: evIds,
      publishedSnsIds: snsIds,
    }
  }, [])

  // 3. Load Characters & Events
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        const loadedEvents = await loadEvents().catch(() => [])
        if (!cancelled) setEvents(loadedEvents)

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

        if (!cancelled) {
          setCharacters(charList)
        }
      } catch (err) {
        console.error('Failed to load gallery resources:', err)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [])

  // Currently selected character
  const selectedChar = useMemo(() => {
    if (!selectedCharId) return null
    return characters.find((c) => c.id === selectedCharId) ?? null
  }, [characters, selectedCharId])

  // Filter valid events for selected character (excluding slots with no event bound)
  const validEventSlots = useMemo(() => {
    if (!selectedChar?.eventLinks) return []
    const results: Array<{
      slotKey: string
      slotLabel: string
      eventId: string
      event: GameEvent
      isUnlocked: boolean
      thumbnailUrl: string
    }> = []

    for (const slot of CHARACTER_EVENT_SLOTS) {
      const evId = selectedChar.eventLinks[slot.key]
      if (!evId) continue
      const event = events.find((e) => e.id === evId)
      if (!event) continue

      const isUnlocked = isTopGradeCleared || watchedEventIds.has(evId)
      const thumbnailUrl = getEventThumbnailUrl(event, selectedChar)
      results.push({
        slotKey: slot.key,
        slotLabel: slot.label,
        eventId: evId,
        event,
        isUnlocked,
        thumbnailUrl,
      })
    }
    return results
  }, [selectedChar, events, isTopGradeCleared, watchedEventIds])

  return (
    <div className="save-panel-slide-in relative z-20 flex flex-col h-[88vh] max-h-[860px] w-[clamp(540px,76vw,1180px)] rounded-3xl border-2 border-indigo-500/40 bg-slate-950/95 backdrop-blur-2xl p-5 sm:p-7 shadow-[0_0_100px_rgba(79,70,229,0.38)] select-none">
      {/* Background Cyber Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:100%_4px] opacity-40 rounded-3xl" />
      <div className="pointer-events-none absolute -top-16 -left-16 h-64 w-64 rounded-full bg-pink-500/15 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-indigo-500/15 blur-[80px]" />

      {/* ── TOP HEADER ── */}
      <div className="relative flex items-center justify-between border-b border-indigo-500/25 pb-4 mb-4">
        <div className="flex items-center gap-3">
          {selectedChar && (
            <button
              type="button"
              onClick={() => {
                playSfx('ui-click')
                setSelectedCharId(null)
              }}
              className="h-9 px-3 rounded-xl border border-indigo-500/40 bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <span>←</span>
              <span>{t('gallery.backToHeroines')}</span>
            </button>
          )}

          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
              <p className="text-[10px] font-mono font-black tracking-widest text-indigo-400 uppercase">
                MEMORIAL ARCHIVES // {t('menu.gallery')}
              </p>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              {selectedChar
                ? t('gallery.archiveOf', { name: characterDisplayName(selectedChar, locale) })
                : t('gallery.title')}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isTopGradeCleared && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-950/80 to-yellow-950/80 px-3.5 py-1.5 text-xs font-mono font-bold text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.3)] animate-pulse">
              <span>👑</span>
              <span>{t('gallery.topClearBonus')}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              playSfx('ui-click')
              onClose()
            }}
            className="h-9 w-9 rounded-xl flex items-center justify-center border border-slate-700/80 bg-slate-900 text-slate-400 hover:text-white hover:border-pink-500 hover:bg-pink-950/30 transition-all shadow-md cursor-pointer"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── VIEW 1: HEROINE SELECTION GRID ── */}
      {!selectedChar ? (
        <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-mono font-bold text-slate-400">
              {t('gallery.selectHeroine', { count: characters.length })}
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {characters.map((c) => {
                const name = characterDisplayName(c, locale)
                const job = characterDisplayJob(c, locale)
                const avatar = c.profileImageUrl || (c.images?.[0] ? resolveMediaSrc(c.images[0].url) : null)

                // Count valid events for this character
                let eventCount = 0
                if (c.eventLinks) {
                  for (const slot of CHARACTER_EVENT_SLOTS) {
                    if (c.eventLinks[slot.key]) eventCount++
                  }
                }
                const snsCount = c.snsPosts?.length ?? 0

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      playSfx('ui-click')
                      setSelectedCharId(c.id)
                      setActiveTab('vn')
                    }}
                    className="group relative flex flex-col justify-between aspect-[3/4] rounded-2xl border border-indigo-500/30 bg-slate-900/60 overflow-hidden cursor-pointer hover:border-pink-500/70 hover:shadow-[0_0_25px_rgba(236,72,153,0.35)] transition-all duration-300"
                  >
                    {/* Background Illustration */}
                    {avatar ? (
                      <img
                        src={resolveMediaSrc(avatar)}
                        alt={name}
                        className="absolute inset-0 w-full h-full object-cover object-top filter brightness-90 group-hover:scale-105 group-hover:brightness-100 transition-all duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-slate-600 text-3xl font-black">
                        ?
                      </div>
                    )}

                    {/* Gradient Shadows */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-transparent" />

                    {/* Top Badges */}
                    <div className="relative z-10 flex items-center justify-between p-3">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-950/80 backdrop-blur-md border border-indigo-400/30 text-[10px] font-mono font-bold text-indigo-300">
                        {t('gallery.tier', { grade: c.grade || 'C' })}
                      </span>
                    </div>

                    {/* Bottom Info Bar */}
                    <div className="relative z-10 p-3 pt-4">
                      <div className="text-sm sm:text-base font-black text-white group-hover:text-pink-300 transition-colors drop-shadow-md">
                        {name}
                      </div>
                      <div className="text-[10px] text-slate-300 font-mono mb-2 drop-shadow">
                        {job || c.concept || 'HEROINE'}
                      </div>

                      <div className="flex items-center gap-1.5 pt-2 border-t border-white/10 text-[9px] font-mono text-slate-300">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/30 text-indigo-200">
                          {t('gallery.episodesCount', { count: eventCount })}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/30 text-purple-200">
                          {t('gallery.postsCount', { count: snsCount })}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ── VIEW 2: CHARACTER DETAIL ARCHIVES ── */
        <div className="min-h-0 flex-1 flex flex-col gap-3 overflow-hidden">
          {/* Sub Navigation Bar & Tabs */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-indigo-500/20">
            <div className="flex items-center gap-3">
              <span className="text-base sm:text-lg font-black text-white">
                {characterDisplayName(selectedChar, locale)}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-xs font-mono font-bold text-indigo-300">
                {characterDisplayJob(selectedChar, locale)}
              </span>
            </div>

            {/* 2 Content Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-indigo-500/30 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  playSfx('ui-click')
                  setActiveTab('vn')
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'vn'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>🎬</span>
                <span>{t('gallery.storyEpisodes')}</span>
                <span className="text-[10px] font-mono opacity-80">({validEventSlots.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playSfx('ui-click')
                  setActiveTab('sns')
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'sns'
                    ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>📱</span>
                <span>{t('gallery.snsFeed')}</span>
                <span className="text-[10px] font-mono opacity-80">({selectedChar.snsPosts?.length ?? 0})</span>
              </button>
            </div>
          </div>

          {/* ── TAB: VN STORY EPISODES ── */}
          {activeTab === 'vn' && (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 custom-scrollbar pr-1">
              {validEventSlots.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
                  {t('gallery.noEpisodes')}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {validEventSlots.map((item, idx) => {
                    const slotLocalizedLabel = t(SLOT_LABEL_KEYS[item.slotKey] || 'gallery.slotScout')

                    return (
                      <div
                        key={item.slotKey}
                        className={`group relative flex flex-col justify-between rounded-2xl border overflow-hidden transition-all duration-300 ${
                          item.isUnlocked
                            ? 'border-indigo-500/40 bg-slate-900/80 hover:border-indigo-400 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                            : 'border-slate-800/80 bg-slate-950/40 opacity-70'
                        }`}
                      >
                        {/* Event Scene / Thumbnail Header */}
                        <div className="relative aspect-video w-full overflow-hidden bg-slate-950 border-b border-indigo-500/20">
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt={slotLocalizedLabel}
                              className={`w-full h-full object-cover object-top transition-transform duration-500 ${
                                item.isUnlocked
                                  ? 'group-hover:scale-105 filter brightness-90 group-hover:brightness-100'
                                  : 'filter blur-sm brightness-40'
                              }`}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-600 font-mono text-xs">
                              NO PREVIEW
                            </div>
                          )}

                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

                          {/* Episode Index Badge */}
                          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-slate-950/85 backdrop-blur-md border border-indigo-400/40 text-[10px] font-bold text-indigo-300 font-mono">
                            EPISODE {String(idx + 1).padStart(2, '0')}
                          </div>

                          {/* Unlock Status Pill */}
                          <div className="absolute top-2.5 right-2.5">
                            {item.isUnlocked ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold">
                                UNLOCKED
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-slate-900/90 text-slate-400 border border-slate-700 text-[9px] font-mono font-bold flex items-center gap-1">
                                <span>🔒</span> LOCKED
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-200 transition-colors line-clamp-1">
                              {item.isUnlocked ? slotLocalizedLabel : `🔒 ${t('gallery.secretStory')}`}
                            </h3>
                            <p className="text-[11px] text-slate-400 font-mono mt-1 line-clamp-1">
                              {item.isUnlocked
                                ? `${characterDisplayName(selectedChar, locale)} · CHAPTER #${item.event.chapterId || idx + 1}`
                                : t('gallery.lockedHint')}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                            <span className="text-[10px] font-mono text-slate-500">
                              {item.isUnlocked ? t('gallery.fullscreenAvailable') : t('gallery.lockedStatus')}
                            </span>

                            {item.isUnlocked ? (
                              <button
                                type="button"
                                onClick={() => {
                                  playSfx('ui-click')
                                  setPlayingEvent(item.event)
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(99,102,241,0.4)] transition-all cursor-pointer"
                              >
                                <span>▶</span>
                                <span>{t('gallery.watch')}</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-600 font-bold flex items-center gap-1">
                                🔒 {t('gallery.locked')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: SNS ARCHIVE ── */}
          {activeTab === 'sns' && (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 custom-scrollbar pr-1">
              {(!selectedChar.snsPosts || selectedChar.snsPosts.length === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
                  {t('gallery.noPosts')}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {selectedChar.snsPosts.map((post, idx) => {
                    const isUnlocked = isTopGradeCleared || publishedSnsIds.has(post.id)
                    const media = isUnlocked
                      ? snsPostMedia(
                          selectedChar.snsPosts ?? [],
                          selectedChar.images,
                          selectedChar.videos,
                          post.id,
                        )
                      : null
                    const caption = isUnlocked
                      ? pickCharacterLocaleText(post.captions, locale)
                      : `🔒 ${t('gallery.snsLockedHint')}`

                    return (
                      <div
                        key={post.id}
                        className={`rounded-2xl border p-3 flex flex-col justify-between transition-all ${
                          isUnlocked
                            ? 'border-purple-500/40 bg-slate-900/80 shadow-md'
                            : 'border-slate-800/80 bg-slate-950/40 opacity-70'
                        }`}
                      >
                        {/* Post Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-200">
                              POST #{idx + 1}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                post.heat === 3
                                  ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                                  : 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/40'
                              }`}
                            >
                              {post.heat === 3 ? '🌶️ HEAT 3' : 'HEAT 2'}
                            </span>
                          </div>

                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                              isUnlocked ? 'text-emerald-400' : 'text-slate-500'
                            }`}
                          >
                            {isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                          </span>
                        </div>

                        {/* Media Preview */}
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80 flex items-center justify-center my-2 group">
                          {isUnlocked && media ? (
                            <div
                              onClick={() => {
                                playSfx('ui-click')
                                setLightbox({
                                  url: media.url,
                                  kind: media.kind,
                                  regions: post.blurRegions,
                                })
                              }}
                              className="w-full h-full cursor-pointer"
                            >
                              <SnsMediaWithBlur
                                url={media.url}
                                kind={media.kind}
                                regions={post.blurRegions}
                                className="w-full h-full"
                                objectFit="cover"
                              />
                              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <span className="px-2 py-1 rounded-lg bg-black/70 text-[10px] text-white font-bold backdrop-blur-sm">
                                  🔍 {t('gallery.expand')}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-600 gap-1">
                              <span className="text-xl">🔒</span>
                              <span className="text-[10px] font-mono">{t('gallery.lockedMedia')}</span>
                            </div>
                          )}
                        </div>

                        {/* Post Caption */}
                        <p
                          className={`text-xs leading-relaxed italic ${
                            isUnlocked ? 'text-slate-200' : 'text-slate-500'
                          }`}
                        >
                          "{caption}"
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── CINEMATIC FULLSCREEN VN PLAYER (MODE: GAME) ── */}
      {playingEvent && (
        <EventSimulator
          event={playingEvent}
          mode="game"
          registeredCharacters={characters}
          allowSkip={true}
          onClose={() => setPlayingEvent(null)}
        />
      )}

      {/* ── SNS MEDIA LIGHTBOX ── */}
      {lightbox && (
        <SnsMediaLightbox
          url={lightbox.url}
          kind={lightbox.kind}
          regions={lightbox.regions}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}
