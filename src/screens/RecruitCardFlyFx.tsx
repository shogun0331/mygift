import { useEffect, useRef, useState } from 'react'

export type RecruitFlyCard = {
  id: string
  name: string
  grade: string
  popularity: number
  profileImageUrl: string | null
}

type RecruitCardFlyFxProps = {
  card: RecruitFlyCard
  onDone: () => void
}

/** 중앙에 카드가 떴다가 배치할 크리에이터 패널로 빨려 들어가는 연출 */
export function RecruitCardFlyFx({ card, onDone }: RecruitCardFlyFxProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const [entered, setEntered] = useState(false)
  const [flying, setFlying] = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    const finish = () => {
      if (doneRef.current) return
      doneRef.current = true
      onDoneRef.current()
    }

    const enterTimer = window.setTimeout(() => setEntered(true), 40)

    const flyTimer = window.setTimeout(() => {
      const el = cardRef.current
      const target =
        document.querySelector(`[data-studio-hand-card="${CSS.escape(card.id)}"]`) ||
        document.querySelector('[data-studio-hand-target]')
      if (!el || !target) {
        finish()
        return
      }

      const from = el.getBoundingClientRect()
      const to = target.getBoundingClientRect()
      const dx = to.left + to.width / 2 - (from.left + from.width / 2)
      const dy = to.top + to.height / 2 - (from.top + from.height / 2)

      el.style.transform = `translate(${dx}px, ${dy}px) scale(0.22) rotate(8deg)`
      el.style.opacity = '0'
      setFlying(true)
    }, 980)

    const endTimer = window.setTimeout(finish, 980 + 780)

    return () => {
      window.clearTimeout(enterTimer)
      window.clearTimeout(flyTimer)
      window.clearTimeout(endTimer)
    }
  }, [card.id])

  return (
    <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center">
      <div
        className={`absolute inset-0 bg-black/55 transition-opacity duration-500 ${
          flying ? 'opacity-0' : entered ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        ref={cardRef}
        className={`relative z-10 aspect-[3/4] w-[min(42vw,220px)] overflow-hidden rounded-2xl border border-indigo-300/50 bg-slate-950 shadow-[0_20px_60px_rgba(99,102,241,0.45)] transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          entered && !flying
            ? 'translate-y-0 scale-100 opacity-100'
            : !entered
              ? 'translate-y-6 scale-90 opacity-0'
              : ''
        }`}
        style={{ willChange: 'transform, opacity' }}
      >
        {card.profileImageUrl ? (
          <>
            <img
              src={card.profileImageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/50 to-slate-950" />
        )}

        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-3 pb-4 pt-8">
          {!card.profileImageUrl && (
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-indigo-300/30 bg-indigo-500/20 text-lg font-bold text-indigo-50">
              {card.name.slice(0, 1)}
            </div>
          )}
          <p className="w-full truncate text-center text-sm font-bold text-slate-50">{card.name}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-amber-300">
            {card.grade} · {card.popularity}
          </p>
          <p className="mt-2 text-[10px] font-bold tracking-[0.2em] text-indigo-300">NEW RECRUIT</p>
        </div>
      </div>
    </div>
  )
}
