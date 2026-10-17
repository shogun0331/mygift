import {
  mergeCharacterLocaleText,
  primaryCharacterLocaleText,
  type CharacterLocaleText,
} from './characterLocales'
import { resolveMediaSrc } from './mediaUrl'

export const PLAYER_VN_CHARACTER_ID = 'player'

export const VN_STAGE_POSITIONS = ['left', 'center', 'right'] as const
export type VnStagePosition = (typeof VN_STAGE_POSITIONS)[number]

export const VN_STAGE_POSITION_LABEL: Record<VnStagePosition, string> = {
  left: '좌',
  center: '중앙',
  right: '우',
}

export type CharacterAssetRoot = 'characters' | 'vn_characters'

export type VnStandingImage = {
  id: string
  file?: File
  fileName?: string
  fileSize?: number
  url?: string
}

/** 비주얼 노벨에만 등장하는 캐릭터. 플레이어는 id가 player인 고정 항목이다. */
export type VnCharacter = {
  id: string
  name: string
  names: CharacterLocaleText
  vnImages: VnStandingImage[]
  mediaRevision?: number
}

export type VnStageSlot = {
  characterId: string
  imageId: string
  position: VnStagePosition
}

export type VnResolvedStanding = {
  key: string
  src: string
  position: VnStagePosition
  media: 'image'
  characterId: string
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function buildSafeFileName(mediaId: string, originalName: string) {
  const trimmed = (originalName || 'asset').trim()
  const lastDot = trimmed.lastIndexOf('.')
  const ext =
    lastDot >= 0 ? trimmed.slice(lastDot).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 12) : ''
  const rawBase = lastDot >= 0 ? trimmed.slice(0, lastDot) : trimmed
  const base =
    rawBase
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 48) || 'asset'
  return `${mediaId}__${base}${ext}`
}

export function vnStandingStorageUrl(
  ownerId: string,
  fileName: string,
  root: CharacterAssetRoot,
): string {
  if (root === 'characters') return `media://characters/${ownerId}/vn/${fileName}`
  return `media://vn_characters/${ownerId}/images/${fileName}`
}

export function vnStandingMediaUrl(
  ownerId: string,
  image: { fileName?: string; url?: string },
  root: CharacterAssetRoot,
): string {
  if (image.url?.startsWith('blob:') || image.url?.startsWith('data:')) return image.url
  if (image.fileName) return vnStandingStorageUrl(ownerId, image.fileName, root)
  return image.url || ''
}

export function normalizeVnImages(raw: unknown): VnStandingImage[] {
  if (!Array.isArray(raw)) return []
  const images: VnStandingImage[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const id = typeof row.id === 'string' && row.id.trim() ? row.id.trim() : createId()
    const fileName = typeof row.fileName === 'string' && row.fileName.trim() ? row.fileName.trim() : undefined
    const fileSize = Number(row.fileSize)
    const url = typeof row.url === 'string' ? row.url : undefined
    const file = typeof File !== 'undefined' && row.file instanceof File ? row.file : undefined
    if (!fileName && !url && !file) continue
    images.push({
      id,
      file,
      fileName,
      fileSize: Number.isFinite(fileSize) ? fileSize : undefined,
      url,
    })
  }
  return images
}

export function normalizeVnCharacter(raw: unknown): VnCharacter | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = typeof row.id === 'string' ? row.id.trim() : ''
  if (!id) return null
  const names = mergeCharacterLocaleText(
    row.names as Partial<CharacterLocaleText> | undefined,
    typeof row.name === 'string' ? row.name : '',
  )
  const name = primaryCharacterLocaleText(names) || (id === PLAYER_VN_CHARACTER_ID ? '플레이어' : id)
  const revision = Number(row.mediaRevision)
  return {
    id,
    name,
    names: { ...names, ko: names.ko || name },
    vnImages: normalizeVnImages(row.vnImages),
    mediaRevision: Number.isFinite(revision) ? revision : undefined,
  }
}

