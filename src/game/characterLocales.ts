import {
  EVENT_DEFAULT_LOCALE,
  EVENT_LOCALES,
  canonicalEventLocale,
  normalizeEventLocale,
  type EventLocale,
} from '../events/eventLocales'
import type { Locale } from '../locales/i18n'

/** 캐릭터 닉네임·직업 번역 키 — 이벤트 자막과 동일 로케일 */
export const CHARACTER_LOCALES = EVENT_LOCALES
export type CharacterLocale = EventLocale
export const CHARACTER_DEFAULT_LOCALE = EVENT_DEFAULT_LOCALE

export const CHARACTER_LOCALE_LABELS: Record<CharacterLocale, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  'zh-cn': '简体中文',
  'zh-tw': '繁體中文',
  ru: 'Русский',
  es: 'Español',
  de: 'Deutsch',
}

export type CharacterLocaleText = Record<CharacterLocale, string>

export function emptyCharacterLocaleText(): CharacterLocaleText {
  return {
    ko: '',
    en: '',
    ja: '',
    'zh-cn': '',
    'zh-tw': '',
    ru: '',
    es: '',
    de: '',
  }
}

/** UI Locale(KO) → 캐릭터/이벤트 로케일(ko) */
export function characterLocaleFromUi(locale: Locale | string | null | undefined): CharacterLocale {
  return normalizeEventLocale(locale)
}

export function mergeCharacterLocaleText(
  raw: Partial<Record<string, string>> | undefined | null,
  fallback = '',
): CharacterLocaleText {
  const next = emptyCharacterLocaleText()
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw)) {
      const lang = canonicalEventLocale(key)
      if (!lang || typeof value !== 'string') continue
      next[lang] = value
    }
  }
  const trimmedFallback = fallback.trim()
  if (trimmedFallback && !next[CHARACTER_DEFAULT_LOCALE].trim()) {
    next[CHARACTER_DEFAULT_LOCALE] = trimmedFallback
  }
  return next
}

/** overlay의 채워진 로케일을 primary 위에 덮어쓴다 */
export function overlayCharacterLocaleText(
  primary: Partial<Record<string, string>> | undefined | null,
  overlay: Partial<Record<string, string>> | undefined | null,
  fallback = '',
): CharacterLocaleText {
  const next = mergeCharacterLocaleText(primary, fallback)
  const extra = mergeCharacterLocaleText(overlay, '')
  for (const lang of CHARACTER_LOCALES) {
    if (extra[lang].trim()) next[lang] = extra[lang]
  }
  return next
}

type CharacterLocaleCatalogEntry = CharacterNamedFields & { id?: string }

const catalogById = new Map<string, CharacterLocaleCatalogEntry>()
const catalogByLabel = new Map<string, CharacterLocaleCatalogEntry>()

function indexCatalogLabels(entry: CharacterLocaleCatalogEntry) {
  const labels = new Set<string>()
  if (entry.name?.trim()) labels.add(entry.name.trim())
  if (entry.names) {
    for (const value of Object.values(entry.names)) {
      if (value?.trim()) labels.add(value.trim())
    }
  }
  for (const label of labels) catalogByLabel.set(label, entry)
}

/** 번들/등록 캐릭터의 이름·직업 번역을 표시용 카탈로그에 올린다 */
export function registerCharacterLocaleCatalog(
  list: Array<CharacterNamedFields & { id?: string }>,
): void {
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue
    const prev = (raw.id && catalogById.get(raw.id)) || undefined
    const entry: CharacterLocaleCatalogEntry = {
      id: raw.id,
      name: raw.name || prev?.name,
      names: overlayCharacterLocaleText(prev?.names, raw.names, raw.name || prev?.name || ''),
      job: raw.job || prev?.job,
      jobs: overlayCharacterLocaleText(prev?.jobs, raw.jobs, raw.job || prev?.job || ''),
      concept: raw.concept || prev?.concept,
    }
    if (entry.id) catalogById.set(entry.id, entry)
    indexCatalogLabels(entry)
    if (prev) indexCatalogLabels(prev)
  }
}

