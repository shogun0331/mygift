import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { OwnedCreator } from '../game/characters'
import { characterDisplayJob, characterDisplayName } from '../game/characterLocales'
import { formatMoney } from '../game/money'
import { resolveMediaSrc } from '../game/mediaUrl'
import {
  SNS_HEAT_COST,
  nextSnsPost,
  snsCaptionOf,
  snsHeatProgress,
  snsPostMedia,
  type SnsHeat,
} from '../game/sns'
import { snsCommentText, type SnsComment } from '../game/snsComments'
import { useTranslation } from '../locales/i18n'
import { SnsMediaLightbox, SnsMediaWithBlur } from './SnsMediaWithBlur'

type SnsFeedModalProps = {
  creator: OwnedCreator
  assets: number
  onClose: () => void
  onCompose: (heat: SnsHeat) => void
}

const HEATS: SnsHeat[] = [1, 2, 3]

function snsHandle(name: string) {
  const compact = name.replace(/\s+/g, '')
  return compact ? `@${compact}` : '@creator'
}

function Face({
  name,
  imageUrl,
  sizeClass,
}: {
  name: string
  imageUrl?: string | null
  sizeClass: string
}) {
  if (imageUrl) {
    return (
      <img
        src={resolveMediaSrc(imageUrl)}
        alt=""
        className={`${sizeClass} shrink-0 rounded-full object-cover ring-2 ring-black`}
      />
    )
  }
  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-indigo-500/80 text-sm font-bold text-white ring-2 ring-black`}
    >
      {name.slice(0, 1)}
    </div>
  )
}

export function SnsFeedModal({ creator, assets, onClose, onCompose }: SnsFeedModalProps) {
  const { t, locale } = useTranslation()
  const feedScrollRef = useRef<HTMLDivElement>(null)
  const waitRevealRef = useRef(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [pickedHeat, setPickedHeat] = useState<SnsHeat>(1)
  const [revealPostId, setRevealPostId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{
    url: string
    kind: 'image' | 'video'
    regions?: import('../events/types').BlurRegion[]
  } | null>(null)
  const posts = creator.snsPosts ?? []
  const publishedIds = creator.snsPublishedIds ?? []
  const feed = creator.snsFeed ?? []
  const pending = creator.snsPending ?? null
  const displayName = characterDisplayName(creator, locale)
  const job = characterDisplayJob(creator, locale)
  const handle = snsHandle(displayName)
  const avatarUrl = creator.profileImageUrl
  const bannerUrl = creator.characterIllustrationId
    ? creator.images?.find((image) => image.id === creator.characterIllustrationId)?.url
    : avatarUrl
  const followers = feed.reduce((sum, item) => sum + item.likes, 0)
  const postCount = feed.length + (pending ? 1 : 0)

  const feedItems = [
    ...feed.map((item) => ({
      key: item.postId,
      postId: item.postId,
      likes: item.likes,
      comments: item.comments ?? [],
      pending: false,
    })),
    ...(pending
      ? [
          {
            key: `pending-${pending.postId}`,
            postId: pending.postId,
            likes: 0,
            comments: [],
            pending: true,
          },
        ]
      : []),
  ]

  useEffect(() => {
    if (!waitRevealRef.current || !pending) return
    waitRevealRef.current = false
    setRevealPostId(pending.postId)
    requestAnimationFrame(() => {
      const scroller = feedScrollRef.current
      if (!scroller) return
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' })
    })
  }, [pending])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (lightbox) setLightbox(null)
        else if (composeOpen) setComposeOpen(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [composeOpen, lightbox, onClose])

  function submitCompose() {
    waitRevealRef.current = true
    onCompose(pickedHeat)
    setComposeOpen(false)
  }

  return createPortal(
    <div className="fixed inset-0 z-[92] flex items-center justify-center bg-black/72 p-4 backdrop-blur-[6px]">
      <div
        className="relative flex h-[min(92dvh,52rem)] w-[min(92vw,28rem)] flex-col rounded-[2.4rem] p-[0.72rem] shadow-[0_28px_80px_rgba(0,0,0,0.55)]"
        style={{
          background:
            'linear-gradient(165deg, #3a3f4d 0%, #1a1d26 38%, #0d0f14 100%)',
          boxShadow:
            '0 28px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.5)',
        }}
      >
        <div className="absolute left-1/2 top-[0.42rem] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-slate-700 ring-1 ring-black/40" />
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.7rem] bg-[#070b12]">
          <div className="flex shrink-0 items-center justify-between px-3 pt-2">
            <span className="pl-1 text-[10px] font-semibold tracking-wide text-slate-400">SNS</span>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-slate-200 transition hover:bg-white/16"
              aria-label={t('sns.close')}
            >
              <CloseIcon />
            </button>
          </div>
          <header className="flex shrink-0 items-center gap-2 border-b border-white/8 px-4 pb-2.5">
            <Face name={displayName} imageUrl={avatarUrl} sizeClass="h-8 w-8" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-slate-100">{displayName}</p>
              <p className="truncate text-[11px] text-slate-500">{handle}</p>
            </div>
          </header>

          <div ref={feedScrollRef} className="min-h-0 flex-1 overflow-auto">
            <section className="relative">
              <div className="h-28 overflow-hidden bg-gradient-to-br from-indigo-700/40 via-slate-900 to-slate-950">
                {bannerUrl ? (
                  <img src={resolveMediaSrc(bannerUrl)} alt="" className="h-full w-full object-cover opacity-80" />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-[#070b12] via-transparent to-black/25" />
              </div>
              <div className="relative -mt-8 px-4 pb-3">
                <div className="flex items-end justify-between gap-3">
                  <Face name={displayName} imageUrl={avatarUrl} sizeClass="h-16 w-16 ring-[3px] ring-[#070b12]" />
                  <p className="pb-1 text-[11px] text-slate-400">
                    <span className="font-bold text-slate-100">{postCount}</span> {t('sns.posts')}
                    <span className="mx-1.5 text-slate-600">·</span>
                    <span className="font-bold text-slate-100">{followers.toLocaleString()}</span>{' '}
                    {t('sns.followers')}
                  </p>
                </div>
                <h3 className="mt-2 text-lg font-extrabold text-slate-100">{displayName}</h3>
                <p className="text-[12px] text-slate-500">{handle}</p>
                {job ? <p className="mt-0.5 text-[12px] text-slate-300">{job}</p> : null}
              </div>
            </section>

            <div className="border-t border-white/8 px-4 pb-4">
              {feedItems.length === 0 ? (
                <div className="py-14 text-center">
                  <p className="text-sm font-bold text-slate-100">{t('sns.empty')}</p>
                  <p className="mt-2 text-[12px] leading-5 text-slate-500">{t('sns.composeHint')}</p>
                </div>
              ) : (
                feedItems.map((item) => {
                  const media = snsPostMedia(posts, creator.images, creator.videos, item.postId)
                  const post = posts.find((row) => row.id === item.postId)
                  const caption = post ? snsCaptionOf(post, locale) : ''
                  return (
                    <FeedArticle
                      key={item.key}
                      reveal={item.postId === revealPostId || Boolean(waitRevealRef.current && item.pending)}
                      displayName={displayName}
                      handle={handle}
                      avatarUrl={avatarUrl}
                      pending={item.pending}
                      pendingLabel={t('sns.pending')}
                      caption={caption}
                      media={media}
                      regions={post?.blurRegions}
                      likes={item.likes}
                      comments={item.comments}
                      locale={locale}
                      onPhotoClick={
                        media
                          ? () =>
                              setLightbox({
                                url: media.url,
                                kind: media.kind,
                                regions: post?.blurRegions,
                              })
                          : undefined
                      }
                    />
                  )
                })
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-white/8 bg-[#080c16] px-3 py-2.5">
            <button
              type="button"
              disabled={Boolean(pending)}
              onClick={() => setComposeOpen(true)}
              className="game-btn game-btn-primary w-full rounded-full py-2.5 text-[13px] font-bold disabled:cursor-not-allowed disabled:opacity-35"
            >
              {t('sns.compose')}
            </button>
            {pending ? (
              <p className="mt-1.5 text-center text-[11px] font-semibold text-amber-300">
                {t('sns.alreadyPosted')}
              </p>
            ) : null}
            <div className="mx-auto mt-2 h-1 w-20 rounded-full bg-white/18" />
          </div>

          {composeOpen ? (
            <div className="absolute inset-0 z-10 flex flex-col bg-[#070b12]/96">
              <div className="flex items-center justify-between border-b border-white/8 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  className="game-btn rounded-lg px-3 py-1.5 text-xs"
                >
                  {t('sns.cancel')}
                </button>
                <button
                  type="button"
                  disabled={
                    Boolean(pending) ||
                    !nextSnsPost(posts, publishedIds, pickedHeat) ||
                    assets < SNS_HEAT_COST[pickedHeat]
                  }
                  onClick={submitCompose}
                  className="game-btn game-btn-primary rounded-lg px-3 py-1.5 text-xs disabled:opacity-35"
                >
                  {t('sns.postNow')}
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
                <div className="flex gap-3">
                  <Face name={displayName} imageUrl={avatarUrl} sizeClass="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-100">{displayName}</p>
                    <p className="text-[11px] text-slate-500">{t('sns.composeHint')}</p>
                    {pending ? (
                      <p className="mt-4 text-sm text-amber-300">{t('sns.alreadyPosted')}</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {HEATS.map((heat) => {
                          const cost = SNS_HEAT_COST[heat]
                          const stock = nextSnsPost(posts, publishedIds, heat)
                          const progress = snsHeatProgress(posts, publishedIds, heat, pending?.postId)
                          const broke = assets < cost
                          const disabled = !stock || broke
                          const selected = pickedHeat === heat
                          return (
                            <button
                              key={heat}
                              type="button"
                              disabled={disabled}
                              onClick={() => setPickedHeat(heat)}
                              className={`flex w-full items-start justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition disabled:opacity-40 ${
                                selected
                                  ? 'border-indigo-400/50 bg-indigo-500/15'
                                  : 'border-white/10 bg-white/[0.03]'
                              }`}
                            >
                              <span>
                                <span className="block text-[13px] font-semibold text-slate-100">
                                  {t(`sns.heat${heat}`)}
                                </span>
                                <span className="mt-0.5 block text-[11px] text-slate-500">
                                  {t(`sns.heat${heat}Desc`)}
                                </span>
                                <span className="mt-1 block text-[11px] text-rose-300/80">
                                  {!stock ? t('sns.noStock') : broke ? t('sns.needAssets') : ''}
                                </span>
                              </span>
                              <span className="shrink-0 text-right">
                                <span className="block text-[12px] font-black tabular-nums text-amber-300">
                                  {formatMoney(cost)}
                                </span>
                                <span className="mt-1 block text-[11px] font-semibold tabular-nums text-slate-400">
                                  {progress.used}/{progress.total}
                                </span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {lightbox ? (
        <SnsMediaLightbox
          url={lightbox.url}
          kind={lightbox.kind}
          regions={lightbox.regions}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </div>,
    document.body,
  )
}

function useTypedCaption(text: string, active: boolean, ms = 34) {
  const [shown, setShown] = useState(active ? '' : text)
  useEffect(() => {
    if (!active) {
      setShown(text)
      return
    }
    setShown('')
    if (!text) return
    let index = 0
    const id = window.setInterval(() => {
      index += 1
      setShown(text.slice(0, index))
      if (index >= text.length) window.clearInterval(id)
    }, ms)
    return () => window.clearInterval(id)
  }, [active, ms, text])
  return shown
}

function FeedArticle({
  reveal,
  displayName,
  handle,
  avatarUrl,
  pending,
  pendingLabel,
  caption,
  media,
  regions,
  likes,
  comments,
  locale,
  onPhotoClick,
}: {
  reveal: boolean
  displayName: string
  handle: string
  avatarUrl?: string | null
  pending: boolean
  pendingLabel: string
  caption: string
  media: { kind: 'image' | 'video'; url: string } | null
  regions?: import('../events/types').BlurRegion[]
  likes: number
  comments: SnsComment[]
  locale: string
  onPhotoClick?: () => void
}) {
  const typed = useTypedCaption(caption, reveal)
  const typing = reveal && typed.length < caption.length
  const [entered, setEntered] = useState(!reveal)
  const [photoReady, setPhotoReady] = useState(!reveal)
  const [photoIn, setPhotoIn] = useState(!reveal)
  const [metaOn, setMetaOn] = useState(!reveal)

  useEffect(() => {
    if (!reveal) {
      setEntered(true)
      return
    }
    const enter = window.setTimeout(() => setEntered(true), 30)
    return () => window.clearTimeout(enter)
  }, [reveal])

  useEffect(() => {
    if (!reveal) {
      setPhotoReady(true)
      setPhotoIn(true)
      setMetaOn(true)
      return
    }
    if (typing) return
    let raf = 0
    const photoDelay = caption ? 160 : 240
    const show = window.setTimeout(() => {
      setPhotoReady(true)
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => setPhotoIn(true))
      })
    }, photoDelay)
    const meta = window.setTimeout(() => setMetaOn(true), photoDelay + (media ? 480 : 80))
    return () => {
      window.clearTimeout(show)
      window.clearTimeout(meta)
      cancelAnimationFrame(raf)
    }
  }, [caption, media, reveal, typing])

  return (
    <article
      className={`border-b border-white/8 py-4 transition-all duration-500 ease-out ${
        entered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="flex gap-2.5">
        <Face name={displayName} imageUrl={avatarUrl} sizeClass="h-9 w-9" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-[13px] font-bold text-white">{displayName}</span>
            <span className="text-[11px] text-slate-500">{handle}</span>
            {pending ? (
              <span className="text-[10px] font-semibold text-amber-300">· {pendingLabel}</span>
            ) : null}
          </div>
          {caption || typing ? (
            <p className="mt-1 min-h-[1.5rem] whitespace-pre-wrap text-[14px] leading-6 text-slate-100">
              {typed}
              {typing ? (
                <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] animate-pulse bg-indigo-200 align-[-2px]" />
              ) : null}
            </p>
          ) : null}
          {media && photoReady ? (
            <div
              className={`origin-top-left transition-all duration-500 ease-out ${
                photoIn ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.96] opacity-0'
              }`}
            >
              <SnsMediaWithBlur
                url={media.url}
                kind={media.kind}
                regions={regions}
                className="mt-2.5 w-[78%] overflow-hidden rounded-2xl border border-white/12 bg-black/30"
                mediaClassName="block max-h-52 w-full object-contain"
                onClick={photoIn ? onPhotoClick : undefined}
              />
            </div>
          ) : null}
          <div
            className={`mt-2.5 flex items-center gap-5 text-[12px] text-slate-500 transition-opacity duration-500 ${
              metaOn ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <span className="inline-flex items-center gap-1">
              <CommentIcon />
              {comments.length}
            </span>
            <span className="inline-flex items-center gap-1 text-rose-300">
              <HeartIcon />
              {pending ? '—' : likes.toLocaleString()}
            </span>
          </div>
          {!pending && comments.length > 0 ? (
            <ul
              className={`mt-2.5 space-y-1.5 rounded-xl bg-white/[0.03] px-2.5 py-2 transition-opacity duration-500 ${
                metaOn ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {comments.map((comment) => (
                <li
                  key={`${comment.userId}-${comment.heat}-${comment.line}-${comment.text}`}
                  className="text-[12px] leading-5 text-slate-300"
                >
                  <span className="mr-1 font-semibold text-indigo-200">@{comment.userId}</span>
                  {snsCommentText(comment, locale)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M12 21s-6.7-4.35-9.33-8.1C.7 10.2 1.2 6.8 4.05 5.35 6.1 4.3 8.45 5 12 8.15 15.55 5 17.9 4.3 19.95 5.35 22.8 6.8 23.3 10.2 21.33 12.9 18.7 16.65 12 21 12 21Z" />
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M5 6.5h14A1.5 1.5 0 0 1 20.5 8v8A1.5 1.5 0 0 1 19 17.5H9l-4 3v-3H5A1.5 1.5 0 0 1 3.5 16V8A1.5 1.5 0 0 1 5 6.5Z"
        strokeLinejoin="round"
      />
    </svg>
  )
}
