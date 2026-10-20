import type { EventMediaAsset, GameEvent } from '../events/types'
import { lookupLocalizedString, normalizeEventLocale } from '../events/eventLocales'
import { commonSoundMediaPath, resolveMediaSrc } from './mediaUrl'
import type { RegisteredCharacter, ShortsVnBeat, ShortsVnStanding } from './characters'
import {
  resolveVnImageStandings,
  type VnCharacter,
  type VnStagePosition,
} from './vnCharacters'
import { getCurrentLocale } from '../locales/i18n'

export type ShortsDialogueOption = {
  id: string
  preview: string
  type: string
  hasVoice: boolean
}

function flattenEventNodes(nodes: any[]): any[] {
  const result: any[] = []
  const visit = (list: any[]) => {
    for (const node of list ?? []) {
      if (!node) continue
      result.push(node)
      if (node.type === 'event' && Array.isArray(node.nodes)) visit(node.nodes)
      else if (Array.isArray(node.nodes)) visit(node.nodes)
    }
  }
  visit(nodes)
  return result
}

function baseFileName(value: string) {
  const clean = String(value || '').split('?')[0].replace(/\\/g, '/')
  try {
    return decodeURIComponent(clean.split('/').pop() || '')
  } catch {
    return clean.split('/').pop() || ''
  }
}

export function getShortsNodeDialogueText(
  node: any,
  localization: Record<string, Record<string, string>> | undefined,
  lang: string,
): string {
  if (!node || node.type === 'graphic' || node.type === 'vn' || node.type === 'fade' || node.type === 'sound') {
    return ''
  }
  const locale = normalizeEventLocale(lang)
  const keys = [
    node.text_key,
    node.dialogue_key,
    node.key,
    node.id,
    node.message_key,
    node.dialogue,
    node.text,
  ]
  const mapped = lookupLocalizedString(localization ?? {}, locale, keys)
  if (mapped) return mapped

  if (typeof node.text === 'string') return node.text
  if (typeof node.dialogue === 'string') return node.dialogue
  if (typeof node.message === 'string') return node.message
  if (typeof node.content === 'string') return node.content

  if (node.text && typeof node.text === 'object') {
    return String(node.text[locale] || node.text.ko || Object.values(node.text)[0] || '')
  }
  if (node.dialogue && typeof node.dialogue === 'object') {
    return String(node.dialogue[locale] || node.dialogue.ko || Object.values(node.dialogue)[0] || '')
  }

  return ''
}

export function resolveShortsNodeVoiceFileName(node: any, lang?: string): string | null {
  if (!node || node.type === 'graphic' || node.type === 'vn' || node.type === 'fade' || node.type === 'sound') {
    return null
  }
  if (typeof node.voice === 'string' && node.voice.trim()) {
    return baseFileName(node.voice.trim()) || node.voice.trim()
  }
  if (node.voice && typeof node.voice === 'object') {
    const locale = normalizeEventLocale(lang || getCurrentLocale())
    const direct = node.voice[locale]
    if (typeof direct === 'string' && direct.trim()) {
      return baseFileName(direct.trim()) || direct.trim()
    }
    const first = Object.values(node.voice).find((v) => typeof v === 'string' && String(v).trim())
    if (typeof first === 'string' && first.trim()) {
      return baseFileName(first.trim()) || first.trim()
    }
  }
  if (typeof node.sound === 'string' && node.sound.trim() && node.type !== 'sound') {
    return baseFileName(node.sound.trim()) || node.sound.trim()
  }
  return null
}

function findMediaAsset(fileName: string, media: EventMediaAsset[]): EventMediaAsset | null {
  if (!fileName) return null
  const fn = baseFileName(fileName).toLowerCase().trim() || fileName.toLowerCase().trim()
  return (
    media.find((m) => baseFileName(m.fileName).toLowerCase().trim() === fn) ||
    media.find((m) => m.fileName.toLowerCase().trim() === fileName.toLowerCase().trim()) ||
    null
  )
}

export function resolveShortsVoiceAsset(
  fileName: string | null | undefined,
  eventMedia: EventMediaAsset[] | null | undefined,
  commonSounds: EventMediaAsset[] = [],
): EventMediaAsset | null {
  if (!fileName) return null
  return findMediaAsset(fileName, eventMedia ?? []) || findMediaAsset(fileName, commonSounds)
}

export function resolveShortsVoiceSrc(asset: EventMediaAsset | null): string {
  if (!asset) return ''
  if (asset.url) return resolveMediaSrc(asset.url)
  if (asset.fileName) return resolveMediaSrc(commonSoundMediaPath(asset.fileName))
  return ''
}

