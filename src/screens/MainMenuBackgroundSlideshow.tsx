import { useEffect, useState } from 'react'
import { loadEvents } from '../events/db'
import { fetchPublicJson } from '../game/publicJson'
import type { RegisteredCharacter } from '../game/characters'
import { resolveMediaSrc } from '../game/mediaUrl'

export function MainMenuBackgroundSlideshow() {
  const [images, setImages] = useState<string[]>([])
  const [displayedImg, setDisplayedImg] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)

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

  if (!displayedImg) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* ── LEFT-ALIGNED CINEMATIC STAGE (Centers character on left half of screen) ── */}
      <div className="relative h-full w-[64vw] max-w-[1080px] overflow-hidden [mask-image:linear-gradient(to_right,black_0%,black_45%,rgba(0,0,0,0.85)_60%,rgba(0,0,0,0.5)_75%,rgba(0,0,0,0.15)_88%,transparent_100%)]">
        {/* Main Background Image: Smooth Fade In & Fade Out CSS Transition */}
        <img
          src={displayedImg}
          alt=""
          className={`h-full w-full object-cover object-center transition-all duration-[2200ms] ease-in-out ${
            isVisible
              ? 'opacity-90 scale-105 filter brightness-85 contrast-105'
              : 'opacity-0 scale-100 filter brightness-50 contrast-100'
          }`}
        />

        {/* Ambient Shading to dissolve right edge into main menu darkness */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent 40%, via-slate-950/40 65%, via-slate-950/80 85%, to-slate-950 100%" />

        {/* Top & Bottom Cinematic Soft Vignette */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-950/80 via-slate-950/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-slate-950/50 to-transparent" />

        {/* Subtle Cyber Color Harmony Layer */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/40 via-indigo-950/15 to-purple-950/15 mix-blend-multiply" />
        <div className="absolute inset-0 bg-indigo-950/10 mix-blend-overlay" />

        {/* Fine Scanlines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.2)_1px,transparent_1px)] bg-[size:100%_4px] opacity-25" />
      </div>
    </div>
  )
}
