import {
  emptyCharacterLocaleText,
  mergeCharacterLocaleText,
  pickCharacterLocaleText,
  type CharacterLocaleText,
} from './characterLocales'
import { BLUR_DEFAULT, clampBlur, readBlurRegions } from '../events/BlurRegionEditor'
import type { BlurRegion } from '../events/types'
import type { Locale } from '../locales/i18n'
import { rollInt } from './stats'
import { captionLineOf, snsCharacterLine } from './snsLines'
import { normalizeSnsComments, pickSnsComments, type SnsComment } from './snsComments'

export type { SnsComment } from './snsComments'

export type SnsHeat = 1 | 2 | 3

export type SnsPostDef = {
  id: string
  heat: SnsHeat
  imageId: string | null
  videoId: string | null
  captions: CharacterLocaleText
  /** 직접 쓴 캡션이 없을 때 쓰는 캐릭터 한마디 줄 번호 */
  captionLine?: number
  blurRegions: BlurRegion[]
  blurDefault: number
}

export type SnsPublishedPost = {
  postId: string
  heat: SnsHeat
  likes: number
  comments: SnsComment[]
  /** @deprecated comments 사용 */
  commentKeys?: string[]
  publishedMonth: number
}

export type SnsPendingPost = {
  postId: string
  heat: SnsHeat
}

export type SnsResult = {
  creatorId: string
  creatorName: string
  postId: string
  heat: SnsHeat
  imageUrl: string | null
  mediaKind: 'image' | 'video' | null
  blurRegions: BlurRegion[]
  caption: string
  likes: number
  comments: SnsComment[]
  viewersGained: number
}

/** 수위별 촬영/의상비. 3은 전문 스튜디오 급 */
export const SNS_HEAT_COST: Record<SnsHeat, number> = {
  1: 8_000,
  2: 28_000,
  3: 95_000,
}

export const SNS_HEAT_VIEWERS: Record<SnsHeat, { min: number; max: number }> = {
  1: { min: 80, max: 180 },
  2: { min: 400, max: 800 },
  3: { min: 1_600, max: 3_200 },
}

export const SNS_HEAT_LIKES: Record<SnsHeat, { min: number; max: number }> = {
  1: { min: 120, max: 480 },
  2: { min: 1_800, max: 6_200 },
  3: { min: 12_000, max: 28_000 },
}

export function normalizeSnsPublishedPosts(raw: unknown): SnsPublishedPost[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const postId = String(row.postId ?? '').trim()
      if (!postId) return null
      const comments = normalizeSnsComments(row.comments ?? row.commentKeys)
      return {
        postId,
        heat: normalizeSnsHeat(row.heat),
        likes: Math.max(0, Math.round(Number(row.likes) || 0)),
        comments,
        publishedMonth: Math.max(0, Math.round(Number(row.publishedMonth) || 0)),
      } satisfies SnsPublishedPost
    })
    .filter((row): row is SnsPublishedPost => Boolean(row))
}

export function normalizeSnsHeat(raw: unknown): SnsHeat {
  if (raw === 2 || raw === '2') return 2
  if (raw === 3 || raw === '3') return 3
  return 1
}

export function normalizeSnsPosts(raw: unknown): SnsPostDef[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const id = String(row.id ?? '').trim()
      if (!id) return null
      return {
        id,
        heat: normalizeSnsHeat(row.heat),
        imageId: typeof row.imageId === 'string' && row.imageId ? row.imageId : null,
        videoId: typeof row.videoId === 'string' && row.videoId ? row.videoId : null,
        captions: mergeCharacterLocaleText(
          row.captions as Partial<Record<string, string>> | undefined,
          typeof row.caption === 'string' ? row.caption : '',
        ),
        captionLine:
          Number.isFinite(Number(row.captionLine)) && Number(row.captionLine) >= 0
            ? Math.round(Number(row.captionLine))
            : undefined,
        blurRegions: readBlurRegions(row),
        blurDefault: clampBlur(Number(row.blurDefault ?? BLUR_DEFAULT)),
      } as SnsPostDef
    })
    .filter((row): row is SnsPostDef => Boolean(row))
}

export function emptySnsCaptions(): CharacterLocaleText {
  return emptyCharacterLocaleText()
}

export function snsCaptionOf(post: SnsPostDef, locale: Locale | string | null | undefined) {
  const written = pickCharacterLocaleText(post.captions, locale)
  if (written) return written
  return snsCharacterLine(post.heat, captionLineOf(post), locale)
}

export function nextSnsPost(
  posts: SnsPostDef[],
  publishedIds: readonly string[],
  heat: SnsHeat,
): SnsPostDef | null {
  const used = new Set(publishedIds)
  const pool = posts.filter((post) => post.heat === heat && !used.has(post.id))
  if (pool.length === 0) return null
  return pool[rollInt(0, pool.length - 1)] ?? null
}

export function snsHeatProgress(
  posts: SnsPostDef[],
  publishedIds: readonly string[],
  heat: SnsHeat,
  pendingPostId?: string | null,
) {
  const usedIds = new Set(publishedIds)
  if (pendingPostId) usedIds.add(pendingPostId)
  const pool = posts.filter((post) => post.heat === heat)
  return {
    used: pool.filter((post) => usedIds.has(post.id)).length,
    total: pool.length,
  }
}

export function snsPostImageUrl(
  posts: SnsPostDef[],
  images: Array<{ id: string; url?: string }> | undefined,
  postId: string,
): string | null {
  return snsPostMedia(posts, images, undefined, postId)?.url ?? null
}

export function snsPostMedia(
  posts: SnsPostDef[],
  images: Array<{ id: string; url?: string }> | undefined,
  videos: Array<{ id: string; url?: string }> | undefined,
  postId: string,
): { kind: 'image' | 'video'; url: string } | null {
  const post = posts.find((row) => row.id === postId)
  if (!post) return null
  if (post.imageId) {
    const url = images?.find((image) => image.id === post.imageId)?.url
    if (url) return { kind: 'image', url }
  }
  if (post.videoId) {
    const url = videos?.find((video) => video.id === post.videoId)?.url
    if (url) return { kind: 'video', url }
  }
  return null
}

export function resolveSnsPending(heat: SnsHeat): {
  likes: number
  comments: SnsComment[]
  viewersGained: number
} {
  const likeBand = SNS_HEAT_LIKES[heat]
  const viewerBand = SNS_HEAT_VIEWERS[heat]
  return {
    likes: rollInt(likeBand.min, likeBand.max),
    comments: pickSnsComments(heat, rollInt(3, 4)),
    viewersGained: rollInt(viewerBand.min, viewerBand.max),
  }
}
