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

export type SnsHeat = 2 | 3

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

export const SNS_HEAT3_PITY_BASE = 0.1
export const SNS_HEAT3_PITY_STEP = 0.06
export const SNS_HEAT3_PITY_CAP = 0.34

/** 수위별 추첨 가중치. 둘 다 남아 있으면 수위 3은 1/5(20%). */
export const SNS_HEAT_WEIGHT: Record<SnsHeat, number> = {
  2: 4,
  3: 1,
}

/** 콘셉트와 수위에 따른 촬영비. 기본가는 절반, 파격적 화보(heat 3)는 그 5배. */
export function calcSnsPostCost(totalAssetCount: number, heat: SnsHeat = 2): number {
  const count = Math.max(1, Math.round(totalAssetCount))
  const baseCost = 6_000 + count * 600
  return heat === 3 ? baseCost * 5 : baseCost
}

export function normalizeSnsHeat3Pity(raw: unknown): number {
  const n = Math.round(Number(raw ?? 0) || 0)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

export function snsHeat3Chance(pity: number): number {
  return Math.min(
    SNS_HEAT3_PITY_CAP,
    SNS_HEAT3_PITY_BASE + Math.max(0, pity) * SNS_HEAT3_PITY_STEP,
  )
}

export type SnsComposeRoll = {
  post: SnsPostDef
  heat: SnsHeat
  nextPity: number
}

export function hasSnsComposeStock(
  posts: SnsPostDef[],
  publishedIds: readonly string[],
): boolean {
  return unpublishedSnsPosts(posts, publishedIds).length > 0
}

function unpublishedSnsPosts(
  posts: SnsPostDef[],
  publishedIds: readonly string[],
  heat?: SnsHeat,
): SnsPostDef[] {
  const used = new Set(publishedIds)
  return posts.filter((post) => !used.has(post.id) && (heat == null || post.heat === heat))
}

function snsStockKey(posts: SnsPostDef[], publishedIds: readonly string[]) {
  const used = [...publishedIds].sort().join('\n')
  const defs = posts.map((post) => `${post.id}:${post.heat}`).join('\n')
  return `${used}\n--\n${defs}`
}

const reservedSnsRolls = new Map<string, { key: string; roll: SnsComposeRoll }>()

/**
 * 남은 게시물을 수위 가중치로 고른다.
 * 수위 2와 3이 둘 다 있으면 수위 3 확률은 20%. 한 수위만 남으면 그 수위만 나온다.
 */
export function rollSnsCompose(
  posts: SnsPostDef[],
  publishedIds: readonly string[],
  pity: number,
): SnsComposeRoll | null {
  const options = ([2, 3] as const)
    .map((heat) => ({ heat, pool: unpublishedSnsPosts(posts, publishedIds, heat) }))
    .filter((row) => row.pool.length > 0)
  if (options.length === 0) return null

  const total = options.reduce((sum, row) => sum + SNS_HEAT_WEIGHT[row.heat], 0)
  let ticket = Math.random() * total
  let picked = options[options.length - 1]!
  for (const row of options) {
    ticket -= SNS_HEAT_WEIGHT[row.heat]
    if (ticket < 0) {
      picked = row
      break
    }
  }
  const post = picked.pool[rollInt(0, picked.pool.length - 1)]
  if (!post) return null
  return {
    post,
    heat: picked.heat,
    nextPity: picked.heat === 3 ? 0 : normalizeSnsHeat3Pity(pity) + 1,
  }
}

/** 견적과 실제 게시가 같은 결과를 쓰도록, 재고가 바뀌기 전까지 추첨을 유지한다. */
export function reserveSnsCompose(
  creatorId: string,
  posts: SnsPostDef[],
  publishedIds: readonly string[],
  pity: number,
): SnsComposeRoll | null {
  const key = snsStockKey(posts, publishedIds)
  const cached = reservedSnsRolls.get(creatorId)
  if (cached?.key === key) return cached.roll
  const roll = rollSnsCompose(posts, publishedIds, pity)
  if (!roll) {
    reservedSnsRolls.delete(creatorId)
    return null
  }
  reservedSnsRolls.set(creatorId, { key, roll })
  return roll
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

  if (cur >= targetMax) return 0

  const maxPossibleGain = targetMax - cur

  const baseGain =
    heat === 3
      ? rollInt(3_000, 8_000)
      : rollInt(500, 1_500)

  return Math.min(maxPossibleGain, Math.max(500, baseGain))
}

export const SNS_HEAT_VIEWERS: Record<SnsHeat, { min: number; max: number }> = {
  2: { min: 400, max: 800 },
  3: { min: 1_600, max: 3_200 },
}

export const SNS_HEAT_LIKES: Record<SnsHeat, { min: number; max: number }> = {
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
      return {
        postId,
        heat: normalizeSnsHeat(row.heat),
        likes: Number(row.likes) || 0,
        comments: normalizeSnsComments(row.comments ?? row.commentKeys),
        publishedMonth: Number(row.publishedMonth) || 0,
      } as SnsPublishedPost
    })
    .filter((row): row is SnsPublishedPost => Boolean(row))
}

