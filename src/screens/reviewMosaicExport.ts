import JSZip from 'jszip'
import { readBlurRegions } from '../events/BlurRegionEditor'
import { bakeReviewMedia, isVideoFileName } from '../events/mosaicBake'
import type { MosaicFit } from '../events/mosaicMath'
import { COMMON_EVENT_SLOTS, type CommonEventLinks } from '../events/commonEventLinks'
import type { BlurRegion, EventMediaAsset, GameEvent } from '../events/types'
import {
  normalizeAuditMedia,
  normalizeSpecialVacation,
  type CharacterImage,
  type CharacterVideo,
  type RegisteredCharacter,
} from '../game/characters'
import { characterMediaUrl } from '../game/mediaUrl'
import { snsPostMedia } from '../game/sns'
import type { StationGradeConfig } from '../game/stationGradeConfig'
import { loadHighLowConfigFromDisk } from '../minigames/highlow/highLowStore'
import type { HighLowRoomId } from '../minigames/highlow/highLowConfig'

export type ReviewExportItem = {
  folder: string
  nameHint: string
  url: string
  kind: 'image' | 'video'
  regions: BlurRegion[]
  label: string
  /** VN·심사 화면은 cover, SNS 원본 비율은 fill */
  fit?: MosaicFit
}

export type ReviewExportProgress = {
  current: number
  total: number
  label: string
}

export type ReviewExportResult = {
  blob: Blob
  fileCount: number
  failures: string[]
}

function safePart(value: string, fallback = 'item'): string {
  const cleaned = Array.from(String(value || ''))
    .map((ch) => {
      const code = ch.charCodeAt(0)
      if (code < 32 || '<>:"/\\|?*'.includes(ch)) return '_'
      return ch
    })
    .join('')
    .replace(/\s+/g, '_')
    .slice(0, 80)
  return cleaned || fallback
}

function uniqueZipPath(used: Set<string>, folder: string, fileName: string): string {
  const dir = folder.replace(/\/+$/, '')
  const baseName = safePart(fileName, 'media')
  let path = `${dir}/${baseName}`
  if (!used.has(path)) {
    used.add(path)
    return path
  }
  const dot = baseName.lastIndexOf('.')
  const stem = dot >= 0 ? baseName.slice(0, dot) : baseName
  const ext = dot >= 0 ? baseName.slice(dot) : ''
  let i = 2
  while (used.has(`${dir}/${stem}_${i}${ext}`)) i += 1
  path = `${dir}/${stem}_${i}${ext}`
  used.add(path)
  return path
}

function walkNodes(nodes: unknown[], visit: (node: Record<string, unknown>) => void) {
  for (const raw of nodes ?? []) {
    if (!raw || typeof raw !== 'object') continue
    const node = raw as Record<string, unknown>
    visit(node)
    if (Array.isArray(node.nodes)) walkNodes(node.nodes, visit)
    if (node.type === 'event' && Array.isArray(node.nodes)) {
      // already visited via node.nodes
    }
  }
}

function nodeImageName(node: Record<string, unknown>): string | null {
  if (typeof node.image === 'string' && node.image.trim()) return node.image.trim()
  if (node.type === 'custom' && Array.isArray(node.fields)) {
    for (const field of node.fields) {
      if (
        field &&
        typeof field === 'object' &&
        (field as { value_type?: string }).value_type === 'image' &&
        typeof (field as { value?: unknown }).value === 'string'
      ) {
        const value = String((field as { value: string }).value).trim()
        if (value) return value
      }
    }
  }
  return null
}

function resolveEventMedia(event: GameEvent, fileName: string): { url: string; kind: 'image' | 'video' } | null {
  const target = fileName.replace(/\\/g, '/').split('/').pop() || fileName
  const asset: EventMediaAsset | undefined = event.media.find((item) => {
    if (item.kind === 'sound') return false
    return item.fileName === fileName || item.fileName === target || item.fileName.endsWith(`/${target}`)
  })
  if (asset?.url) {
    return { url: asset.url, kind: asset.kind === 'video' ? 'video' : 'image' }
  }
  if (fileName.startsWith('media://') || fileName.startsWith('/') || fileName.startsWith('blob:')) {
    return { url: fileName, kind: isVideoFileName(fileName) ? 'video' : 'image' }
  }
  return null
}

