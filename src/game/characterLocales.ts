import {
  EVENT_DEFAULT_LOCALE,
  EVENT_LOCALES,
  canonicalEventLocale,
  normalizeEventLocale,
  type EventLocale,
} from '../events/eventLocales'
import type { Locale } from '../locales/i18n'

/** 캐릭터 닉네임·직업 번역 키 — 이벤트 자막과 동일 7개국 */
export const CHARACTER_LOCALES = EVENT_LOCALES
export type CharacterLocale = EventLocale
export const CHARACTER_DEFAULT_LOCALE = EVENT_DEFAULT_LOCALE

export const CHARACTER_LOCALE_LABELS: Record<CharacterLocale, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  'zh-cn': '简体中文',
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

/** 현재 언어 → 없으면 ko → 있으면 아무 채워진 값 */
export function pickCharacterLocaleText(
  map: Partial<Record<string, string>> | undefined | null,
  locale: Locale | string | null | undefined,
  legacyFallback = '',
): string {
  const merged = mergeCharacterLocaleText(map, legacyFallback)
  const order: CharacterLocale[] = [
    characterLocaleFromUi(locale),
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
  return pickCharacterLocaleText(character.names, locale, character.name ?? '')
}

export function characterDisplayJob(
  character: CharacterNamedFields,
  locale: Locale | string | null | undefined,
): string {
  return pickCharacterLocaleText(character.jobs, locale, character.job ?? character.concept ?? '')
}