function lookupCharacterLocaleCatalog(
  character: CharacterNamedFields & { id?: string },
): CharacterLocaleCatalogEntry | null {
  if (character.id && catalogById.has(character.id)) return catalogById.get(character.id) ?? null
  const labels: string[] = []
  if (character.name?.trim()) labels.push(character.name.trim())
  if (character.names) {
    for (const value of Object.values(character.names)) {
      if (value?.trim()) labels.push(value.trim())
    }
  }
  for (const label of labels) {
    const hit = catalogByLabel.get(label)
    if (hit) return hit
  }
  return null
}

function pickRequestedLocale(
  map: Partial<Record<string, string>> | undefined | null,
  locale: Locale | string | null | undefined,
): string {
  const requested = characterLocaleFromUi(locale)
  const merged = mergeCharacterLocaleText(map, '')
  const direct = merged[requested]?.trim()
  if (direct) return direct
  if (requested === 'zh-tw') return merged['zh-cn']?.trim() || ''
  return ''
}

/** 현재 언어 → 없으면 ko → 있으면 아무 채워진 값 */
export function pickCharacterLocaleText(
  map: Partial<Record<string, string>> | undefined | null,
  locale: Locale | string | null | undefined,
  legacyFallback = '',
): string {
  const merged = mergeCharacterLocaleText(map, legacyFallback)
  const requested = characterLocaleFromUi(locale)
  const order: CharacterLocale[] = [
    requested,
    ...(requested === 'zh-tw' ? (['zh-cn'] as const) : []),
    CHARACTER_DEFAULT_LOCALE,
    ...CHARACTER_LOCALES,
  ]
  const seen = new Set<string>()
  for (const lang of order) {
    if (seen.has(lang)) continue
    seen.add(lang)
    const value = merged[lang]?.trim()
    if (value) return value
  }
  return legacyFallback.trim()
}

export function primaryCharacterLocaleText(map: CharacterLocaleText): string {
  return pickCharacterLocaleText(map, CHARACTER_DEFAULT_LOCALE)
}

export type CharacterNamedFields = {
  id?: string
  name?: string
  names?: Partial<Record<string, string>> | null
  job?: string
  jobs?: Partial<Record<string, string>> | null
  concept?: string
}

export function normalizeCharacterNamedFields<T extends CharacterNamedFields>(raw: T): T & {
  name: string
  names: CharacterLocaleText
  job: string
  jobs: CharacterLocaleText
  concept: string
} {
  const names = mergeCharacterLocaleText(raw.names, raw.name ?? '')
  const jobs = mergeCharacterLocaleText(raw.jobs, raw.job ?? '')
  const name = primaryCharacterLocaleText(names)
  const job = primaryCharacterLocaleText(jobs)
  return {
    ...raw,
    name,
    names,
    job,
    jobs,
    concept: (raw.concept ?? job).trim() || job || '뉴비',
  }
}

export function characterDisplayName(
  character: CharacterNamedFields,
  locale: Locale | string | null | undefined,
): string {
  const catalog = lookupCharacterLocaleCatalog(character)
  const requested =
    pickRequestedLocale(character.names, locale) ||
    pickRequestedLocale(catalog?.names, locale)
  if (requested) return requested
  return pickCharacterLocaleText(
    overlayCharacterLocaleText(character.names, catalog?.names, character.name ?? ''),
    locale,
    character.name || catalog?.name || '',
  )
}

export function characterDisplayJob(
  character: CharacterNamedFields,
  locale: Locale | string | null | undefined,
): string {
  const catalog = lookupCharacterLocaleCatalog(character)
  const requested =
    pickRequestedLocale(character.jobs, locale) ||
    pickRequestedLocale(catalog?.jobs, locale)
  if (requested) return requested
  return pickCharacterLocaleText(
    overlayCharacterLocaleText(character.jobs, catalog?.jobs, character.job ?? character.concept ?? ''),
    locale,
    character.job || character.concept || catalog?.job || '',
  )
}
