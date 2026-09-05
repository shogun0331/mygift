import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import KO from './KO.json'
import EN from './EN.json'
import JA from './JA.json'
import ZH_CN from './ZH-CN.json'
import RU from './RU.json'
import ES from './ES.json'
import DE from './DE.json'

export type Locale = 'KO' | 'EN' | 'JA' | 'ZH-CN' | 'RU' | 'ES' | 'DE'

const HTML_LANG: Record<Locale, string> = {
  KO: 'ko',
  EN: 'en',
  JA: 'ja',
  'ZH-CN': 'zh-CN',
  RU: 'ru',
  ES: 'es',
  DE: 'de',
}

const RESOURCES: Record<Locale, any> = {
  KO,
  EN,
  JA,
  'ZH-CN': ZH_CN,
  RU,
  ES,
  DE,
}

/**
 * React hook 외부(게임 로직 등)에서 현재 UI 로케일을 읽기 위한 모듈 싱글톤.
 * I18nProvider 초기화/언어 변경 시 동기화된다. (기본값 KO)
 */
let currentLocale: Locale = 'KO'

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
      const saved = localStorage.getItem('locale') as Locale | null
      const next = saved && RESOURCES[saved] ? saved : 'KO'
      currentLocale = next
      applyLocaleToDocument(next)
      return next
    } catch {
      currentLocale = 'KO'
      applyLocaleToDocument('KO')
      return 'KO'
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

  // HMR/모듈 중복 등으로 Provider 컨텍스트가 비어도 앱이 죽지 않게 KO 폴백
  return {
    locale: 'KO' as Locale,
    setLocale: () => {},
    t: (key: string, params?: Record<string, string | number>) => translate('KO', key, params),
  }
}

export function useI18n() {
  return useTranslation()
}

