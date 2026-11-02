import { useMemo } from 'react'
import { resolveMediaSrc } from '../game/mediaUrl'
import { useTranslation } from '../locales/i18n'
import { UiDialogBtn, UiDialogShell } from '../ui/UiDialogShell'

/** VN 캐릭터 Reiko — 2026-10-19_00005 스탠딩 */
export const REIKO_VN_CHARACTER_ID = '1792369110889-p0l69g7'
export const REIKO_RANK_ONE_IMAGE_URL =
  'media://vn_characters/1792369110889-p0l69g7/images/1792375265395-3tl0dnj__2026-10-19_00005.webp'
export const REIKO_MEDIA_REVISION = 1792375268328

type RankOneEndingModalProps = {
  onConfirm: () => void
}

/** 리그 1위 달성 시 1회 — Reiko가 엔딩/고백하기 해금 안내 */
export function RankOneEndingModal({ onConfirm }: RankOneEndingModalProps) {
  const { t } = useTranslation()
  const portraitSrc = useMemo(
    () => resolveMediaSrc(REIKO_RANK_ONE_IMAGE_URL, REIKO_MEDIA_REVISION),
    [],
  )

  return (
    <UiDialogShell labelledBy="rank-one-ending-title" describedBy="rank-one-ending-body" tone="amber" size="md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
        <div className="mx-auto h-36 w-28 shrink-0 overflow-hidden rounded-2xl border border-amber-300/40 bg-slate-900 shadow-[0_0_24px_rgba(251,191,36,0.25)] sm:mx-0 sm:h-44 sm:w-32">
          {portraitSrc ? (
            <img src={portraitSrc} alt="" className="h-full w-full object-cover object-top" draggable={false} />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-amber-950 text-2xl font-black text-amber-200">
              R
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2.5 text-left">
          <p className="game-kicker text-amber-300">{t('ranking.rankOneEndingKicker')}</p>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/45 bg-amber-500/15 px-2.5 py-0.5">
            <span className="text-[11px] font-black tracking-wide text-amber-100">Reiko</span>
          </div>
          <h2 id="rank-one-ending-title" className="text-lg font-black tracking-wide text-amber-50 sm:text-xl">
            {t('ranking.rankOneEndingTitle')}
          </h2>
          <div id="rank-one-ending-body" className="space-y-2 text-[13px] font-semibold leading-relaxed text-slate-200">
            <p>{t('ranking.rankOneEndingLine1')}</p>
            <p>{t('ranking.rankOneEndingLine2')}</p>
            <p className="text-amber-100/95">{t('ranking.rankOneEndingLine3')}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-center sm:justify-end">
        <UiDialogBtn
          onClick={onConfirm}
          className="min-w-[9rem] border border-amber-300/50 bg-amber-400 text-slate-950 hover:bg-amber-300"
        >
          {t('ranking.rankOneEndingConfirm')}
        </UiDialogBtn>
      </div>
    </UiDialogShell>
  )
}
