import { useEffect, useState } from 'react'
import type { SnsResult } from '../game/sns'
import { snsCommentText } from '../game/snsComments'
import { useTranslation } from '../locales/i18n'
import { SnsMediaLightbox, SnsMediaWithBlur } from './SnsMediaWithBlur'

type SnsResultModalProps = {
  result: SnsResult
  onConfirm: () => void
}

export function SnsResultModal({ result, onConfirm }: SnsResultModalProps) {
  const { t, locale } = useTranslation()
  const [likes, setLikes] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    const target = result.likes
    const started = performance.now()
    const duration = 1100
    let frame = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - started) / duration)
      const eased = 1 - (1 - p) ** 3
      setLikes(Math.round(target * eased))
      if (p < 1) frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [result.likes])

  const viral = t('sns.resultViral').replace('{viewers}', result.viewersGained.toLocaleString())

  return (
    <div className="fixed inset-0 z-[87] flex flex-col items-center justify-center overflow-hidden bg-black/78 p-3 backdrop-blur-[3px] sm:p-4">
      <div className="game-panel-strong flex max-h-full min-h-0 w-full max-w-md flex-col overflow-hidden rounded-2xl">
        <div className="shrink-0 border-b border-white/10 px-5 py-3 text-center">
          <p className="text-[10px] font-semibold tracking-wide text-slate-500">SNS</p>
          <h2 className="mt-1 text-lg font-bold text-slate-100">{t('sns.resultTitle')}</h2>
          <p className="mt-1 text-sm text-slate-400">{result.creatorName}</p>
          {result.heat === 3 ? (
            <p className="sns-heat3-result mt-2 text-sm font-black tracking-wide text-fuchsia-200">
              {t('sns.heat3')}
            </p>
          ) : null}
        </div>
        {result.imageUrl && result.mediaKind ? (
          <SnsMediaWithBlur
            url={result.imageUrl}
            kind={result.mediaKind}
            regions={result.blurRegions}
            className="shrink-0 overflow-hidden bg-black/40"
            mediaClassName="mx-auto block max-h-[min(34dvh,280px)] w-full object-contain"
            onClick={() => setLightboxOpen(true)}
          />
        ) : null}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-3">
          {result.caption ? <p className="text-sm text-slate-200">{result.caption}</p> : null}
          <p className="text-2xl font-black tabular-nums text-rose-300">
            ❤️ +{likes.toLocaleString()}
          </p>
          <ul className="space-y-1.5">
            {result.comments.map((comment) => (
              <li
                key={`${comment.userId}-${comment.heat}-${comment.line}-${comment.text}`}
                className="text-[13px] text-slate-400"
              >
                <span className="mr-1.5 font-semibold text-slate-200">@{comment.userId}</span>
                {snsCommentText(comment, locale)}
              </li>
            ))}
          </ul>
          <p className="text-sm font-semibold text-amber-200">{viral}</p>
        </div>
        <div className="flex shrink-0 justify-center border-t border-white/10 px-5 py-3">
          <button type="button" className="game-btn game-btn-primary min-w-[140px] py-2.5 text-sm" onClick={onConfirm}>
            {t('sns.close')}
          </button>
        </div>
      </div>
      {lightboxOpen && result.imageUrl && result.mediaKind ? (
        <SnsMediaLightbox
          url={result.imageUrl}
          kind={result.mediaKind}
          regions={result.blurRegions}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </div>
  )
}
