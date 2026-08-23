import s1Ko from '../data/sns/S1.txt?raw'
import s2Ko from '../data/sns/S2.txt?raw'
import s3Ko from '../data/sns/S3.txt?raw'
import s1En from '../data/sns/S1.en.txt?raw'
import s2En from '../data/sns/S2.en.txt?raw'
import s3En from '../data/sns/S3.en.txt?raw'
import s1Ja from '../data/sns/S1.ja.txt?raw'
import s2Ja from '../data/sns/S2.ja.txt?raw'
import s3Ja from '../data/sns/S3.ja.txt?raw'
import s1Zh from '../data/sns/S1.zh.txt?raw'
import s2Zh from '../data/sns/S2.zh.txt?raw'
import s3Zh from '../data/sns/S3.zh.txt?raw'
import s1Ru from '../data/sns/S1.ru.txt?raw'
import s2Ru from '../data/sns/S2.ru.txt?raw'
import s3Ru from '../data/sns/S3.ru.txt?raw'
import s1Es from '../data/sns/S1.es.txt?raw'
import s2Es from '../data/sns/S2.es.txt?raw'
import s3Es from '../data/sns/S3.es.txt?raw'
import s1De from '../data/sns/S1.de.txt?raw'
import s2De from '../data/sns/S2.de.txt?raw'
import s3De from '../data/sns/S3.de.txt?raw'
import userIdRaw from '../data/sns/XUserID.txt?raw'

export type SnsCommentLang = 'ko' | 'en' | 'ja' | 'zh' | 'ru' | 'es' | 'de'

export type SnsComment = {
  userId: string
  heat: 1 | 2 | 3
  line: number
  text: string
}

function linesOf(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function pack(s1: string, s2: string, s3: string): Record<1 | 2 | 3, string[]> {
  return { 1: linesOf(s1), 2: linesOf(s2), 3: linesOf(s3) }
}

const COMMENTS: Record<SnsCommentLang, Record<1 | 2 | 3, string[]>> = {
  ko: pack(s1Ko, s2Ko, s3Ko),
  en: pack(s1En, s2En, s3En),
  ja: pack(s1Ja, s2Ja, s3Ja),
  zh: pack(s1Zh, s2Zh, s3Zh),
  ru: pack(s1Ru, s2Ru, s3Ru),
  es: pack(s1Es, s2Es, s3Es),
  de: pack(s1De, s2De, s3De),
}

const USER_IDS = linesOf(userIdRaw)

function takeRandom<T>(pool: T[], count: number): T[] {
  const bag = [...pool]
  const picked: T[] = []
  const n = Math.min(count, bag.length)
  for (let i = 0; i < n; i++) {
    const index = Math.floor(Math.random() * bag.length)
    const item = bag.splice(index, 1)[0]
    if (item !== undefined) picked.push(item)
  }
  return picked
}

export function commentLangOf(locale: string | null | undefined): SnsCommentLang {
  const n = String(locale ?? '').toLowerCase()
  if (n.startsWith('zh')) return 'zh'
  if (n.startsWith('ja')) return 'ja'
  if (n.startsWith('en')) return 'en'
  if (n.startsWith('ru')) return 'ru'
  if (n.startsWith('es')) return 'es'
  if (n.startsWith('de')) return 'de'
  return 'ko'
}

export function snsCommentText(comment: SnsComment, locale?: string | null) {
  if (comment.line >= 0) {
    const heat = comment.heat === 2 || comment.heat === 3 ? comment.heat : 1
    const translated = COMMENTS[commentLangOf(locale)][heat][comment.line]
    if (translated) return translated
    const korean = COMMENTS.ko[heat][comment.line]
    if (korean) return korean
  }
  return comment.text
}

export function pickSnsComments(heat: 1 | 2 | 3, count = 4): SnsComment[] {
  const source = COMMENTS.ko[heat] ?? COMMENTS.ko[1]
  const lines = takeRandom(
    source.map((text, line) => ({ text, line })),
    count,
  )
  const users = takeRandom(USER_IDS, lines.length)
  return lines.map((row, index) => ({
    userId: users[index] ?? USER_IDS[index % Math.max(1, USER_IDS.length)] ?? 'fan',
    heat,
    line: row.line,
    text: row.text,
  }))
}

export function normalizeSnsComments(raw: unknown): SnsComment[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (typeof item === 'string') {
        const text = item.trim()
        if (!text || text.startsWith('sns.comment.')) return null
        return { userId: takeRandom(USER_IDS, 1)[0] ?? 'fan', heat: 1 as const, line: -1, text }
      }
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const text = String(row.text ?? '').trim()
      const userId = String(row.userId ?? '').trim()
      if (!text && row.line == null) return null
      const heat = row.heat === 2 || row.heat === '2' ? 2 : row.heat === 3 || row.heat === '3' ? 3 : 1
      const line = Number.isFinite(Number(row.line)) ? Math.round(Number(row.line)) : -1
      return {
        userId: userId || 'fan',
        heat,
        line,
        text: text || snsCommentText({ userId: 'fan', heat, line, text: '' }, 'KO'),
      }
    })
    .filter((row): row is SnsComment => Boolean(row))
}
