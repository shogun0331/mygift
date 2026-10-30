import type { ReactNode } from 'react'
import { SHELL_UI_ASSETS } from './shellAssets'
import './shellFrames.css'

export type UiDialogTone = 'default' | 'amber' | 'rose' | 'pink' | 'indigo' | 'cyan'

type UiDialogShellProps = {
  children: ReactNode
  labelledBy?: string
  describedBy?: string
  size?: 'sm' | 'md'
  tone?: UiDialogTone
  zClassName?: string
  backdropClassName?: string
  onBackdropClick?: () => void
}

export function UiDialogShell({
  children,
  labelledBy,
  describedBy,
  size = 'md',
  tone = 'default',
  zClassName = 'z-[85]',
  backdropClassName = '',
  onBackdropClick,
}: UiDialogShellProps) {
  const toneClass = tone === 'default' ? '' : `ui-dialog--${tone}`
  return (
    <div
      className={`ui-dialog-backdrop ${zClassName} ${backdropClassName}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={onBackdropClick}
    >
      <div
        className={`ui-dialog ${size === 'sm' ? 'ui-dialog--sm' : ''} ${toneClass}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ui-dialog__inner">
          <div className="ui-dialog__scroll">{children}</div>
        </div>
        <img
          src={SHELL_UI_ASSETS.dialogFrame}
          alt=""
          draggable={false}
          className="ui-dialog__bezel"
        />
      </div>
    </div>
  )
}

type UiDialogBtnProps = {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
}

export function UiDialogBtn({
  children,
  onClick,
  disabled,
  className = '',
  type = 'button',
}: UiDialogBtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`ui-dialog-btn rounded-xl px-6 py-2.5 text-sm font-bold tracking-wide disabled:cursor-not-allowed disabled:opacity-40 ${className}`.trim()}
    >
      {children}
    </button>
  )
}
