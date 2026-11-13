import { useCallback, useEffect, useRef, useState } from 'react'
import { playQwappyLogoExitSound, playQwappyLogoSound } from '../game/uiSfx'

type CompanyLogoSplashProps = {
  onDone: () => void
  /** 로고 최소 표시 시간(ms). 기본 3000 — 에셋이 빨리 준비돼도 이 시간은 반드시 보여 줌 */
  durationMs?: number
  /**
   * true가 될 때까지 메뉴 진입을 기다림 (오프닝 영상 워밍업 등).
   * 로드 실패/타임아웃 시 부모가 true로 올려 통과시킨다.
   */
  assetsReady?: boolean
}

const LETTERS = ['Q', 'W', 'A', 'P', 'P', 'Y'] as const
const EXIT_MS = 380
const EXIT_MS_FAST = 180

/**
 * 부팅 직후 회사 로고 스플래시.
 * 최소 durationMs(기본 3초) 동안 로고를 보여 준 뒤,
 * 에셋 워밍업이 끝났으면 퇴장 → 메뉴.
 */
export function CompanyLogoSplash({
  onDone,
  durationMs = 3000,
  assetsReady = true,
}: CompanyLogoSplashProps) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'waiting' | 'exit'>('enter')
  const [minTimeDone, setMinTimeDone] = useState(false)
  const finishedRef = useRef(false)
  const exitStartedRef = useRef(false)
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

  const beginExit = useCallback(
    (fast: boolean) => {
      if (exitStartedRef.current || finishedRef.current) return
      exitStartedRef.current = true
      setPhase('exit')
      playExitOnce()
      window.setTimeout(() => finish(), fast ? EXIT_MS_FAST : EXIT_MS)
    },
    [finish, playExitOnce],
  )

  useEffect(() => {
    playQwappyLogoSound()
  }, [])

  // 최소 로고 표시 시간 (에셋 준비와 무관하게 항상 durationMs)
  useEffect(() => {
    const enterMs = 520
    const t1 = window.setTimeout(() => setPhase('hold'), enterMs)
    const t2 = window.setTimeout(() => setMinTimeDone(true), durationMs)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [durationMs])

  // 3초는 채웠는데 에셋이 아직이면 waiting 표시 유지
  useEffect(() => {
    if (!minTimeDone || assetsReady || exitStartedRef.current) return
    setPhase('waiting')
  }, [minTimeDone, assetsReady])

  // 최소 3초 + 에셋 준비 → 퇴장
  useEffect(() => {
    if (!minTimeDone || !assetsReady) return
    beginExit(false)
  }, [minTimeDone, assetsReady, beginExit])

  return (
    <div
      className={`qwappy-splash ${phase === 'exit' ? 'is-exit' : ''}`}
      role="img"
      aria-label="QWAPPY"
      onClick={() => {
        // 최소 표시 시간은 스킵 불가. 3초 지난 뒤에만 퇴장 가속.
        if (!minTimeDone || !assetsReady) return
        beginExit(true)
      }}
    >
      <div className="qwappy-splash-glow" aria-hidden />
      <div className="qwappy-splash-soft-blobs" aria-hidden>
        <span className="qwappy-blob qwappy-blob-a" />
        <span className="qwappy-blob qwappy-blob-b" />
        <span className="qwappy-blob qwappy-blob-c" />
      </div>

      <div
        className={`qwappy-splash-mark ${phase === 'hold' || phase === 'waiting' ? 'is-hold' : ''}`}
      >
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
