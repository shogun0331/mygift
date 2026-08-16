export const EVENT_LOCALES = ['ko', 'en', 'ja', 'zh-cn', 'ru', 'es', 'de'] as const

export type EventLocale = (typeof EVENT_LOCALES)[number]

export const EVENT_DEFAULT_LOCALE: EventLocale = 'ko'

const UI_LOCALE_TO_EVENT: Record<string, EventLocale> = {
  KO: 'ko',
  EN: 'en',
  JA: 'ja',
  'ZH-CN': 'zh-cn',
  RU: 'ru',
  ES: 'es',
  DE: 'de',
}

export function emptyEventLocalization(): Record<EventLocale, Record<string, string>> {
  return {
    ko: {},
    en: {},
    ja: {},
    'zh-cn': {},
    ru: {},
    es: {},
    de: {},
  }
}

export function canonicalEventLocale(lang: string | undefined | null): EventLocale | null {
  const raw = String(lang || '').trim()
  if (!raw) return null
  if (UI_LOCALE_TO_EVENT[raw]) return UI_LOCALE_TO_EVENT[raw]
  const lower = raw.toLowerCase().replace(/_/g, '-')
  if (lower === 'zh' || lower === 'zh-hans') return 'zh-cn'
  if ((EVENT_LOCALES as readonly string[]).includes(lower)) return lower as EventLocale
  return null
}

export function normalizeEventLocale(lang: string | undefined | null): EventLocale {
  return canonicalEventLocale(lang) ?? EVENT_DEFAULT_LOCALE
}

export function mergeEventLocalization(
  raw: Record<string, Record<string, string>> | undefined | null,
): Record<EventLocale, Record<string, string>> {
  const next = emptyEventLocalization()
  if (!raw || typeof raw !== 'object') return next
  for (const [key, map] of Object.entries(raw)) {
    const lang = canonicalEventLocale(key)
    if (!lang || !map || typeof map !== 'object' || Array.isArray(map)) continue
    const copy: Record<string, string> = { ...next[lang] }
    for (const [textKey, value] of Object.entries(map)) {
      if (typeof value === 'string') copy[textKey] = value
    }
    next[lang] = copy
  }
  return next
}

export function lookupLocalizedString(
  localization: Record<string, Record<string, string>> | undefined,
  lang: string,
  keys: Array<string | undefined | null>,
): string {
  const order = [normalizeEventLocale(lang), EVENT_DEFAULT_LOCALE]
  const seen = new Set<string>()
  for (const locale of order) {
    if (seen.has(locale)) continue
    seen.add(locale)
    const map = localization?.[locale]
    if (!map) continue
    for (const key of keys) {
      if (typeof key !== 'string' || !key) continue
      const value = map[key]
      if (typeof value === 'string' && value.trim()) return value
    }
  }
  return ''
}
