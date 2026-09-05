import userChatKo from '../data/chat/userChat.ko.json'
import userChatEn from '../data/chat/userChat.en.json'
import userChatJa from '../data/chat/userChat.ja.json'
import userChatZh from '../data/chat/userChat.zh.json'
import userChatEs from '../data/chat/userChat.es.json'
import userChatDe from '../data/chat/userChat.de.json'
import userChatRu from '../data/chat/userChat.ru.json'
import userIdRaw from '../data/sns/XUserID.txt?raw'
import { formatMoney } from './money'

export type ChatCommentLang = 'ko' | 'en' | 'ja' | 'zh' | 'ru' | 'es' | 'de'

const USER_IDS: string[] = userIdRaw
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)

const CHAT_DICTIONARY: Record<ChatCommentLang, string[]> = {
  ko: userChatKo,
  en: userChatEn,
  ja: userChatJa,
  zh: userChatZh,
  es: userChatEs,
  de: userChatDe,
  ru: userChatRu,
}

export function chatLangOf(locale: string | null | undefined): ChatCommentLang {
  const n = String(locale ?? '').toLowerCase()
  if (n.startsWith('zh')) return 'zh'
  if (n.startsWith('ja')) return 'ja'
  if (n.startsWith('en')) return 'en'
  if (n.startsWith('ru')) return 'ru'
  if (n.startsWith('es')) return 'es'
  if (n.startsWith('de')) return 'de'
  return 'ko'
}

export function getRandomUserId(): string {
  if (USER_IDS.length === 0) return '@user_fan'
  const picked = USER_IDS[Math.floor(Math.random() * USER_IDS.length)]
  return `@${picked}`
}

export function getRandomUserChatLine(locale?: string | null): string {
  const lang = chatLangOf(locale)
  const pool = CHAT_DICTIONARY[lang] ?? CHAT_DICTIONARY.ko
  if (pool.length === 0) return '❤️'
  return pool[Math.floor(Math.random() * pool.length)] ?? '❤️'
}

export function formatChatDonationText(
  creatorName: string,
  amount: number,
  locale?: string | null,
): string {
  const lang = chatLangOf(locale)
  const money = formatMoney(amount)
  switch (lang) {
    case 'ko':
      return `${creatorName}에게 ${money}를 후원 하였습니다.`
    case 'ja':
      return `${creatorName}さんに${money}をスパチャしました。`
    case 'zh':
      return `向 ${creatorName} 赞助了 ${money}。`
    case 'es':
      return `¡Donó ${money} a ${creatorName}! `
    case 'de':
      return `Hat ${money} an ${creatorName} gespendet.`
    case 'ru':
      return `Пожертвовал ${money} для ${creatorName}.`
    case 'en':
    default:
      return `Donated ${money} to ${creatorName}.`
  }
}
