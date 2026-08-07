import { createContext, useContext, useState, type ReactNode } from 'react'

import KO from './KO.json'
import EN from './EN.json'
import JA from './JA.json'
import ZH_CN from './ZH-CN.json'
import RU from './RU.json'
import ES from './ES.json'
import DE from './DE.json'

export type Locale = 'KO' | 'EN' | 'JA' | 'ZH-CN' | 'RU' | 'ES' | 'DE'

const RESOURCES: Record<Locale, any> = {
  KO,
  EN,
  JA,
  'ZH-CN': ZH_CN,
  RU,
  ES,
  DE,
}

type I18nContextType = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType | null>(null)

// 닷 노테이션(Dot notation) 객체 탐색 함수
function getValueByPath(obj: any, path: string): string | null {
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return null
    current = current[part]
  }
  return typeof current === 'string' ? current : null
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // 로컬 스토리지에서 기본 로케일 불러오기
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('locale') as Locale
    return RESOURCES[saved] ? saved : 'KO'
  })

  const setLocale = (newLocale: Locale) => {
    if (RESOURCES[newLocale]) {
      setLocaleState(newLocale)
      localStorage.setItem('locale', newLocale)
    }
  }

  // 다국어 번역 함수 t
  const t = (key: string): string => {
    const currentPack = RESOURCES[locale]
    // 1. 현재 선택한 언어 팩에서 번역 탐색
    let val = getValueByPath(currentPack, key)
    if (val != null && val.trim() !== '') return val

    // 2. 만약 해당 번역이 비어있거나 없으면 한국어(KO)를 폴백으로 탐색
    if (locale !== 'KO') {
      val = getValueByPath(RESOURCES['KO'], key)
      if (val != null) return val
    }

    return key
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider')
  }
  return context
}
