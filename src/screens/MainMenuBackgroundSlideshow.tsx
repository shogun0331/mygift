import { useEffect, useRef, useState } from 'react'
import { loadEvents, loadOpeningVideoConfig } from '../events/db'
import { fetchPublicJson } from '../game/publicJson'
import type { RegisteredCharacter } from '../game/characters'
import { resolveMediaSrc } from '../game/mediaUrl'
import { openingVideoFileNames, openingVideoMediaPath } from '../game/openingVideos'

function OpeningRecHud() {
  return (
    <div className="pointer-events-none absolute inset-y-[5%] left-[2%] z-20 w-[60vw] max-w-[1040px]">
        <span className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-white/85" />
        <span className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-white/70" />
        <span className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-white/85" />
        <span className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-white/70" />
        <span className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-white/45" />
        <span className="absolute bottom-0 left-1/2 h-3 w-px -translate-x-1/2 bg-white/45" />
        <span className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-white/45" />
        <span className="absolute right-0 top-1/2 h-px w-3 -translate-y-1/2 bg-white/45" />

        <div className="absolute left-9 top-9 flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.95)]" />
          </span>
          <span className="animate-pulse text-[12px] font-bold tracking-[0.28em] text-red-400">REC</span>
        </div>

        <p className="absolute bottom-9 left-9 font-mono text-[10px] tracking-[0.22em] text-white/75">
          CAM 01 · 1080 · 24FPS
        </p>
    </div>
  )
}

function OpeningVideoStage({ url }: { url: string }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    node.muted = true
    node.defaultMuted = true
    node.loop = true
    node.playsInline = true
    node.preload = 'auto'
    node.src = url
    const play = () => {
      void node.play().catch(() => {})
    }
    if (node.readyState >= 2) play()
    else node.addEventListener('canplay', play, { once: true })
    return () => {
      node.removeEventListener('canplay', play)
      node.pause()
    }
  }, [url])

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      autoPlay
      preload="auto"
      className="absolute inset-0 z-[1] h-full w-full object-cover object-center"
    />
  )
}