export function createPlayerVnCharacter(): VnCharacter {
  const names = mergeCharacterLocaleText(undefined, '플레이어')
  return {
    id: PLAYER_VN_CHARACTER_ID,
    name: '플레이어',
    names,
    vnImages: [],
  }
}

export function ensurePlayerVnCharacter(list: VnCharacter[]): VnCharacter[] {
  const existing = list.find((character) => character.id === PLAYER_VN_CHARACTER_ID)
  const player = existing
    ? {
        ...existing,
        id: PLAYER_VN_CHARACTER_ID,
        name: existing.name.trim() || '플레이어',
      }
    : createPlayerVnCharacter()
  return [player, ...list.filter((character) => character.id !== PLAYER_VN_CHARACTER_ID)]
}

export function normalizeVnStageSlots(raw: unknown): VnStageSlot[] {
  if (!Array.isArray(raw)) return []
  const used = new Set<VnStagePosition>()
  const slots: VnStageSlot[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const characterId = typeof row.characterId === 'string' ? row.characterId.trim() : ''
    const imageId = typeof row.imageId === 'string' ? row.imageId.trim() : ''
    const position = row.position
    if (!characterId) continue
    if (position !== 'left' && position !== 'center' && position !== 'right') continue
    if (used.has(position)) continue
    used.add(position)
    slots.push({ characterId, imageId, position })
    if (slots.length >= 2) break
  }
  return slots
}

export function firstFreeVnPosition(taken: Array<VnStagePosition | null | undefined>): VnStagePosition {
  const used = new Set(taken.filter((position): position is VnStagePosition => Boolean(position)))
  const preferred: VnStagePosition[] = ['center', 'left', 'right']
  return preferred.find((position) => !used.has(position)) ?? 'center'
}

type StandingOwner = {
  id: string
  vnImages?: VnStandingImage[] | null
}

export function resolveVnImageStandings(
  node: { stageSlots?: unknown },
  registered: StandingOwner[],
  vnCharacters: VnCharacter[],
): VnResolvedStanding[] | null {
  const slots = normalizeVnStageSlots(node.stageSlots)
  if (slots.length === 0) return null
  return slots.flatMap((slot) => {
    const registeredChar = registered.find((character) => character.id === slot.characterId)
    const vnChar = registeredChar
      ? null
      : vnCharacters.find((character) => character.id === slot.characterId)
    const images = registeredChar?.vnImages ?? vnChar?.vnImages ?? []
    const image = images.find((item) => item.id === slot.imageId)
    if (!image) return []
    const src = vnStandingMediaUrl(slot.characterId, image, registeredChar ? 'characters' : 'vn_characters')
    if (!src) return []
    return [
      {
        key: `${slot.position}:${slot.characterId}:${slot.imageId}:${image.fileName || image.url || ''}`,
        src,
        position: slot.position,
        media: 'image' as const,
        characterId: slot.characterId,
      },
    ]
  })
}

function hydrateVnImage(
  ownerId: string,
  image: VnStandingImage,
  root: CharacterAssetRoot,
): VnStandingImage {
  const stored = image.fileName ? vnStandingStorageUrl(ownerId, image.fileName, root) : image.url
  return {
    ...image,
    file: undefined,
    url: stored ? resolveMediaSrc(stored, image.fileSize) : '',
  }
}

export function hydrateVnCharacter(raw: unknown): VnCharacter | null {
  const character = normalizeVnCharacter(raw)
  if (!character) return null
  return {
    ...character,
    vnImages: character.vnImages.map((image) =>
      hydrateVnImage(character.id, image, 'vn_characters'),
    ),
  }
}

