import lineKo from '../data/sns/line.txt?raw'
import lineEn from '../data/sns/line.en.txt?raw'
import lineJa from '../data/sns/line.ja.txt?raw'
import lineZh from '../data/sns/line.zh.txt?raw'
import lineRu from '../data/sns/line.ru.txt?raw'
import lineEs from '../data/sns/line.es.txt?raw'
import lineDe from '../data/sns/line.de.txt?raw'
import { commentLangOf, type SnsCommentLang } from './snsComments'

function linesOf(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

const LINES: Record<SnsCommentLang, string[]> = {
  ko: linesOf(lineKo),
  en: linesOf(lineEn),
  ja: linesOf(lineJa),
  zh: linesOf(lineZh),
  ru: linesOf(lineRu),
  es: linesOf(lineEs),
  de: linesOf(lineDe),
}

function lineCount() {
  return Math.max(1, LINES.ko.length)
}

function hashId(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return hash
}

export function pickSnsCaptionLine(_heat?: 1 | 2 | 3) {
  return Math.floor(Math.random() * lineCount())
}

export function captionLineOf(post: { id: string; captionLine?: number | null }) {
  const count = lineCount()
  if (Number.isFinite(post.captionLine) && Number(post.captionLine) >= 0) {
    return Math.round(Number(post.captionLine)) % count
  }
  return hashId(post.id) % count
}

export function snsCharacterLine(_heat: 1 | 2 | 3, line: number, locale?: string | null) {
  const count = lineCount()
  const index = ((line % count) + count) % count
  const translated = LINES[commentLangOf(locale)][index]
  if (translated) return translated
  return LINES.ko[index] ?? ''
}
