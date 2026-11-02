import { useMemo } from 'react'
import { resolveMediaSrc } from '../game/mediaUrl'
import { useTranslation } from '../locales/i18n'
import { UiDialogBtn, UiDialogShell } from '../ui/UiDialogShell'
import {
  REIKO_MEDIA_REVISION,
  REIKO_RANK_ONE_IMAGE_URL,
} from './RankOneEndingModal'

export const BANKRUPTCY_BAILOUT_AMOUNT = 1_000_000

type BankruptcyBailoutModalProps = {
  onConfirm: () => void
}

/** 자산 파산(0 미만) 시 Reiko 비상 지원 — 한심한 톤 + $1,000,000 */
export function BankruptcyBailoutModal({ onConfirm }: BankruptcyBailoutModalProps) {
  const { t } = useTranslation()
  const portraitSrc = useMemo(
    () => resolveMediaSrc(REIKO_RANK_ONE_IMAGE_URL, REIKO_MEDIA_REVISION),
    [],
  )

  return (
    <UiDialogShell
      labelledBy="bankruptcy-bailout-title"
      describedBy="bankruptcy-bailout-body"
      tone="rose"
      size="md"
      zClassName="z-[130]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
        <div className="mx-auto h-36 w-28 shrink-0 overflow-hidden rounded-2xl border border-rose-300/40 bg-slate-900 shadow-[0_0_24px_rgba(244,63,94,0.28)] sm:mx-0 sm:h-44 sm:w-32">
          {portraitSrc ? (
            <img src={portraitSrc} alt="" className="h-full w-full object-cover object-top" draggable={false} />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-rose-950 text-2xl font-black text-rose-200">
              R
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2.5 text-left">
          <p className="game-kicker text-rose-300">{t('economy.bankruptcyKicker')}</p>
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-300/45 bg-rose-500/15 px-2.5 py-0.5">
            <span className="text-[11px] font-black tracking-wide text-rose-100">Reiko</span>
          </div>
          <h2 id="bankruptcy-bailout-title" className="text-lg font-black tracking-wide text-rose-50 sm:text-xl">
            {t('economy.bankruptcyTitle')}
          </h2>
          <div id="bankruptcy-bailout-body" className="space-y-2 text-[13px] font-semibold leading-relaxed text-slate-200">
            <p>{t('economy.bankruptcyLine1')}</p>
            <p>{t('economy.bankruptcyLine2')}</p>
            <p className="text-rose-100/95">
              {t('economy.bankruptcyLine3', { amount: '$1,000,000' })}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-center sm:justify-end">
        <UiDialogBtn
          onClick={onConfirm}
          className="min-w-[9rem] border border-rose-300/50 bg-rose-400 text-slate-950 hover:bg-rose-300"
        >
          {t('economy.bankruptcyConfirm')}
        </UiDialogBtn>
      </div>
    </UiDialogShell>
  )
}