export async function loadVnCharactersFromDisk(): Promise<VnCharacter[]> {
  try {
    if (window.electronAPI?.loadVnCharactersJson) {
      const res = await window.electronAPI.loadVnCharactersJson()
      if (res?.success && Array.isArray(res.characters)) {
        return ensurePlayerVnCharacter(
          res.characters
            .map((row) => hydrateVnCharacter(row))
            .filter((row): row is VnCharacter => Boolean(row)),
        )
      }
    }
  } catch (err) {
    console.error('Failed to load VN characters from electron:', err)
  }

  try {
    const res = await fetch('/vn_characters/vn_characters.json')
    if (res.ok) {
      const parsed = await res.json()
      if (Array.isArray(parsed)) {
        return ensurePlayerVnCharacter(
          parsed
            .map((row) => hydrateVnCharacter(row))
            .filter((row): row is VnCharacter => Boolean(row)),
        )
      }
    }
  } catch (err) {
    console.warn('Failed to fetch vn_characters.json:', err)
  }

  return ensurePlayerVnCharacter([])
}

export function serializeVnCharacters(characters: VnCharacter[]) {
  return ensurePlayerVnCharacter(characters).map((character) => ({
    id: character.id,
    name: character.name,
    names: character.names,
    mediaRevision: character.mediaRevision,
    vnImages: character.vnImages.map((image) => ({
      id: image.id,
      fileName: image.fileName,
      fileSize: image.fileSize,
      url: image.fileName
        ? vnStandingStorageUrl(character.id, image.fileName, 'vn_characters')
        : image.url,
    })),
  }))
}

/** VN 전용 캐릭터 스탠딩을 vn_characters/{id}/images 에 저장한다. */
export async function persistVnOnlyCharacter(character: VnCharacter): Promise<VnCharacter> {
  const images = await persistStandingFiles(character.id, character.vnImages)
  if (window.electronAPI?.pruneCharacterFiles) {
    await window.electronAPI.pruneCharacterFiles(
      character.id,
      {
        image: images.map((image) => image.fileName).filter((name): name is string => Boolean(name)),
        video: [],
      },
      'vn_characters',
    )
  }
  return {
    ...character,
    vnImages: images,
    mediaRevision: Date.now(),
  }
}

async function persistStandingFiles(ownerId: string, images: VnStandingImage[]): Promise<VnStandingImage[]> {
  if (!window.electronAPI?.saveCharacterAssets) {
    return images.map((image) => ({ ...image }))
  }

  const assetsToSave: Array<{
    id: string
    fileName: string
    kind: 'image'
    buffer: ArrayBuffer
  }> = []
  const obsolete: string[] = []

  const next = await Promise.all(
    images.map(async (image) => {
      if (!image.file) {
        if (image.fileName) {
          return {
            ...image,
            file: undefined,
            url: resolveMediaSrc(
              vnStandingStorageUrl(ownerId, image.fileName, 'vn_characters'),
              image.fileSize,
            ),
          }
        }
        return { ...image, file: undefined }
      }
      const buffer = await image.file.arrayBuffer()
      const safeName = buildSafeFileName(image.id, image.file.name)
      if (image.fileName && image.fileName !== safeName) obsolete.push(image.fileName)
      assetsToSave.push({
        id: image.id,
        fileName: safeName,
        kind: 'image',
        buffer,
      })
      return {
        id: image.id,
        fileName: safeName,
        fileSize: image.file.size,
        url: resolveMediaSrc(
          vnStandingStorageUrl(ownerId, safeName, 'vn_characters'),
          image.file.size,
        ),
        file: undefined,
      }
    }),
  )

  if (assetsToSave.length > 0) {
    const res = await window.electronAPI.saveCharacterAssets(ownerId, assetsToSave, 'vn_characters')
    if (!res.success) {
      throw new Error(res.error || 'VN 캐릭터 이미지를 저장하지 못했습니다.')
    }
  }

  if (window.electronAPI.deleteCharacterFile) {
    const kept = new Set(next.map((image) => image.fileName).filter(Boolean))
    for (const fileName of obsolete) {
      if (kept.has(fileName)) continue
      await window.electronAPI.deleteCharacterFile(ownerId, 'image', fileName, 'vn_characters')
    }
  }

  return next
}
