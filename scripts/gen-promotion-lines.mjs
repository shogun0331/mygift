import fs from 'fs'
import path from 'path'

const srcDir = 'F:/캐릭터/승급'
const outAudio = 'F:/Broadcast/broadcast-game/public/audio/promotion_voices'
const outTs = 'F:/Broadcast/broadcast-game/src/game/promotionLines.ts'

fs.mkdirSync(outAudio, { recursive: true })
for (const name of fs.readdirSync(srcDir)) {
  fs.copyFileSync(path.join(srcDir, name), path.join(outAudio, name))
}

function parseKoJp(text) {
  const out = []
  let cur = null
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const charMatch = line.match(/^\d+\.\s*([^(]+?)\s*\(/)
    if (charMatch) {
      cur = { name: charMatch[1].trim(), ja: '', ko: '' }
      out.push(cur)
      continue
    }
    if (!cur) continue
    const jp = line.match(/^JP:\s*(.+)$/)
    if (jp) {
      cur.ja = jp[1].trim()
      continue
    }
    const ko = line.match(/^KO:\s*(.+)$/)
    if (ko) cur.ko = ko[1].trim()
  }
  return out
}

function parseSimple(text) {
  const out = []
  let cur = null
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('=') || line.includes('축하 대사')) continue
    const charMatch = line.match(/^\d+\.\s*([^(]+?)\s*\(/)
    if (charMatch) {
      cur = { name: charMatch[1].trim(), line: '' }
      out.push(cur)
      continue
    }
    if (cur && !/^(JP|KO):/.test(line) && !/^\d+\./.test(line)) {
      cur.line = line
    }
  }
  return out
}

const base = parseKoJp(fs.readFileSync(path.join(srcDir, '승급축하_대사.txt'), 'utf8'))
const en = parseSimple(fs.readFileSync(path.join(srcDir, '승급축하_대사_EN.txt'), 'utf8'))
const zh = parseSimple(fs.readFileSync(path.join(srcDir, '승급축하_대사_ZH.txt'), 'utf8'))
const ru = parseSimple(fs.readFileSync(path.join(srcDir, '승급축하_대사_RU.txt'), 'utf8'))
const es = parseSimple(fs.readFileSync(path.join(srcDir, '승급축하_대사_ES.txt'), 'utf8'))
const de = parseSimple(fs.readFileSync(path.join(srcDir, '승급축하_대사_DE.txt'), 'utf8'))
const byName = (arr, name) => arr.find((x) => x.name === name)?.line ?? ''
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")

let body = `import {
  mergeCharacterLocaleText,
  pickCharacterLocaleText,
  type CharacterLocaleText,
} from './characterLocales'
import type { Locale } from '../locales/i18n'
import type { OwnedCreator } from './characters'
import { findPromotionDataForCharacter } from './promotionLinesLookup'

export type PromotionLineData = {
  voiceFileName: string
  lines: CharacterLocaleText
}

function entry(
  voiceFileName: string,
  ja: string,
  ko: string,
  en: string,
  zh: string,
  ru: string,
  es: string,
  de: string,
): PromotionLineData {
  return {
    voiceFileName,
    lines: { ja, ko, en, 'zh-cn': zh, ru, es, de },
  }
}

/** 방송국 승급 축하 (public/audio/promotion_voices/{이름}.wav) */
export const PROMOTION_DATA_BY_NAME: Record<string, PromotionLineData> = {
`

// Keep find in same file — rewrite without circular lookup
body = `import {
  mergeCharacterLocaleText,
  pickCharacterLocaleText,
  type CharacterLocaleText,
} from './characterLocales'
import type { Locale } from '../locales/i18n'
import type { OwnedCreator } from './characters'

export type PromotionLineData = {
  voiceFileName: string
  lines: CharacterLocaleText
}

function entry(
  voiceFileName: string,
  ja: string,
  ko: string,
  en: string,
  zh: string,
  ru: string,
  es: string,
  de: string,
): PromotionLineData {
  return {
    voiceFileName,
    lines: { ja, ko, en, 'zh-cn': zh, ru, es, de },
  }
}

/** 방송국 승급 축하 (public/audio/promotion_voices/{이름}.wav) */
export const PROMOTION_DATA_BY_NAME: Record<string, PromotionLineData> = {
`

for (const row of base) {
  const voice = `${row.name}.wav`
  body += `  '${esc(row.name)}': entry(
    '${esc(voice)}',
    '${esc(row.ja)}',
    '${esc(row.ko)}',
    '${esc(byName(en, row.name))}',
    '${esc(byName(zh, row.name))}',
    '${esc(byName(ru, row.name))}',
    '${esc(byName(es, row.name))}',
    '${esc(byName(de, row.name))}',
  ),\n`
  if (!fs.existsSync(path.join(outAudio, voice))) console.warn('MISSING', voice)
}

body += `}

export function findPromotionDataForCharacter(
  nameOrId: string | null | undefined,
): PromotionLineData | null {
  if (!nameOrId) return null
  const query = nameOrId.trim()
  if (PROMOTION_DATA_BY_NAME[query]) return PROMOTION_DATA_BY_NAME[query]
  for (const [key, data] of Object.entries(PROMOTION_DATA_BY_NAME)) {
    if (query.includes(key) || key.includes(query)) return data
  }
  const qLower = query.toLowerCase()
  if (qLower.includes('rina') && !qLower.includes('senno')) return PROMOTION_DATA_BY_NAME['미야자와 리나']
  if (qLower.includes('senno')) return PROMOTION_DATA_BY_NAME['센노 리나']
  if (qLower.includes('misaki')) return PROMOTION_DATA_BY_NAME['타치바나 미사키']
  if (qLower.includes('megumi')) return PROMOTION_DATA_BY_NAME['사토 메구미']
  if (qLower.includes('miho')) return PROMOTION_DATA_BY_NAME['아키야마 미호']
  if (qLower.includes('mai')) return PROMOTION_DATA_BY_NAME['사쿠라기 마이']
  if (qLower.includes('luiza') || qLower.includes('louisa') || qLower.includes('luisa')) {
    return PROMOTION_DATA_BY_NAME['루이자']
  }
  if (qLower.includes('mei') || qLower.includes('rimei') || qLower.includes('limei')) {
    return PROMOTION_DATA_BY_NAME['리메이']
  }
  if (qLower.includes('aya')) return PROMOTION_DATA_BY_NAME['시라카와 아야']
  return null
}

function promotionVoiceUrlOf(fileName: string): string {
  const baseUrl = import.meta.env.BASE_URL || '/'
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : \`\${baseUrl}/\`
  return \`\${cleanBase}audio/promotion_voices/\${encodeURIComponent(fileName)}\`
}

export function pickPromotionCongratsLine(
  nameOrId: string | null | undefined,
  locale: Locale,
): { text: string; voiceUrl: string } | null {
  const data = findPromotionDataForCharacter(nameOrId)
  if (!data) return null
  return {
    text: pickCharacterLocaleText(mergeCharacterLocaleText(data.lines), locale),
    voiceUrl: promotionVoiceUrlOf(data.voiceFileName),
  }
}

/** 보유 캐릭터 중 승급 대사가 있는 1명을 랜덤 선택 */
export function pickRandomOwnedPromotionSpeaker(
  owned: OwnedCreator[],
): OwnedCreator | null {
  const pool = owned.filter(
    (c) => findPromotionDataForCharacter(c.name) || findPromotionDataForCharacter(c.id),
  )
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)] ?? null
}
`

fs.writeFileSync(outTs, body, 'utf8')
console.log('ok', base.length, 'audio', fs.readdirSync(outAudio).filter((f) => f.endsWith('.wav')).length)
