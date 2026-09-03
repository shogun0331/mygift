import type { EventMediaAsset, GameEvent } from '../events/types'
import { lookupLocalizedString, normalizeEventLocale } from '../events/eventLocales'
import { commonSoundMediaPath, resolveMediaSrc } from './mediaUrl'
import type { ShortsVnBeat } from './characters'
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
  if (!node || node.type === 'graphic' || node.type === 'fade' || node.type === 'sound') {
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
  if (!node || node.type === 'graphic' || node.type === 'fade' || node.type === 'sound') {
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

export function listShortsDialogueOptions(
  event: GameEvent | null | undefined,
  lang: string = normalizeEventLocale(getCurrentLocale()),
): ShortsDialogueOption[] {
  if (!event) return []
  const localization = event.localization ?? {}
  const out: ShortsDialogueOption[] = []
  const seen = new Set<string>()
  for (const node of flattenEventNodes(event.nodes ?? [])) {
    const id = nodeIdentity(node)
    if (!id || seen.has(id)) continue
    const preview = getShortsNodeDialogueText(node, localization, lang).trim()
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
