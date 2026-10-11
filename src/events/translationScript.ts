import type { RegisteredCharacter } from '../game/characters'
import {
  EVENT_LOCALES,
  canonicalEventLocale,
  normalizeEventLocale,
  type EventLocale,
} from './eventLocales'
import type { GameEvent } from './types'

/** 반영할 때 고르는 언어. 내보내기는 한국어 파일 하나다. */
export const TRANSLATION_TARGET_LOCALES = EVENT_LOCALES.filter(
  (lang): lang is Exclude<EventLocale, 'ko'> => lang !== 'ko',
)

const NON_DIALOGUE_TYPES = new Set(['graphic', 'vn', 'fade', 'sound', 'custom'])

export type TranslationScriptFile = {
  fileName: string
  body: string
}

export type ParsedTranslationScript = {
  targetLang: EventLocale | null
  updates: Record<string, string>
  applied: number
  skipped: string[]
  unknownMarkers: string[]
  duplicateMarkers: string[]
  ambiguousMarkers: string[]
  unmatchedNodeCount: number
  error: string | null
}

type DialogueRow = {
  node: Record<string, unknown>
  textKey: string
  speakerLabel: string
  text: string
}

function isDialogueNode(node: unknown): node is Record<string, unknown> {
  if (!node || typeof node !== 'object') return false
  const type = (node as { type?: unknown }).type
  if (typeof type === 'string' && NON_DIALOGUE_TYPES.has(type)) return false
  return true
}

export function dialogueTextKey(node: Record<string, unknown>): string {
  const key = node.text_key ?? node.id
  return typeof key === 'string' ? key.trim() : ''
}

function sourceText(event: GameEvent, node: Record<string, unknown>, textKey: string): string {
  const lang = normalizeEventLocale(event.defaultLanguage || 'ko')
  const fromLoc = event.localization?.[lang]?.[textKey]
  const raw =
    typeof fromLoc === 'string' && fromLoc.trim()
      ? fromLoc
      : typeof node.text === 'string'
        ? node.text
        : ''
  return raw.replace(/\s*\n\s*/g, ' ').trim()
}

function findRegistered(
  speaker: string,
  registeredCharacters: RegisteredCharacter[],
): RegisteredCharacter | undefined {
  return (
    registeredCharacters.find((c) => c.id === speaker) ||
    registeredCharacters.find((c) => c.name === speaker) ||
    registeredCharacters.find((c) => c.names?.ko === speaker)
  )
}

function speakerLabel(
  node: Record<string, unknown>,
  event: GameEvent,
  registeredCharacters: RegisteredCharacter[],
): string {
  const speakerType = typeof node.speakerType === 'string' ? node.speakerType : 'character'
  const speaker = typeof node.speaker === 'string' ? node.speaker : ''
  if (speakerType === 'player' || speaker === 'player') return '플레이어'
  if (speakerType === 'narrator') return '지문'
  if (!speaker) return '화자 없음'
  const registered = findRegistered(speaker, registeredCharacters)
  if (registered?.name) return registered.name
  const fromEvent = (event.characters || []).find((c) => c.id === speaker || c.name === speaker)
  if (fromEvent?.name) return fromEvent.name
  const koName = fromEvent?.names?.ko
  if (typeof koName === 'string' && koName.trim()) return koName.trim()
  return speaker
}

function dialogueRows(
  event: GameEvent,
  registeredCharacters: RegisteredCharacter[],
): DialogueRow[] {
  const rows: DialogueRow[] = []
  for (const node of event.nodes || []) {
    if (!isDialogueNode(node)) continue
    const textKey = dialogueTextKey(node)
    if (!textKey) continue
    rows.push({
      node,
      textKey,
      speakerLabel: speakerLabel(node, event, registeredCharacters),
      text: sourceText(event, node, textKey),
    })
  }
  return rows
}

/** text_key의 끝 조각 중, 이 이벤트에서 그 노드 하나에만 맞는 가장 짧은 표식. */
export function uniqueMarker(textKey: string, allKeys: string[]): string {
  const parts = textKey.split('_').filter(Boolean)
  const chunks = parts.length > 0 ? parts : [textKey]
  for (let take = 1; take <= chunks.length; take++) {
    const candidate = chunks.slice(chunks.length - take).join('_')
    const hits = allKeys.filter((key) => key === candidate || key.endsWith(`_${candidate}`))
    if (hits.length === 1 && hits[0] === textKey) return candidate
  }
  return textKey
}

function matchTextKey(marker: string, textKeys: string[]): string[] {
  return textKeys.filter((key) => key === marker || key.endsWith(`_${marker}`))
}

