import { useCallback, useEffect, useRef, useState } from 'react'
import { playQwappyLogoExitSound, playQwappyLogoSound } from '../game/uiSfx'

type CompanyLogoSplashProps = {
  onDone: () => void
  /** 로고 표시 시간(ms). 기본 2000 */
  durationMs?: number
}

const LETTERS = ['Q', 'W', 'A', 'P', 'P', 'Y'] as const

/**
 * 부팅 직후 회사 로고 스플래시.
 * EN 디스플레이 폰트(Rajdhani) + 흰 배경 + 귀여운 바운스 연출.
 */
export function CompanyLogoSplash({ onDone, durationMs = 2000 }: CompanyLogoSplashProps) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter')
  const finishedRef = useRef(false)
  const exitSoundPlayedRef = useRef(false)

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    onDone()
  }, [onDone])

  const playExitOnce = useCallback(() => {
    if (exitSoundPlayedRef.current) return
    exitSoundPlayedRef.current = true
    playQwappyLogoExitSound()
  }, [])

  useEffect(() => {
    playQwappyLogoSound()
  }, [])

  useEffect(() => {
    const enterMs = 520
    const exitMs = 380
    const holdMs = Math.max(200, durationMs - enterMs)
    const t1 = window.setTimeout(() => setPhase('hold'), enterMs)
    const t2 = window.setTimeout(() => {
      setPhase('exit')
      playExitOnce()
    }, enterMs + holdMs)
    const t3 = window.setTimeout(() => finish(), enterMs + holdMs + exitMs)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [durationMs, finish, playExitOnce])

  return (
    <div
      className={`qwappy-splash ${phase === 'exit' ? 'is-exit' : ''}`}
      role="img"
      aria-label="QWAPPY"
      onClick={() => {
        setPhase('exit')
        playExitOnce()
        window.setTimeout(() => finish(), 180)
      }}
    >
      <div className="qwappy-splash-glow" aria-hidden />
      <div className="qwappy-splash-soft-blobs" aria-hidden>
        <span className="qwappy-blob qwappy-blob-a" />
        <span className="qwappy-blob qwappy-blob-b" />
        <span className="qwappy-blob qwappy-blob-c" />
      </div>

      <div className={`qwappy-splash-mark ${phase === 'hold' ? 'is-hold' : ''}`}>
        <h1 className="qwappy-splash-word">
          {LETTERS.map((ch, i) => (
            <span
              key={`${ch}-${i}`}
              className="qwappy-splash-letter"
              style={{ animationDelay: `${80 + i * 70}ms` }}
            >
              {ch}
            </span>
          ))}
        </h1>
        <div className="qwappy-splash-underline" aria-hidden>
          <span />
        </div>
      </div>

      <p className="qwappy-splash-copyright">
        © 2026 Qwappy Games. All rights reserved.
      </p>
    </div>
  )
}