function collectEventGraphics(event: GameEvent, folder: string): ReviewExportItem[] {
  const items: ReviewExportItem[] = []
  let index = 0
  walkNodes(event.nodes ?? [], (node) => {
    const fileName = nodeImageName(node)
    if (!fileName) return
    const resolved = resolveEventMedia(event, fileName)
    if (!resolved) return
    index += 1
    const base = fileName.replace(/\\/g, '/').split('/').pop() || `node_${index}`
    items.push({
      folder,
      nameHint: `${String(index).padStart(3, '0')}_${base}`,
      url: resolved.url,
      kind: resolved.kind,
      regions: readBlurRegions(node),
      label: `${event.title || event.id} / ${base}`,
      fit: 'cover',
    })
  })
  return items
}

function characterImageUrl(character: RegisteredCharacter, image?: CharacterImage | null): string | null {
  if (!image) return null
  if (character.id && image.fileName && !image.file) {
    return characterMediaUrl(character.id, 'image', image.fileName)
  }
  if (image.url) return image.url
  if (character.id && image.fileName) return characterMediaUrl(character.id, 'image', image.fileName)
  return null
}

function characterVideoUrl(character: RegisteredCharacter, video?: CharacterVideo | null): string | null {
  if (!video) return null
  if (character.id && video.fileName && !video.file) {
    return characterMediaUrl(character.id, 'video', video.fileName)
  }
  if (video.url) return video.url
  if (character.id && video.fileName) return characterMediaUrl(character.id, 'video', video.fileName)
  return null
}

function charFolder(character: RegisteredCharacter): string {
  return `characters/${safePart(character.id || character.name, 'character')}`
}