function scriptFileName(eventId: string, lang: string): string {
  const safe = eventId.replace(/[<>:"/\\|?*\s]+/g, '_') || 'event'
  return `${safe}.${lang}.txt`
}

function displayNameList(registered: RegisteredCharacter | undefined): string {
  if (!registered?.names) return ''
  const parts = TRANSLATION_TARGET_LOCALES.flatMap((lang) => {
    const name = registered.names[lang]?.trim()
    if (!name || name === registered.name) return []
    return [`${lang}=${name}`]
  })
  return parts.length > 0 ? ` 표시이름 ${parts.join(', ')}.` : ''
}

function characterLine(label: string, registeredCharacters: RegisteredCharacter[]): string {
  if (label === '플레이어') {
    return '# - [플레이어] 남성, 방송국 사장, 상대에게 존댓말.'
  }
  if (label === '지문') {
    return '# - [지문] 장면은 3인칭. 속마음(나/내)은 플레이어 남성 시점.'
  }
  const registered = findRegistered(label, registeredCharacters)
  const age = registered?.age?.trim() ? `${registered.age.trim()}세` : ''
  const job = registered?.job?.trim() || ''
  const bits = ['여성', age, job].filter(Boolean)
  return `# - [${label}] ${bits.join(', ')}. 사장에게 존댓말.${displayNameList(registered)}`
}

export function buildTranslationScript(
  event: GameEvent,
  registeredCharacters: RegisteredCharacter[],
): TranslationScriptFile {
  const rows = dialogueRows(event, registeredCharacters)
  const textKeys = rows.map((row) => row.textKey)
  const seenSpeakers: string[] = []
  const bodyLines: string[] = []
  for (const row of rows) {
    if (!seenSpeakers.includes(row.speakerLabel)) seenSpeakers.push(row.speakerLabel)
    const marker = uniqueMarker(row.textKey, textKeys)
    bodyLines.push(`[#${marker}][${row.speakerLabel}] ${row.text}`.trimEnd())
  }

  const title = (event.title || event.id || '이벤트').trim()
  const header = [
    `# 이벤트: ${title} (${event.id})`,
    '# 원문: ko',
    '# 규칙: # 줄과 [#표식] 은 글자 그대로 유지. [화자] 뒤 문장만 번역할 언어로 바꾼다.',
    '# 규칙: 줄 순서는 바꿔도 된다. 줄을 지우거나 표식을 고치면 그 대사는 반영되지 않는다.',
    '# 성별: 플레이어는 남성. 등록 캐릭터는 여성. en=he/she, ja=私·ですます, ru·es·de는 문법 성.',
    '# 화자:',
    ...seenSpeakers.map((label) => characterLine(label, registeredCharacters)),
  ]

  return {
    fileName: scriptFileName(event.id, 'ko'),
    body: `${header.join('\n')}\n${bodyLines.join('\n')}\n`,
  }
}

function readTargetLang(line: string): EventLocale | null {
  const match = /번역\s*[:：]\s*([A-Za-z0-9_-]+)/.exec(line)
  if (!match) return null
  return canonicalEventLocale(match[1])
}

export function parseTranslationScript(
  script: string,
  event: GameEvent,
  forcedLang?: EventLocale | null,
): ParsedTranslationScript {
  const rows = dialogueRows(event, [])
  const textKeys = rows.map((row) => row.textKey)
  const updates: Record<string, string> = {}
  const skipped: string[] = []
  const unknownMarkers: string[] = []
  const duplicateMarkers: string[] = []
  const ambiguousMarkers: string[] = []
  let targetLang: EventLocale | null = forcedLang ? canonicalEventLocale(forcedLang) : null

  const text = script.replace(/^\uFEFF/, '')
  type Draft = { marker: string; parts: string[] }
  const drafts: Draft[] = []
  let current: Draft | null = null

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('#')) {
      if (!forcedLang && !targetLang) {
        const lang = readTargetLang(line)
        if (lang) targetLang = lang
      }
      continue
    }
    const match = /^\[#([^\]]+)\](?:\s*\[[^\]]*\])?\s*(.*)$/.exec(line)
    if (match) {
      current = { marker: match[1].trim(), parts: [] }
      drafts.push(current)
      if (match[2].trim()) current.parts.push(match[2].trim())
      continue
    }
    if (current) {
      current.parts.push(line)
      continue
    }
    skipped.push(`표식 없는 줄: ${line.slice(0, 48)}`)
  }

  const seen = new Set<string>()
  for (const draft of drafts) {
    const marker = draft.marker
    if (!marker) {
      skipped.push('빈 표식')
      continue
    }
    if (seen.has(marker)) {
      duplicateMarkers.push(marker)
      skipped.push(`같은 표식이 두 번: ${marker}`)
      continue
    }
    seen.add(marker)
    const sentence = draft.parts.join(' ').trim()
    if (!sentence) {
      skipped.push(`빈 대사: ${marker}`)
      continue
    }
    const hits = matchTextKey(marker, textKeys)
    if (hits.length === 0) {
      unknownMarkers.push(marker)
      skipped.push(`없는 대사: ${marker}`)
      continue
    }
    if (hits.length > 1) {
      ambiguousMarkers.push(marker)
      skipped.push(`표식이 여러 노드와 겹침: ${marker}`)
      continue
    }
    updates[hits[0]] = sentence
  }

  const matched = new Set(Object.keys(updates))
  const unmatchedNodeCount = textKeys.filter((key) => !matched.has(key)).length
  const error = targetLang
    ? null
    : '넣을 언어를 고르세요.'

  return {
    targetLang,
    updates: error ? {} : updates,
    applied: error ? 0 : Object.keys(updates).length,
    skipped,
    unknownMarkers,
    duplicateMarkers,
    ambiguousMarkers,
    unmatchedNodeCount,
    error,
  }
}

export function translationApplySummary(parsed: ParsedTranslationScript): string {
  if (parsed.error) return parsed.error
  if (parsed.applied === 0) {
    const detail = parsed.skipped.slice(0, 3).join(' / ')
    return detail ? `반영된 대사가 없습니다. ${detail}` : '반영된 대사가 없습니다.'
  }
  const bits = [`${parsed.targetLang} ${parsed.applied}줄을 반영했습니다.`]
  if (parsed.unknownMarkers.length) bits.push(`없는 표식 ${parsed.unknownMarkers.length}`)
  if (parsed.duplicateMarkers.length) bits.push(`중복 표식 ${parsed.duplicateMarkers.length}`)
  if (parsed.ambiguousMarkers.length) bits.push(`겹치는 표식 ${parsed.ambiguousMarkers.length}`)
  if (parsed.unmatchedNodeCount) bits.push(`파일에 없는 노드 ${parsed.unmatchedNodeCount}`)
  return bits.join(' ')
}
