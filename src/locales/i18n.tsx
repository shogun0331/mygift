import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import KO from './KO.json'
import EN from './EN.json'
import JA from './JA.json'
import ZH_CN from './ZH-CN.json'
import ZH_TW from './ZH-TW.json'
import RU from './RU.json'
import ES from './ES.json'
import DE from './DE.json'

export type Locale = 'KO' | 'EN' | 'JA' | 'ZH-CN' | 'ZH-TW' | 'RU' | 'ES' | 'DE'

export const SUPPORTED_LOCALES: readonly Locale[] = ['KO', 'EN', 'JA', 'ZH-CN', 'ZH-TW', 'RU', 'ES', 'DE']

const DEFAULT_LOCALE: Locale = 'EN'

const HTML_LANG: Record<Locale, string> = {
  KO: 'ko',
  EN: 'en',
  JA: 'ja',
  'ZH-CN': 'zh-CN',
  'ZH-TW': 'zh-TW',
  RU: 'ru',
  ES: 'es',
  DE: 'de',
}

const RESOURCES: Record<Locale, any> = {
  KO,
  EN,
  JA,
  'ZH-CN': ZH_CN,
  'ZH-TW': ZH_TW,
  RU,
  ES,
  DE,
}

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/**
 * BCP-47 태그 하나를 지원 로케일로 매핑. 미지원이면 null.
 * `ko` / `ko-KR`처럼 언어 코드 + 리전만 인정하고, `navigator.languages` 후보는 쓰지 않는다.
 */
export function mapLangTagToLocale(raw: string | null | undefined): Locale | null {
  if (!raw) return null
  const lang = String(raw).trim().toLowerCase().replace(/_/g, '-')
  if (!lang) return null

  const primary = lang.split('-')[0] || ''
  if (primary === 'ko') return 'KO'
  if (primary === 'ja') return 'JA'
  if (primary === 'zh') {
    if (lang.includes('hant') || lang.includes('tw') || lang.includes('hk') || lang.includes('mo')) {
      return 'ZH-TW'
    }
    return 'ZH-CN'
  }
  if (primary === 'ru') return 'RU'
  if (primary === 'es') return 'ES'
  if (primary === 'de') return 'DE'
  if (primary === 'en') return 'EN'
  return null
}

function primaryDeviceLangTag(): string {
  try {
    const hints = typeof window !== 'undefined' ? window.deviceLangHints : undefined
    const fromElectron =
      hints?.preferredLanguages?.[0] || hints?.systemLocale || ''
    if (fromElectron) return String(fromElectron)

    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language
    }
  } catch {
    // ignore
  }
  return ''
}

/**
 * 첫 실행(저장된 언어 없음) 시 디바이스 주 언어를 사용.
 * 지원 목록에 없으면 영어(EN). 후보 목록을 훑지 않는다.
 */
export function detectDeviceLocale(): Locale {
  return mapLangTagToLocale(primaryDeviceLangTag()) ?? DEFAULT_LOCALE
}

/**
 * React hook 외부(게임 로직 등)에서 현재 UI 로케일을 읽기 위한 모듈 싱글톤.
 * I18nProvider 초기화/언어 변경 시 동기화된다.
 */
let currentLocale: Locale = detectDeviceLocale()

export function getCurrentLocale(): Locale {
  return currentLocale
}

type I18nContextType = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType | null>(null)

function getValueByPath(obj: unknown, path: string): string | null {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return null
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : null
}

function applyLocaleToDocument(locale: Locale) {
  document.documentElement.lang = HTML_LANG[locale]
  document.documentElement.dataset.locale = locale
}

export function translate(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const currentPack = RESOURCES[locale]
  let val = getValueByPath(currentPack, key)
  if (val == null) {
    if (locale !== 'KO') {
      val = getValueByPath(RESOURCES.KO, key)
    }
    if (val == null && locale !== 'EN') {
      val = getValueByPath(RESOURCES.EN, key)
    }
  }

  if (val == null) return key

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      val = val!.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    })
  }

  return val
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const saved = localStorage.getItem('locale')
      const next = isSupportedLocale(saved) ? saved : detectDeviceLocale()
      currentLocale = next
      applyLocaleToDocument(next)
      return next
    } catch {
      const def = detectDeviceLocale()
      currentLocale = def
      applyLocaleToDocument(def)
      return def
    }
  })

  const setLocale = (newLocale: Locale) => {
    if (!RESOURCES[newLocale]) return
    currentLocale = newLocale
    setLocaleState(newLocale)
    try {
      localStorage.setItem('locale', newLocale)
    } catch {
      // ignore storage failures (private mode / locked profile)
    }
  }

  useEffect(() => {
    applyLocaleToDocument(locale)
  }, [locale])

  const value: I18nContextType = {
    locale,
    setLocale,
    t: (key, params) => translate(locale, key, params),
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useTranslation() {
  const context = useContext(I18nContext)
  if (context) return context

  // HMR/모듈 중복 등으로 Provider 컨텍스트가 비어도 앱이 죽지 않게 fallback
  const fallback = detectDeviceLocale()
  return {
    locale: fallback,
    setLocale: () => {},
    t: (key: string, params?: Record<string, string | number>) => translate(fallback, key, params),
  }
}

export function useI18n() {
  return useTranslation()
}