export function normalizeSnsHeat(raw: unknown): SnsHeat {
  if (raw === 3 || raw === '3') return 3
  return 2
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

export type SnsComposeCandidate = {
  id: string
  snsPosts?: SnsPostDef[]
  snsPublishedIds?: readonly string[]
  snsPending?: SnsPendingPost | null
  snsHeat3Pity?: number
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

export type BulkSnsComposeResult = {
  entries: BulkSnsRevealEntry[]
  skippedNoFunds: number
}

export type PlannedSnsRoll = {
  creatorId: string
  postId: string
  heat: SnsHeat
  cost: number
  nextPity: number
}

export function previewBulkSnsCompose(
  creators: readonly SnsComposeCandidate[],
): BulkSnsComposePreview {
  const eligibleIds: string[] = []
  let skippedPending = 0
  let skippedNoStock = 0
  for (const creator of creators) {
    if (creator.snsPending) {
      skippedPending += 1
      continue
    }
    if (!hasSnsComposeStock(creator.snsPosts ?? [], creator.snsPublishedIds ?? [])) {
      skippedNoStock += 1
      continue
    }
    eligibleIds.push(creator.id)
  }
  return { eligibleIds, skippedPending, skippedNoStock }
}

/** 해당 캐릭터 SNS를 지금 등록할 수 있는지 (대기·스톡·자산) */
export function canComposeSnsCreator(
  creator: SnsComposeCandidate,
  assets: number,
): boolean {
  if (creator.snsPending) return false
  const posts = creator.snsPosts ?? []
  const rolled = reserveSnsCompose(
    creator.id,
    posts,
    creator.snsPublishedIds ?? [],
    creator.snsHeat3Pity ?? 0,
  )
  if (!rolled) return false
  return assets >= calcSnsPostCost(posts.length, rolled.heat)
}

export type BulkSnsComposePlan = {
  eligibleIds: string[]
  affordableIds: string[]
  rolls: PlannedSnsRoll[]
  totalCost: number
  fullCost: number
  skippedPending: number
  skippedNoStock: number
  skippedNoFunds: number
}

export function planBulkSnsCompose(
  creators: readonly SnsComposeCandidate[],
  assets: number,
): BulkSnsComposePlan {
  const preview = previewBulkSnsCompose(creators)
  const byId = new Map(creators.map((creator) => [creator.id, creator]))
  const affordableIds: string[] = []
  const rolls: PlannedSnsRoll[] = []
  let remaining = assets
  let totalCost = 0
  let fullCost = 0
  let skippedNoFunds = 0

  for (const id of preview.eligibleIds) {
    const creator = byId.get(id)
    if (!creator) continue
    const posts = creator.snsPosts ?? []
    const rolled = reserveSnsCompose(id, posts, creator.snsPublishedIds ?? [], creator.snsHeat3Pity ?? 0)
    if (!rolled) continue
    const cost = calcSnsPostCost(posts.length, rolled.heat)
    fullCost += cost
    if (remaining >= cost) {
      remaining -= cost
      totalCost += cost
      affordableIds.push(id)
      rolls.push({
        creatorId: id,
        postId: rolled.post.id,
        heat: rolled.heat,
        cost,
        nextPity: rolled.nextPity,
      })
    } else {
      skippedNoFunds += 1
    }
  }

  return {
    eligibleIds: preview.eligibleIds,
    affordableIds,
    rolls,
    totalCost,
    fullCost,
    skippedPending: preview.skippedPending,
    skippedNoStock: preview.skippedNoStock,
    skippedNoFunds,
  }
}

/** 일괄 SNS: 1명이라도 등록할 수 있는 자산이 있는지 */
export function canAffordBulkSnsCompose(
  creators: readonly SnsComposeCandidate[],
  assets: number,
): boolean {
  const plan = planBulkSnsCompose(creators, assets)
  return plan.affordableIds.length > 0
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
