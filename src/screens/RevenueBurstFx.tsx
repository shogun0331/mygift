import { useEffect, useMemo, useState, type CSSProperties } from 'react'

export type RevenueBurstTier = 'small' | 'mid' | 'big' | 'mega'

export type RevenueBurst = {
  id: string
  creatorId: string
  amount: number
  tier: RevenueBurstTier
}

export function revenueBurstTier(amount: number): RevenueBurstTier {
  if (amount >= 10_000_000) return 'mega'
  if (amount >= 1_000_000) return 'big'
  if (amount >= 100_000) return 'mid'
  return 'small'
}

function formatBurstWon(amount: number) {
  return `₩${Math.round(amount).toLocaleString('ko-KR')}`
}

const PARTICLE_COUNT: Record<RevenueBurstTier, number> = {
  small: 6,
  mid: 9,
  big: 12,
  mega: 16,
}

const BURST_MS: Record<RevenueBurstTier, number> = {
  small: 1000,
  mid: 1200,
  big: 1500,
  mega: 1800,
}

type Particle = {
  id: number
  kind: 'coin' | 'spark' | 'note'
  x: number
  delay: number
  duration: number
  drift: number
  scale: number
  rotate: number
}

function buildParticles(tier: RevenueBurstTier, seed: string): Particle[] {
  const count = PARTICLE_COUNT[tier]
  const particles: Particle[] = []
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0

  for (let i = 0; i < count; i++) {
    hash = (hash * 1664525 + 1013904223) >>> 0
    const roll = hash / 0xffffffff
    const kind: Particle['kind'] =
      roll < 0.55 ? 'coin' : roll < 0.82 ? 'spark' : 'note'
    hash = (hash * 1664525 + 1013904223) >>> 0
    // 우측 하단 앵커 주변으로만 분산
    const x = 55 + (hash % 4000) / 100
    hash = (hash * 1664525 + 1013904223) >>> 0
    const delay = (hash % 220) / 1000
    hash = (hash * 1664525 + 1013904223) >>> 0
    const duration = 0.65 + (hash % 550) / 1000
    hash = (hash * 1664525 + 1013904223) >>> 0
    const drift = ((hash % 100) - 50) / 10
    hash = (hash * 1664525 + 1013904223) >>> 0
    const scale = 0.55 + (hash % 55) / 100
    hash = (hash * 1664525 + 1013904223) >>> 0
    const rotate = (hash % 360) - 180
    particles.push({ id: i, kind, x, delay, duration, drift, scale, rotate })
  }
  return particles
}

type RevenueBurstFxProps = {
  bursts: RevenueBurst[]
  onBurstDone: (id: string) => void
}

/** 스트림 우측 하단 — 화면 가림 최소 수익 연출 */
export function RevenueBurstFx({ bursts, onBurstDone }: RevenueBurstFxProps) {
  if (bursts.length === 0) return null
  return (
    <div className="revenue-fx-layer pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {bursts.map((burst) => (
        <BurstInstance key={burst.id} burst={burst} onDone={onBurstDone} />
      ))}
    </div>
  )
}

function BurstInstance({
  burst,
  onDone,
}: {
  burst: RevenueBurst
  onDone: (id: string) => void
}) {
  const [alive, setAlive] = useState(true)
  const particles = useMemo(
    () => buildParticles(burst.tier, burst.id),
    [burst.id, burst.tier],
  )

  useEffect(() => {
    const ms = BURST_MS[burst.tier]
    const timer = window.setTimeout(() => {
      setAlive(false)
      onDone(burst.id)
    }, ms)
    return () => window.clearTimeout(timer)
  }, [burst.id, burst.tier, onDone])

  if (!alive) return null

  return (
    <div className={`revenue-burst revenue-burst--${burst.tier}`} aria-hidden>
      <div className="revenue-burst-anchor">
        <div className="revenue-burst-glow" />
        <div className="revenue-burst-amount">
          <span className="revenue-burst-amount-label">+{formatBurstWon(burst.amount)}</span>
        </div>
        {particles.map((p) => (
          <span
            key={p.id}
            className={`revenue-particle revenue-particle--${p.kind}`}
            style={
              {
                left: `${p.x}%`,
                ['--fx-delay' as string]: `${p.delay}s`,
                ['--fx-dur' as string]: `${p.duration}s`,
                ['--fx-drift' as string]: `${p.drift}px`,
                ['--fx-scale' as string]: p.scale,
                ['--fx-rot' as string]: `${p.rotate}deg`,
              } as CSSProperties
            }
          >
            {p.kind === 'coin' ? '₩' : p.kind === 'note' ? '✦' : '•'}
          </span>
        ))}
      </div>
    </div>
  )
}