function nodeIdentity(node: any): string | null {
  if (typeof node?.id === 'string' && node.id.trim()) return node.id.trim()
  if (typeof node?.key === 'string' && node.key.trim()) return node.key.trim()
  return null
}

export function findEventNodeById(event: GameEvent | null | undefined, nodeId: string | null | undefined) {
  const id = typeof nodeId === 'string' ? nodeId.trim() : ''
  if (!event || !id) return null
  return flattenEventNodes(event.nodes ?? []).find((node) => nodeIdentity(node) === id) ?? null
}

function isVideoFileName(name: string | null | undefined): boolean {
  if (!name) return false
  const clean = name.split('?')[0].toLowerCase()
  return /\.(mp4|webm|ogv|ogg|mov|mkv|m4v)$/.test(clean) || clean.startsWith('data:video')
}

export function listShortsDialogueOptions(
  event: GameEvent | null | undefined,
  lang: string = normalizeEventLocale(getCurrentLocale()),
  includeVnNodes: boolean = true,
): ShortsDialogueOption[] {
  if (!event) return []
  const localization = event.localization ?? {}
  const out: ShortsDialogueOption[] = []
  const seen = new Set<string>()
  for (const node of flattenEventNodes(event.nodes ?? [])) {
    const id = nodeIdentity(node)
    if (!id || seen.has(id)) continue
    let preview = getShortsNodeDialogueText(node, localization, lang).trim()
    if (!preview && includeVnNodes && node.type === 'vn') {
      const parts = [
        node.background ? `배경: ${baseFileName(node.background)}` : '',
        node.character ? `캐릭터: ${baseFileName(node.character)}` : '',
        node.characterPlate ? `플레이트: ${baseFileName(node.characterPlate)}` : '',
      ].filter(Boolean)
      preview = `[VN 무대] ${parts.join(' · ') || id}`
    }
    if (!preview) continue
    seen.add(id)
    out.push({
      id,
      preview,
      type: typeof node.type === 'string' ? node.type : 'node',
      hasVoice: Boolean(resolveShortsNodeVoiceFileName(node, lang)),
    })
  }
  return out
}

export function standingLayoutClass(position?: VnStagePosition, aloneCenter?: boolean): string {
  const base = 'pointer-events-none absolute bottom-0 h-[84%]'
  if (aloneCenter || position === 'center' || !position) {
    return `${base} left-1/2 w-[48%] -translate-x-1/2`
  }
  if (position === 'left') return `${base} left-[2%] w-[40%]`
  if (position === 'right') return `${base} right-[2%] w-[40%]`
  return `${base} left-1/2 w-[40%] -translate-x-1/2`
}

export type ShortsVnNodeOption = {
  id: string
  backgroundName: string | null
  characterName: string | null
  plateName: string | null
  backgroundUrl: string | null
  characterUrl: string | null
  plateUrl: string | null
  standings: ShortsVnStanding[]
  isCharacterVideo: boolean
  nextDialogueNodeId: string | null
  dialoguePreview: string
  hasVoice: boolean
  rawNode: any
}

