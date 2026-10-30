import type { CreatorStatType, Grade } from '../game/characters'
import { CREATOR_UI_ASSETS } from './creatorAssets'

/** Plate hue — A is purple (not handoff pink). */
const GRADE_PLATE_FILTER: Record<Grade, string> = {
  S: 'hue-rotate(38deg) saturate(1.5) drop-shadow(0 0 8px rgba(251,191,36,0.7))',
  A: 'hue-rotate(-72deg) saturate(1.35) drop-shadow(0 0 8px rgba(168,85,247,0.65))',
  B: 'drop-shadow(0 0 7px rgba(34,211,238,0.55))',
  C: 'saturate(0.5) brightness(0.95) drop-shadow(0 0 6px rgba(148,163,184,0.45))',
}

const GRADE_LETTER_CLASS: Record<Grade, string> = {
  S: 'text-amber-100',
  A: 'text-purple-100',
  B: 'text-cyan-100',
  C: 'text-slate-200',
}

export const STAT_TYPE_LABEL_KEY: Record<CreatorStatType, string> = {
  sexy: 'creator.typeSexy',
  communication: 'creator.typeCommunication',
  mental: 'creator.typeMental',
  performance: 'creator.typePerformance',
}

export const STAT_TYPE_ASSET: Record<CreatorStatType, string> = {
  sexy: CREATOR_UI_ASSETS.typeSexy,
  communication: CREATOR_UI_ASSETS.typeTalk,
  mental: CREATOR_UI_ASSETS.typeMind,
  performance: CREATOR_UI_ASSETS.typeStage,
}

export const STAT_TYPE_CHIP_TONE: Record<CreatorStatType, string> = {
  sexy: 'border-rose-400/40 bg-rose-500/10',
  communication: 'border-cyan-400/40 bg-cyan-500/10',
  mental: 'border-violet-400/40 bg-violet-500/10',
  performance: 'border-amber-400/40 bg-amber-500/10 drop-shadow-[0_0_6px_rgba(251,191,36,0.35)]',
}

export function GradePlate({
  grade,
  size = 'md',
  className = '',
}: {
  grade: Grade
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const dim =
    size === 'sm' ? 'h-7 w-7 text-[11px]' : size === 'lg' ? 'h-9 w-9 text-sm' : 'h-8 w-8 text-xs'
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${dim} ${className}`}
      aria-label={grade}
      data-grade={grade}
    >
      <img
        src={CREATOR_UI_ASSETS.gradePlate}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-contain"
        style={{ filter: GRADE_PLATE_FILTER[grade] }}
      />
      <span
        className={`relative z-[1] font-black italic tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] ${GRADE_LETTER_CLASS[grade]}`}
      >
        {grade}
      </span>
    </span>
  )
}

export function TypeStatIcon({
  type,
  className = 'h-3.5 w-3.5',
}: {
  type: CreatorStatType
  className?: string
}) {
  return (
    <img
      src={STAT_TYPE_ASSET[type]}
      alt=""
      aria-hidden
      className={`${className} object-contain`}
    />
  )
}

export function BoltGlyph({ className = 'h-3 w-3 text-cyan-400' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="currentColor" aria-hidden>
      <path d="M6.8 1L3 7h2.6L5 11l4.2-7H6.8L8.2 1H6.8z" />
    </svg>
  )
}