function collectCharacterItems(characters: RegisteredCharacter[]): ReviewExportItem[] {
  const items: ReviewExportItem[] = []
  for (const character of characters) {
    const root = charFolder(character)
    const posts = character.snsPosts ?? []
    for (const post of posts) {
      let media: { kind: 'image' | 'video'; url: string } | null = null
      if (post.imageId) {
        const image = (character.images ?? []).find((row) => row.id === post.imageId)
        const url = characterImageUrl(character, image)
        if (url) media = { kind: 'image', url }
      }
      if (!media && post.videoId) {
        const video = (character.videos ?? []).find((row) => row.id === post.videoId)
        const url = characterVideoUrl(character, video)
        if (url) media = { kind: 'video', url }
      }
      if (!media) {
        const fallback = snsPostMedia(posts, character.images, character.videos, post.id)
        if (fallback?.url) media = fallback
      }
      if (!media?.url) continue
      const hint = media.url.replace(/\\/g, '/').split('/').pop() || post.id
      items.push({
        folder: `${root}/sns`,
        nameHint: `${safePart(post.id)}_${hint}`,
        url: media.url,
        kind: media.kind,
        regions: readBlurRegions(post),
        label: `${character.name} SNS ${post.id}`,
        fit: 'fill',
      })
    }

    const vacation = normalizeSpecialVacation(character.specialVacation, character.name)
    vacation.imageIds.forEach((imageId, index) => {
      const image = (character.images ?? []).find((row) => row.id === imageId)
      const url = characterImageUrl(character, image)
      if (!url) return
      const hint = image?.fileName || image?.id || `vacation_${index + 1}`
      items.push({
        folder: `${root}/vacation`,
        nameHint: `${String(index + 1).padStart(2, '0')}_${hint}`,
        url,
        kind: 'image',
        regions: [],
        label: `${character.name} 특별휴가 ${index + 1}`,
      })
    })

    ;(character.videos ?? []).forEach((video, index) => {
      const url = characterVideoUrl(character, video)
      if (!url) return
      const hint = video.fileName || video.id || `broadcast_${index + 1}`
      const tag = video.keys?.includes('idle') ? 'idle' : `lv${video.level || 1}_st${video.stage || 1}`
      items.push({
        folder: `${root}/broadcast`,
        nameHint: `${String(index + 1).padStart(2, '0')}_${tag}_${hint}`,
        url,
        kind: 'video',
        regions: [],
        label: `${character.name} 방송 ${hint}`,
      })
    })

    const audit = normalizeAuditMedia(character.auditMedia)
    for (const slot of ['A', 'B', 'C'] as const) {
      const row = audit[slot]
      if (!row.url) continue
      const hint = row.url.replace(/\\/g, '/').split('/').pop() || `audit_${slot}`
      items.push({
        folder: `${root}/audit`,
        nameHint: `${slot}_${hint}`,
        url: row.url,
        kind: isVideoFileName(row.url) ? 'video' : 'image',
        regions: readBlurRegions(row),
        label: `${character.name} 승급퍼포먼스 ${slot}`,
        fit: 'cover',
      })
    }

    const shorts = character.shortsVn
    if (shorts) {
      for (const slot of ['vip', 'h'] as const) {
        const beats = shorts[slot] ?? []
        beats.forEach((beat, index) => {
          if (!beat.mediaUrl) return
          const hint = beat.mediaUrl.replace(/\\/g, '/').split('/').pop() || `${slot}_${index + 1}`
          items.push({
            folder: `${root}/shortsVn/${slot}`,
            nameHint: `${String(index + 1).padStart(2, '0')}_${hint}`,
            url: beat.mediaUrl,
            kind: isVideoFileName(beat.mediaUrl) ? 'video' : 'image',
            regions: readBlurRegions(beat),
            label: `${character.name} 숏츠 ${slot} ${index + 1}`,
            fit: 'cover',
          })
        })
      }
    }
  }
  return items
}

function collectJudgeItems(config: StationGradeConfig): ReviewExportItem[] {
  const items: ReviewExportItem[] = []
  const judges = config.auditConfig?.judges ?? []
  judges.forEach((judge, judgeIndex) => {
    const folder = `audit-judges/${safePart(judge.targetTier || 'all')}/${safePart(judge.id || `judge_${judgeIndex + 1}`)}`
    const push = (name: string, url?: string | null, regions?: BlurRegion[]) => {
      if (!url) return
      const hint = url.replace(/\\/g, '/').split('/').pop() || name
      items.push({
        folder,
        nameHint: `${name}_${hint}`,
        url,
        kind: isVideoFileName(url) ? 'video' : 'image',
        regions: readBlurRegions({ blurRegions: regions || [] }),
        label: `심사관 ${judge.name || judge.id} ${name}`,
        fit: 'cover',
      })
    }
    push('avatar', judge.avatarUrl, judge.avatarBlurRegions)
    push('success', judge.successMediaUrl, judge.successBlurRegions)
    push('fail', judge.failMediaUrl, judge.failBlurRegions)
    const slots = judge.auditMedia
    if (slots) {
      for (const key of ['A', 'B', 'C'] as const) {
        const raw = slots[key]
        if (!raw) continue
        if (typeof raw === 'string') {
          push(`perf_${key}`, raw, [])
        } else {
          push(`perf_${key}`, raw.url, raw.blurRegions)
        }
      }
    }
  })
  return items
}

