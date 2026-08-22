import { useEffect, useState } from 'react'

export type GearFailBurstItem = {
  id: string
  slotId: string
}

type GearFailBurstFxProps = {
  bursts: GearFailBurstItem[]
  title: string
  subtitle: string
  onDone: (id: string) => void
}

/** 장비고장 발동 한 방 — CCTV가 꺼지는 임팩트 */
export function GearFailBurstFx({ bursts, title, subtitle, onDone }: GearFailBurstFxProps) {
  if (bursts.length === 0) return null
  return (
    <div className="pointer-events-none absolute inset-0 z-[35] overflow-hidden rounded-[inherit]">
      {bursts.map((burst) => (
        <GearFailSlam key={burst.id} burst={burst} title={title} subtitle={subtitle} onDone={onDone} />
      ))}
    </div>
  )
}

function GearFailSlam({
  burst,
  title,
  subtitle,
  onDone,
}: {
  burst: GearFailBurstItem
  title: string
  subtitle: string
  onDone: (id: string) => void
}) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const hide = window.setTimeout(() => setVisible(false), 820)
    const done = window.setTimeout(() => onDone(burst.id), 920)
    return () => {
      window.clearTimeout(hide)
      window.clearTimeout(done)
    }
  }, [burst.id, onDone])

  if (!visible) return null

  return (
    <div className="gear-fail-slam absolute inset-0">
      <div className="gear-fail-slam-wash absolute inset-0" />
      <div className="gear-fail-slam-flash absolute inset-0" />
      <div className="gear-fail-slam-ring absolute inset-0" />
      <div className="gear-fail-slam-scan absolute inset-0" />
      <div className="gear-fail-slam-border absolute inset-0" />
      <div className="gear-fail-slam-copy absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center">
        <p className="gear-fail-slam-badge">{title}</p>
        <p className="gear-fail-slam-sub">{subtitle}</p>
      </div>
    </div>
  )
}
