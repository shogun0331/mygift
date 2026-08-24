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
  snsSubscribersGained?: number
}

/** 캐릭터의 전체 포스팅 개수에 연동된 동적 발주 비용 공식 (50% 가격 인하) */
export function calcSnsPostCost(heat: SnsHeat, totalAssetCount: number): number {
  const count = Math.max(1, Math.round(totalAssetCount))
  if (heat === 3) {
    return 60_000 + count * 6_000
  }
  if (heat === 2) {
    return 17_500 + count * 1_750
  }
  return 5_000 + count * 500
}

/** 수위별 기본 촬영/의상비 (1장 기준 하한 - 50% 인하) */
export const SNS_HEAT_COST: Record<SnsHeat, number> = {
  1: 5_500,
  2: 19_250,
  3: 66_000,
}

/** 캐릭터당 최대 모을 수 있는 영구 SNS 구독자 캡 (10만 명) */
export const MAX_CREATOR_SNS_SUBSCRIBERS = 100_000

/** 캐릭터별 SNS 발행 진행 비율 (%) 계산 */
export function calcCreatorSnsRatio(publishedCount: number, totalAssetCount: number): number {
  if (!totalAssetCount || totalAssetCount <= 0) return 0
  return Math.min(1.0, Math.max(0, publishedCount / totalAssetCount))
}

/** SNS 발주 시 모이는 신규 SNS 구독자 스탯 계산 (최대 10만 명 캡 적용) */
export function calcSnsSubscribersGain(
  currentSubscribers: number,
  heat: SnsHeat,
  publishedCount: number,
  totalAssetCount: number,
): number {
  const cur = Math.max(0, currentSubscribers)
  if (cur >= MAX_CREATOR_SNS_SUBSCRIBERS) return 0

  const ratio = calcCreatorSnsRatio(publishedCount + 1, totalAssetCount)
  const targetMax = Math.round(MAX_CREATOR_SNS_SUBSCRIBERS * Math.pow(ratio, 0.85))

  const baseGain =
    heat === 3
      ? rollInt(3_000, 8_000)
      : heat === 2
        ? rollInt(500, 1_500)
        : rollInt(200, 600)

  const allowedGain = Math.max(0, targetMax - cur)
  return Math.min(baseGain, allowedGain)
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

export type SnsComposeCandidate = {
  id: string
  snsPosts?: SnsPostDef[]
  snsPublishedIds?: readonly string[]
  snsPending?: SnsPendingPost | null
}

export type BulkSnsComposePreview = {
  eligibleIds: string[]
  skippedPending: number
  skippedNoStock: number
}

export type BulkSnsRevealEntry = {
  creatorId: string
  postId: string
  heat: SnsHeat
  displayName: string
  avatarUrl?: string | null
  caption: string
  media: { kind: 'image' | 'video'; url: string } | null
  blurRegions: BlurRegion[]
}

export function previewBulkSnsCompose(
  creators: readonly SnsComposeCandidate[],
  heat: SnsHeat,
): BulkSnsComposePreview {
  const eligibleIds: string[] = []
  let skippedPending = 0
  let skippedNoStock = 0
  for (const creator of creators) {
    if (creator.snsPending) {
      skippedPending += 1
      continue
    }
    const post = nextSnsPost(creator.snsPosts ?? [], creator.snsPublishedIds ?? [], heat)
    if (!post) {
      skippedNoStock += 1
      continue
    }
    eligibleIds.push(creator.id)
  }
  return { eligibleIds, skippedPending, skippedNoStock }
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