export function MainMenuBackgroundSlideshow() {
  const [images, setImages] = useState<string[]>([])
  const [displayedImg, setDisplayedImg] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [openingUrls, setOpeningUrls] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    loadOpeningVideoConfig()
      .then((config) => {
        if (cancelled) return
        const urls = openingVideoFileNames(config).map((fileName) =>
          resolveMediaSrc(openingVideoMediaPath(fileName)),
        )
        setOpeningUrls(urls)
      })
      .catch(() => {
        if (!cancelled) setOpeningUrls([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Load events & characters to extract first scene images of scout, date1, date2
  useEffect(() => {
    let cancelled = false

    async function loadSlideshowImages() {
      try {
        const events = await loadEvents().catch(() => [])

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

        const collected: string[] = []
        const eventMap = new Map(events.map((e) => [e.id, e]))

        for (const char of charList) {
          if (!char.eventLinks) continue
          const targetSlots = ['scout', 'date1', 'date2'] as const

          for (const slotKey of targetSlots) {
            const evId = char.eventLinks[slotKey]
            if (!evId) continue
            const ev = eventMap.get(evId)
            if (!ev) continue

            // 1. Check event media for image
            const imgMedia = ev.media?.find((m) => m.kind === 'image')
            if (imgMedia?.url) {
              collected.push(resolveMediaSrc(imgMedia.url))
              continue
            }

            // 2. Check nodes for first image
            if (Array.isArray(ev.nodes)) {
              let foundNodeImg = false
              for (const node of ev.nodes) {
                if (node && typeof node === 'object') {
                  const n = node as Record<string, unknown>
                  if (typeof n.image === 'string' && n.image.trim()) {
                    const matched = ev.media?.find((m) => m.fileName === (n.image as string).trim())
                    if (matched?.url) {
                      collected.push(resolveMediaSrc(matched.url))
                      foundNodeImg = true
                      break
                    }
                  }
                }
              }
              if (foundNodeImg) continue
            }

            // 3. Fallback to character illustration/image
            if (char.images && char.images.length > 0) {
              collected.push(resolveMediaSrc(char.images[0].url))
            } else if (char.profileImageUrl) {
              collected.push(resolveMediaSrc(char.profileImageUrl))
            }
          }
        }

        // Deduplicate and filter valid
        const unique = Array.from(new Set(collected.filter(Boolean)))
        // Shuffle randomly on load for varied feel
        for (let i = unique.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[unique[i], unique[j]] = [unique[j], unique[i]]
        }

        if (!cancelled && unique.length > 0) {
          setImages(unique)
          setDisplayedImg(unique[0])
          // Initial smooth fade-in
          setTimeout(() => {
            if (!cancelled) setIsVisible(true)
          }, 150)
        }
      } catch (err) {
        console.warn('Failed to load menu slideshow images:', err)
      }
    }

    loadSlideshowImages()
    return () => {
      cancelled = true
    }
  }, [])

  // Smooth Fade-In -> Display -> Fade-Out -> Next Image Cycle
  useEffect(() => {
    if (images.length <= 1) return

    let active = true
    let cycleTimer: NodeJS.Timeout
    let nextIndex = 0

    const scheduleNext = () => {
      // 1. Display for 10 seconds while visible
      cycleTimer = setTimeout(() => {
        if (!active) return

        // 2. Start Fade Out (opacity 90% -> 0% over 2.2s)
        setIsVisible(false)

        // 3. After fade-out finishes (2.3s):
        cycleTimer = setTimeout(() => {
          if (!active) return

          // Change image while completely hidden
          nextIndex = (nextIndex + 1) % images.length
          setDisplayedImg(images[nextIndex])

          // 4. Start Fade In (opacity 0% -> 90% over 2.2s)
          cycleTimer = setTimeout(() => {
            if (!active) return
            setIsVisible(true)
            scheduleNext()
          }, 200)
        }, 2300)
      }, 10000)
    }

    scheduleNext()

    return () => {
      active = false
      clearTimeout(cycleTimer)
    }
  }, [images])

  if (openingUrls.length === 0 && !displayedImg) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* ── LEFT-ALIGNED CINEMATIC STAGE (Centers character on left half of screen) ── */}
      <div className="relative h-full w-[64vw] max-w-[1080px] overflow-hidden [mask-image:linear-gradient(to_right,black_0%,black_45%,rgba(0,0,0,0.85)_60%,rgba(0,0,0,0.5)_75%,rgba(0,0,0,0.15)_88%,transparent_100%)]">
        {openingUrls.length > 0 ? (
          <OpeningVideoStage url={openingUrls[0]} />
        ) : (
          <img
            src={displayedImg ?? ''}
            alt=""
            className={`h-full w-full object-cover object-center transition-all duration-[2200ms] ease-in-out ${
              isVisible
                ? 'opacity-90 scale-105 filter brightness-85 contrast-105'
                : 'opacity-0 scale-100 filter brightness-50 contrast-100'
            }`}
          />
        )}

        {/* Ambient Shading to dissolve right edge into main menu darkness */}
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-transparent via-transparent 40%, via-slate-950/40 65%, via-slate-950/80 85%, to-slate-950 100%" />

        {/* Top & Bottom Cinematic Soft Vignette */}
        <div className="absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-slate-950/80 via-slate-950/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 z-10 h-36 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent" />
        <div className="absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-slate-950/50 to-transparent" />

        {/* Subtle Cyber Color Harmony Layer */}
        <div className="absolute inset-0 z-10 bg-gradient-to-tr from-slate-950/40 via-indigo-950/15 to-purple-950/15 mix-blend-multiply" />
        <div className="absolute inset-0 z-10 bg-indigo-950/10 mix-blend-overlay" />

        {/* Fine Scanlines */}
        <div className="absolute inset-0 z-10 bg-[linear-gradient(rgba(0,0,0,0.2)_1px,transparent_1px)] bg-[size:100%_4px] opacity-25" />

      </div>
      <OpeningRecHud />
    </div>
  )
}
