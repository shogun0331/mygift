import { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from '../locales/i18n'
import { PROPOSAL_DATA, getProposalDialogueText, getProposalImageUrl, getProposalVoiceUrl } from '../game/proposalLines'
import { playSfx } from '../game/uiSfx'
import { listSaves } from '../game/saveService'

type EndingGalleryModalProps = {
  onClose: () => void
}

export function EndingGalleryModal({ onClose }: EndingGalleryModalProps) {
  const { locale } = useTranslation()
  const [selectedCharName, setSelectedCharName] = useState<string>(PROPOSAL_DATA[0]?.characterName ?? '')
  const [isPlayingVoice, setIsPlayingVoice] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Find all accepted proposals across all save files to highlight unlocked memories
  const unlockedMap = useMemo(() => {
    const map = new Set<string>()
    try {
      const saves = listSaves()
      for (const s of saves) {
        if (s.ownedCreators) {
          for (const c of s.ownedCreators) {
            if (c.proposalState === 'accepted') {
              map.add(c.name.trim().toLowerCase())
            }
          }
        }
      }
    } catch {
      // ignore
    }
    return map
  }, [])

  const selectedItem = useMemo(() => {
    return PROPOSAL_DATA.find((p) => p.characterName === selectedCharName) ?? PROPOSAL_DATA[0]
  }, [selectedCharName])

  const imageUrl = useMemo(() => {
    return selectedItem ? getProposalImageUrl(selectedItem.characterName) : ''
  }, [selectedItem])

  const voiceUrl = useMemo(() => {
    return selectedItem ? getProposalVoiceUrl(selectedItem.characterName) : null
  }, [selectedItem])

  const dialogue = useMemo(() => {
    return selectedItem ? getProposalDialogueText(selectedItem.characterName, locale) : ''
  }, [selectedItem, locale])

  // Stop previous voice when changing character
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setIsPlayingVoice(false)
    }
  }, [selectedCharName])

  const toggleVoice = () => {
    if (!voiceUrl) return
    if (isPlayingVoice && audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setIsPlayingVoice(false)
      return
    }

    try {
      const audio = new Audio(voiceUrl)
      audioRef.current = audio
      audio.onended = () => setIsPlayingVoice(false)
      audio.onerror = () => setIsPlayingVoice(false)
      audio.play().then(() => setIsPlayingVoice(true)).catch((e) => {
        console.warn('Audio play failed:', e)
        setIsPlayingVoice(false)
      })
    } catch {
      setIsPlayingVoice(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-5xl h-[90vh] max-h-[820px] rounded-3xl bg-slate-900/95 border-2 border-indigo-500/40 shadow-[0_0_80px_rgba(99,102,241,0.25)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-500/20 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-pink-500 text-white shadow-lg text-lg">
              💍
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-widest text-slate-100 uppercase flex items-center gap-2">
                ENDING GALLERY
                <span className="text-xs font-bold text-amber-400 font-mono">
                  ({unlockedMap.size}/{PROPOSAL_DATA.length} UNLOCKED)
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                그녀들과 함께한 특별한 결혼과 프러포즈 순간의 기록
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playSfx('ui-click')
              onClose()
            }}
            className="h-9 w-9 rounded-xl flex items-center justify-center border border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:border-pink-500 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Left Character Selector List */}
          <div className="w-full md:w-72 border-r border-indigo-500/20 bg-slate-950/40 p-3 overflow-y-auto space-y-2">
            <div className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase px-2 mb-1">
              HEROINES ROSTER
            </div>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
              {PROPOSAL_DATA.map((item) => {
                const isSelected = item.characterName === selectedCharName
                const isCleared = unlockedMap.has(item.characterName.trim().toLowerCase())
                const previewImg = getProposalImageUrl(item.characterName)

                return (
                  <button
                    key={item.characterName}
                    type="button"
                    onClick={() => {
                      playSfx('ui-click')
                      setSelectedCharName(item.characterName)
                    }}
                    className={`group relative flex items-center gap-3 p-2.5 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-400 bg-gradient-to-r from-indigo-950/80 to-purple-950/80 shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                        : 'border-slate-800/80 bg-slate-900/50 hover:border-indigo-500/40 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="relative h-11 w-11 shrink-0 rounded-xl overflow-hidden border border-indigo-400/30 bg-slate-950">
                      {previewImg ? (
                        <img
                          src={previewImg}
                          alt={item.characterName}
                          className="h-full w-full object-cover object-top group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-600 font-bold">
                          ?
                        </div>
                      )}
                      {isCleared && (
                        <span className="absolute bottom-0 right-0 bg-amber-400 text-slate-950 text-[9px] font-black px-1 rounded-tl-md">
                          ★
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-bold truncate ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                        {item.characterName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {isCleared ? '💍 WEDDING END' : 'PROPOSAL'}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right Showcase Stage */}
          <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 overflow-y-auto items-center justify-between gap-4 bg-gradient-to-b from-slate-950/30 to-indigo-950/20">
            {/* Main Illustration Card */}
            <div className="relative w-full max-w-2xl flex-1 min-h-[260px] max-h-[460px] rounded-2xl overflow-hidden border-2 border-indigo-500/40 shadow-[0_0_40px_rgba(99,102,241,0.2)] bg-slate-950 flex items-center justify-center group">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={selectedItem?.characterName}
                  className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
                />
              ) : (
                <div className="text-slate-600 text-sm">NO IMAGE AVAILABLE</div>
              )}

              {/* Romantic Ambient Corner Flare */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />

              {/* Character Badge Overlay */}
              <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-indigo-400/40 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-200 tracking-wider">
                  {selectedItem?.characterName}
                </span>
              </div>
            </div>

            {/* Dialogue & Voice Controller Bar */}
            <div className="w-full max-w-2xl rounded-2xl bg-slate-950/80 border border-indigo-500/30 p-4 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex-1 text-center sm:text-left">
                <div className="text-[10px] font-bold text-amber-400/90 uppercase tracking-widest mb-1 flex items-center justify-center sm:justify-start gap-1.5">
                  <span>💌</span> PROPOSAL CONFESSION
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-100 leading-relaxed italic">
                  "{dialogue}"
                </p>
              </div>

              {voiceUrl && (
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`shrink-0 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all ${
                    isPlayingVoice
                      ? 'border-pink-500 bg-pink-600/30 text-pink-200 shadow-[0_0_16px_rgba(236,72,153,0.4)] animate-pulse'
                      : 'border-indigo-400/40 bg-indigo-600/20 text-indigo-100 hover:bg-indigo-600/40'
                  }`}
                >
                  <span className="text-sm">{isPlayingVoice ? '⏹' : '🔊'}</span>
                  <span>{isPlayingVoice ? 'STOP VOICE' : 'PLAY VOICE'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