function collectHighLowItems(config: Awaited<ReturnType<typeof loadHighLowConfigFromDisk>>): ReviewExportItem[] {
  const items: ReviewExportItem[] = []
  const rooms: HighLowRoomId[] = ['local', 'star', 'legend']
  for (const roomId of rooms) {
    const room = config[roomId]
    if (!room) continue
    const folder = `highlow/${roomId}`
    const seen = new Set<string>()
    const push = (name: string, url?: string, type?: 'image' | 'video') => {
      if (!url || seen.has(url)) return
      seen.add(url)
      const hint = url.replace(/\\/g, '/').split('/').pop() || name
      items.push({
        folder,
        nameHint: `${name}_${hint}`,
        url,
        kind: type === 'video' || isVideoFileName(url) ? 'video' : 'image',
        regions: [],
        label: `하이로우 ${roomId} ${name}`,
      })
    }
    const stages = room.dealerMediaStages
    push('tier1', stages?.tier1?.url || room.dealerMediaUrl, stages?.tier1?.type || room.dealerMediaType)
    push('tier2', stages?.tier2?.url, stages?.tier2?.type)
    push('tier3', stages?.tier3?.url, stages?.tier3?.type)
    if (!stages?.tier1?.url) push('dealer', room.dealerMediaUrl, room.dealerMediaType)
  }
  return items
}

export async function collectReviewMosaicItems(input: {
  events: GameEvent[]
  characters: RegisteredCharacter[]
  commonEventLinks: CommonEventLinks
  stationGradeConfig: StationGradeConfig
}): Promise<ReviewExportItem[]> {
  const items: ReviewExportItem[] = []
  for (const event of input.events) {
    items.push(...collectEventGraphics(event, `events/${safePart(event.id)}`))
  }
  for (const slot of COMMON_EVENT_SLOTS) {
    const eventId = input.commonEventLinks[slot.key]
    if (!eventId) continue
    const event = input.events.find((row) => row.id === eventId)
    if (!event) continue
    items.push(...collectEventGraphics(event, `common-events/${slot.key}`))
  }
  items.push(...collectCharacterItems(input.characters))
  items.push(...collectJudgeItems(input.stationGradeConfig))
  const highLow = await loadHighLowConfigFromDisk()
  items.push(...collectHighLowItems(highLow))
  return items.filter((item) => Boolean(item.url))
}

export async function buildReviewMosaicZip(
  items: ReviewExportItem[],
  blockPx: number,
  onProgress?: (progress: ReviewExportProgress) => void,
): Promise<ReviewExportResult> {
  const zip = new JSZip()
  const used = new Set<string>()
  const failures: string[] = []
  const bakedCount = { value: 0 }
  const copiedCount = { value: 0 }

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]!
    onProgress?.({ current: i + 1, total: items.length, label: item.label })
    try {
      const baked = await bakeReviewMedia({
        url: item.url,
        kind: item.kind,
        regions: item.regions,
        blockPx,
        nameHint: item.nameHint,
        fit: item.fit ?? 'fill',
      })
      const path = uniqueZipPath(used, item.folder, baked.fileName)
      zip.file(path, baked.blob)
      if (baked.baked) bakedCount.value += 1
      else copiedCount.value += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(`${item.label}: ${message}`)
    }
    await new Promise((resolve) => window.setTimeout(resolve, 0))
  }

  const manifest = {
    mosaicBlockPx: blockPx,
    mosaicMode: 'dlsite-long-side',
    createdAt: new Date().toISOString(),
    totalItems: items.length,
    written: used.size,
    baked: bakedCount.value,
    copiedOriginal: copiedCount.value,
    failures,
    note: '모자이크 셀은 파일 긴 변÷100(최소 4px)입니다. VN/심사는 16:9 cover 좌표를 사용합니다. 모자이크가 있는 영상은 무음 WebM으로 다시 인코딩됩니다.',
  }
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  return { blob, fileCount: used.size, failures }
}

export function downloadBlob(blob: Blob, fileName: string) {
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(href), 30_000)
}

export function reviewZipFileName(blockPx: number) {
  const now = new Date()
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('')
  const tag = blockPx < 0 ? 'adaptive' : blockPx === 0 ? 'adaptive' : `${blockPx}px`
  return `review-mosaic-${stamp}-${tag}.zip`
}
