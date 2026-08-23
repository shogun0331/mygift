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
    <div className="fixed inset-0 z-[87] flex items-center justify-center bg-black/78 p-4 backdrop-blur-[3px]">
      <div className="game-panel-strong w-full max-w-md overflow-hidden rounded-2xl">
        <div className="border-b border-white/10 px-5 py-4 text-center">
          <p className="text-[10px] font-semibold tracking-wide text-slate-500">SNS</p>
          <h2 className="mt-1 text-lg font-bold text-slate-100">{t('sns.resultTitle')}</h2>
          <p className="mt-1 text-sm text-slate-400">{result.creatorName}</p>
        </div>
        {result.imageUrl && result.mediaKind ? (
          <SnsMediaWithBlur
            url={result.imageUrl}
            kind={result.mediaKind}
            regions={result.blurRegions}
            className="overflow-hidden rounded-2xl"
            onClick={() => setLightboxOpen(true)}
          />
        ) : null}
        <div className="space-y-3 px-5 py-4">
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
        <div className="flex justify-center border-t border-white/10 px-5 py-3">
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