export function listShortsVnNodes(
  event: GameEvent | null | undefined,
  lang: string = normalizeEventLocale(getCurrentLocale()),
  registeredCharacters?: RegisteredCharacter[],
  vnCharacters?: VnCharacter[],
): ShortsVnNodeOption[] {
  if (!event) return []
  const allNodes = flattenEventNodes(event.nodes ?? [])
  const localization = event.localization ?? {}
  const media = event.media ?? []
  const out: ShortsVnNodeOption[] = []
  const seen = new Set<string>()

  for (let i = 0; i < allNodes.length; i++) {
    const node = allNodes[i]
    if (!node || node.type !== 'vn') continue
    const id = nodeIdentity(node)
    if (!id || seen.has(id)) continue
    seen.add(id)

    const backgroundName =
      typeof node.background === 'string' && node.background.trim()
        ? node.background.trim()
        : null
    const plateName =
      typeof node.characterPlate === 'string' && node.characterPlate.trim()
        ? node.characterPlate.trim()
        : null
    const legacyCharName =
      typeof node.character === 'string' && node.character.trim()
        ? node.character.trim()
        : null

    const bgAsset = backgroundName ? findMediaAsset(backgroundName, media) : null
    const plateAsset = plateName ? findMediaAsset(plateName, media) : null
    const legacyAsset = !plateAsset && legacyCharName ? findMediaAsset(legacyCharName, media) : null

    // 1. Resolve image standings from modern stageSlots (preferred)
    const imageStandings = plateAsset
      ? []
      : resolveVnImageStandings(node, registeredCharacters ?? [], vnCharacters ?? [])

    let standings: ShortsVnStanding[] = []
    let characterUrl: string | null = null
    let isCharacterVideo = false
    let resolvedCharName: string | null = null

    if (imageStandings && imageStandings.length > 0) {
      standings = imageStandings.map((standing) => ({
        key: standing.key,
        src: standing.src,
        position: standing.position,
        media: 'image' as const,
        characterId: standing.characterId,
      }))
      characterUrl = standings[0]?.src ?? null
      const names = imageStandings
        .map((s) => {
          const reg = registeredCharacters?.find((c) => c.id === s.characterId)
          if (reg) return reg.name
          const vn = vnCharacters?.find((c) => c.id === s.characterId)
          return vn?.name || s.characterId
        })
        .filter(Boolean)
      resolvedCharName = names.length > 0 ? names.join(', ') : null
    } else if (legacyAsset?.url) {
      isCharacterVideo = isVideoFileName(legacyAsset.fileName) || isVideoFileName(legacyAsset.url)
      characterUrl = legacyAsset.url
      resolvedCharName = legacyAsset.fileName || legacyCharName
      standings = [
        {
          key: legacyAsset.fileName || legacyCharName || 'legacy-char',
          src: legacyAsset.url,
          position: 'center',
          media: isCharacterVideo ? 'video' : 'image',
        },
      ]
    } else if (plateAsset?.url) {
      resolvedCharName = plateAsset.fileName || plateName
    }

    let nextDialogueNodeId: string | null = null
    let dialoguePreview = ''
    let hasVoice = false
    for (let j = i + 1; j < allNodes.length; j++) {
      const nextNode = allNodes[j]
      if (!nextNode) continue
      if (nextNode.type === 'vn' || nextNode.type === 'graphic') break
      const text = getShortsNodeDialogueText(nextNode, localization, lang).trim()
      if (text) {
        nextDialogueNodeId = nodeIdentity(nextNode)
        dialoguePreview = text
        hasVoice = Boolean(resolveShortsNodeVoiceFileName(nextNode, lang))
        break
      }
    }

    out.push({
      id,
      backgroundName,
      characterName: resolvedCharName,
      plateName,
      backgroundUrl: bgAsset?.url ?? null,
      characterUrl,
      plateUrl: plateAsset?.url ?? null,
      standings,
      isCharacterVideo,
      nextDialogueNodeId,
      dialoguePreview,
      hasVoice,
      rawNode: node,
    })
  }
  return out
}

export type ResolvedShortsVnStage = {
  isVn: boolean
  backgroundSrc: string
  characterSrc: string | null
  plateSrc: string | null
  standings: ShortsVnStanding[]
  isCharacterVideo: boolean
  nodeId: string | null
  backgroundName: string | null
  characterName: string | null
  plateName: string | null
}

