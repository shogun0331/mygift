import { useEffect, useRef, useState } from 'react'
import type { StaffKind } from '../game/slotManagers'

export type StaffActionKind = StaffKind

export type StaffActionFxItem = {
  id: string
  slotId: string
  kind: StaffActionKind
  title: string
  subtitle: string
}

type StaffActionFxProps = {
  actions: StaffActionFxItem[]
  onDone?: (id: string) => void
  /** visual: CCTV 위 빛/스캔만 · caption: CCTV 아래 텍스트 */
  variant?: 'visual' | 'caption'
}

const FX_VISIBLE_MS = 1800
const FX_DONE_MS = 1950

export function StaffActionFx({
  actions,
  onDone,
  variant = 'visual',
}: StaffActionFxProps) {
  if (actions.length === 0) return null

  if (variant === 'caption') {
    return (
      <div className="staff-action-caption-stack pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center gap-1 px-2 pt-1">
        {actions.map((action) => (
          <StaffActionCaption key={action.id} action={action} onDone={onDone} />
        ))}
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[28] overflow-hidden rounded-[inherit]">
      {actions.map((action) => (
        <StaffActionVisual key={action.id} action={action} />
      ))}
    </div>
  )
}

function StaffActionVisual({ action }: { action: StaffActionFxItem }) {
  return (
    <div className={`staff-action-burst is-${action.kind} staff-action-visual absolute inset-0`}>
      <div className="staff-action-wash absolute inset-0" />
      <div className="staff-action-flash absolute inset-0" />
      <div className="staff-action-ring absolute inset-0" />
      <div className="staff-action-scan absolute inset-0" />
      <div className="staff-action-border absolute inset-0" />
    </div>
  )
}

function StaffActionCaption({
  action,
  onDone,
}: {
  action: StaffActionFxItem
  onDone?: (id: string) => void
}) {
  const [visible, setVisible] = useState(true)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    const hide = window.setTimeout(() => setVisible(false), FX_VISIBLE_MS)
    const done = window.setTimeout(() => onDoneRef.current?.(action.id), FX_DONE_MS)
    return () => {
      window.clearTimeout(hide)
      window.clearTimeout(done)
    }
  }, [action.id])

  if (!visible) return null

  return (
    <div className={`staff-action-caption is-${action.kind}`}>
      <p className="staff-action-caption-title">{action.title}</p>
      {action.subtitle ? (
        <p className="staff-action-caption-sub">{action.subtitle}</p>
      ) : null}
    </div>
  )
}
