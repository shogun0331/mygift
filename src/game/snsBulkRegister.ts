import { BLUR_DEFAULT } from '../events/BlurRegionEditor'
import type { CharacterImage, CharacterVideo, RegisteredCharacter } from './characters'
import { emptySnsCaptions, normalizeSnsPosts, type SnsHeat, type SnsPostDef } from './sns'
import { pickSnsCaptionLine } from './snsLines'

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function reservedMediaIds(character: RegisteredCharacter) {
  return new Set(
    [
      character.characterIconId,
      character.characterIllustrationId,
      character.profileImageId,
      character.profileVideoId,
    ].filter((id): id is string => Boolean(id)),
  )
}

function referencedSnsMediaIds(posts: SnsPostDef[]) {
  const ids = new Set<string>()
  for (const post of posts) {
    if (post.imageId) ids.add(post.imageId)
    if (post.videoId) ids.add(post.videoId)
  }
  return ids
}

function isSnsOwnedMedia(item: { keys?: string[] }) {
  const keys = item.keys ?? []
  return keys.includes('sns') && keys.every((key) => key === 'sns')
}

function dropUnusedSnsMedia<T extends { id: string; keys?: string[] }>(
  items: T[],
  posts: SnsPostDef[],
  character: RegisteredCharacter,
): T[] {
  const reserved = reservedMediaIds(character)
  const referenced = referencedSnsMediaIds(posts)
  return items.filter(
    (item) => reserved.has(item.id) || referenced.has(item.id) || !isSnsOwnedMedia(item),
  )
}

export type BulkSnsMode = 'append' | 'replace'

export function applyBulkSnsToCharacter(
  character: RegisteredCharacter,
  files: File[],
  heat: SnsHeat,
  mode: BulkSnsMode,
): {
  images: CharacterImage[]
  videos: CharacterVideo[]
  snsPosts: SnsPostDef[]
} {
  const basePosts = mode === 'replace' ? [] : normalizeSnsPosts(character.snsPosts)
  let images: CharacterImage[] = [...(character.images ?? [])]
  let videos: CharacterVideo[] = [...(character.videos ?? [])]

  if (mode === 'replace') {
    images = dropUnusedSnsMedia(images, basePosts, character)
    videos = dropUnusedSnsMedia(videos, basePosts, character)
  }

  const nextPosts: SnsPostDef[] = [...basePosts]

  for (const file of files) {
    const mediaId = createId()
    images.push({
      id: mediaId,
      file,
      fileSize: file.size,
      keys: ['sns'],
    })
    nextPosts.push({
      id: createId(),
      heat,
      imageId: mediaId,
      videoId: null,
      captions: emptySnsCaptions(),
      captionLine: pickSnsCaptionLine(heat),
      blurRegions: [],
      blurDefault: BLUR_DEFAULT,
    })
  }

  return {
    images: dropUnusedSnsMedia(images, nextPosts, character),
    videos: dropUnusedSnsMedia(videos, nextPosts, character),
    snsPosts: nextPosts.map((post) => ({
      ...post,
      captions: emptySnsCaptions(),
      captionLine: post.captionLine ?? pickSnsCaptionLine(post.heat),
    })),
  }
}

export function characterPayloadFromRegistered(
  character: RegisteredCharacter,
  media: ReturnType<typeof applyBulkSnsToCharacter>,
) {
  return {
    name: character.name,
    names: character.names,
    age: character.age,
    job: character.job,
    jobs: character.jobs,
    bust: character.bust,
    weight: character.weight,
    statType: character.statType,
    characterIconId: character.characterIconId ?? null,
    characterIllustrationId: character.characterIllustrationId ?? null,
    profileImageId: character.profileImageId ?? null,
    profileVideoId: character.profileVideoId ?? null,
    eventLinks: character.eventLinks,
    images: media.images,
    videos: media.videos.map((video) => ({
      ...video,
      level: video.level ?? 1,
      stage: video.stage ?? 1,
    })),
    snsPosts: media.snsPosts,
  }
}