export function resolveShortsBeatVnStage(
  beat: ShortsVnBeat | null | undefined,
  event: GameEvent | null | undefined,
  registeredCharacters?: RegisteredCharacter[],
  vnCharacters?: VnCharacter[],
): ResolvedShortsVnStage {
  if (!beat) {
    return {
      isVn: false,
      backgroundSrc: '',
      characterSrc: null,
      plateSrc: null,
      standings: [],
      isCharacterVideo: false,
      nodeId: null,
      backgroundName: null,
      characterName: null,
      plateName: null,
    }
  }

  const media = event?.media ?? []
  let foundVnNode: any = null
  if (beat.sourceNodeId && event) {
    const node = findEventNodeById(event, beat.sourceNodeId)
    if (node && node.type === 'vn') {
      foundVnNode = node
    }
  }

  const hasExplicitVnAssets = Boolean(
    beat.characterUrl || beat.plateUrl || (beat.standings && beat.standings.length > 0),
  )

  if (!foundVnNode && !hasExplicitVnAssets) {
    return {
      isVn: false,
      backgroundSrc: resolveMediaSrc(beat.mediaUrl),
      characterSrc: null,
      plateSrc: null,
      standings: [],
      isCharacterVideo: false,
      nodeId: beat.sourceNodeId ?? null,
      backgroundName: null,
      characterName: null,
      plateName: null,
    }
  }

  const bgName =
    typeof foundVnNode?.background === 'string' && foundVnNode.background.trim()
      ? foundVnNode.background.trim()
      : null
  const plateName =
    typeof foundVnNode?.characterPlate === 'string' && foundVnNode.characterPlate.trim()
      ? foundVnNode.characterPlate.trim()
      : null
  const legacyCharName =
    typeof foundVnNode?.character === 'string' && foundVnNode.character.trim()
      ? foundVnNode.character.trim()
      : null

  const bgAsset = bgName ? findMediaAsset(bgName, media) : null
  const plateAsset = plateName ? findMediaAsset(plateName, media) : null
  const legacyAsset = !plateAsset && legacyCharName ? findMediaAsset(legacyCharName, media) : null

  // 1. Resolve image standings from modern stageSlots first
  let standings: ShortsVnStanding[] = []
  if (foundVnNode) {
    const imageStandings = plateAsset
      ? []
      : resolveVnImageStandings(foundVnNode, registeredCharacters ?? [], vnCharacters ?? [])
    if (imageStandings && imageStandings.length > 0) {
      standings = imageStandings.map((st) => ({
        key: st.key,
        src: resolveMediaSrc(st.src),
        position: st.position,
        media: 'image' as const,
        characterId: st.characterId,
      }))
    } else if (legacyAsset?.url) {
      const isVideo = isVideoFileName(legacyAsset.fileName) || isVideoFileName(legacyAsset.url)
      standings = [
        {
          key: legacyAsset.fileName || legacyCharName || 'legacy-char',
          src: resolveMediaSrc(legacyAsset.url),
          position: 'center',
          media: isVideo ? 'video' : 'image',
        },
      ]
    }
  }

  // 2. Fallback to beat's stored standings or characterUrl
  if (standings.length === 0) {
    if (beat.standings && beat.standings.length > 0) {
      standings = beat.standings.map((st) => ({
        ...st,
        src: resolveMediaSrc(st.src),
      }))
    } else if (beat.characterUrl) {
      const isVideo = isVideoFileName(beat.characterUrl)
      standings = [
        {
          key: beat.characterUrl,
          src: resolveMediaSrc(beat.characterUrl),
          position: 'center',
          media: isVideo ? 'video' : 'image',
        },
      ]
    }
  }

  const bgUrl = bgAsset?.url || beat.mediaUrl
  const plateUrl = beat.plateUrl || plateAsset?.url || null
  const characterSrc = standings[0]?.src || (beat.characterUrl ? resolveMediaSrc(beat.characterUrl) : null)
  const isCharVideo =
    standings[0]?.media === 'video' ||
    isVideoFileName(legacyCharName) ||
    isVideoFileName(beat.characterUrl)

  // Character name label
  let charName = legacyCharName
  if (standings.length > 0 && standings[0].characterId) {
    const reg = registeredCharacters?.find((c) => c.id === standings[0].characterId)
    const vn = vnCharacters?.find((c) => c.id === standings[0].characterId)
    charName = reg?.name || vn?.name || standings[0].characterId
  }

  return {
    isVn: true,
    backgroundSrc: bgUrl ? resolveMediaSrc(bgUrl) : '',
    characterSrc,
    plateSrc: plateUrl ? resolveMediaSrc(plateUrl) : null,
    standings,
    isCharacterVideo: isCharVideo,
    nodeId: nodeIdentity(foundVnNode) ?? beat.sourceNodeId ?? null,
    backgroundName: bgName,
    characterName: charName,
    plateName,
  }
}

export function resolveShortsBeatCaption(
  beat: ShortsVnBeat,
  event: GameEvent | null | undefined,
  lang?: string,
): string {
  const locale = normalizeEventLocale(lang || getCurrentLocale())
  const nodeId = beat.captionNodeId || null
  if (nodeId && event) {
    const node = findEventNodeById(event, nodeId)
    if (node) {
      const text = getShortsNodeDialogueText(node, event.localization, locale).trim()
      if (text) return text
      if (node.type === 'vn') {
        const parts = [
          node.background ? `배경: ${baseFileName(node.background)}` : '',
          node.character ? `캐릭터: ${baseFileName(node.character)}` : '',
          node.characterPlate ? `플레이트: ${baseFileName(node.characterPlate)}` : '',
        ].filter(Boolean)
        return parts.length > 0 ? parts.join(' · ') : ''
      }
    }
  }
  return typeof beat.caption === 'string' ? beat.caption.trim() : ''
}

export function resolveShortsBeatVoiceFileName(
  beat: ShortsVnBeat,
  event: GameEvent | null | undefined,
  lang?: string,
): string | null {
  const locale = normalizeEventLocale(lang || getCurrentLocale())
  const nodeId = beat.captionNodeId || null
  if (!nodeId || !event) return null
  const node = findEventNodeById(event, nodeId)
  if (!node) return null
  return resolveShortsNodeVoiceFileName(node, locale)
}
