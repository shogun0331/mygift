import {
  mergeCharacterLocaleText,
  pickCharacterLocaleText,
  type CharacterLocaleText,
} from './characterLocales'
import type { Locale } from '../locales/i18n'

export type PromotionCharacterData = {
  voiceFileName: string
  lines: CharacterLocaleText
}

export const PROMOTION_DATA_BY_NAME: Record<string, PromotionCharacterData> = {
  '미야자와 리나': {
    voiceFileName: '미야자와 리나.wav',
    lines: {
      ja: '技術が上がりましたね。この調子で、もっと上を目指します。',
      ko: '기술이 늘었네요. 이 기세로 더 높은 곳을 목표로 할게요.',
      en: "My skills have improved. At this rate, I'll aim even higher.",
      'zh-cn': '技术有所提升呢。保持这个势头，向着更高的目标前进。',
      ru: 'Мои навыки улучшились. В таком темпе я буду стремиться ещё выше.',
      es: 'Mis habilidades han mejorado. A este ritmo, apuntaré aún más alto.',
      de: 'Meine Fähigkeiten haben sich verbessert. In diesem Tempo werde ich noch höher hinaus.',
    },
  },
  '타치바나 미사키': {
    voiceFileName: '타치바나 미사키.wav',
    lines: {
      ja: 'やった！ すごく上手くなった気がする～！ まだまだ伸びるよ！',
      ko: '해냈다! 엄청 실력이 는 것 같아~! 아직 더 성장할 수 있어!',
      en: "I did it! I feel like I've gotten so much better~! I can still grow more!",
      'zh-cn': '太棒了！感觉实力提升了超多～！还能继续进步哦！',
      ru: 'Я сделала это! Кажется, я стала намного лучше~! Я могу расти ещё больше!',
      es: '¡Lo logré! ¡Siento que he mejorado muchísimo~! ¡Aún puedo crecer más!',
      de: 'Geschafft! Ich habe mich so sehr verbessert~! Ich kann noch weiter wachsen!',
    },
  },
  '사토 메구미': {
    voiceFileName: '사토 메구미.wav',
    lines: {
      ja: 'え… 私、前よりずっと上手になれた気がします。これからも頑張りますね…！',
      ko: '어… 저, 예전보다 훨씬 실력이 는 것 같아요. 앞으로도 열심히 할게요…!',
      en: "Um… I feel like I've gotten much better than before. I'll keep working hard…!",
      'zh-cn': '那个……感觉自己比以前进步了好多。以后也会继续努力的……！',
      ru: 'Эм… кажется, я стала намного лучше, чем раньше. Я буду стараться и дальше…!',
      es: 'Eh… siento que he mejorado mucho más que antes. ¡Seguiré esforzándome…!',
      de: 'Ähm… ich habe mich viel mehr verbessert als früher. Ich werde weiter mein Bestes geben…!',
    },
  },
  '아키야마 미호': {
    voiceFileName: '아키야마 미호.wav',
    lines: {
      ja: '…悪くない。実力は確実に上がってる。',
      ko: '…나쁘지 않네. 실력은 확실히 늘고 있어.',
      en: '…Not bad. My skills are definitely improving.',
      'zh-cn': '……还不错。实力确实在提升。',
      ru: '…Неплохо. Мои навыки определённо растут.',
      es: '…No está mal. Definitivamente mis habilidades están mejorando.',
      de: '…Nicht schlecht. Meine Fähigkeiten verbessern sich definitiv.',
    },
  },
  '센노 리나': {
    voiceFileName: '센노 리나.wav',
    lines: {
      ja: '私の腕も、ずいぶん磨かれたわ。あなたと一緒なら、もっと高みへ行けそう。',
      ko: '제 실력도 꽤 다듬어졌네요. 당신과 함께라면 더 높은 곳으로 갈 수 있을 것 같아.',
      en: 'My skills have refined quite a bit. Together with you, I feel like I can reach higher places.',
      'zh-cn': '我的技艺也精进了许多。如果是和你在一起，感觉能攀登到更高处。',
      ru: 'Мои навыки существенно улучшились. С вами я смогу подняться ещё выше.',
      es: 'Mis habilidades se han perfeccionado bastante. Contigo, siento que puedo llegar más alto.',
      de: 'Meine Fähigkeiten haben sich verfeinert. Mit Ihnen kann ich noch höher steigen.',
    },
  },
  '사쿠라기 마이': {
    voiceFileName: '사쿠라기 마이.wav',
    lines: {
      ja: 'ふふ… ちょっと腕に磨きがかかった気分ね。あんたのおかげかしら？',
      ko: '후후… 좀 실력에 윤이 났다는 기분이야. 네 덕분일까?',
      en: 'Fufu… feels like my skills got a bit polished. Is it thanks to you?',
      'zh-cn': '呵呵……感觉自己的实力变得更有光彩了呢。都是多亏了你吗？',
      ru: 'Ху-ху… кажется, мои навыки отточились. Это благодаря тебе?',
      es: 'Juju… siento que mis habilidades se han pulido. ¿Será gracias a ti?',
      de: 'Huhu… fühlt sich an, als wären meine Fähigkeiten poliert worden. Ob das an dir liegt?',
    },
  },
  루이자: {
    voiceFileName: '루이자.wav',
    lines: {
      ja: 'ワアッ！ 私、もっと上手くなったよ！ 社長さんのおかげだね～！',
      ko: '와! 나 실력 더 늘었어! 사장님 덕분이야~!',
      en: "Whoa! I got even better! It's all thanks to you, Boss~!",
      'zh-cn': '哇！我的实力又进步啦！都是多亏了社长先生呢～！',
      ru: 'Вау! Я стала ещё лучше! Всё благодаря боссу~!',
      es: '¡Uau! ¡He mejorado aún más! ¡Es gracias al jefe~!',
      de: 'Woa! Ich bin noch besser geworden! Das liegt am Chef~!',
    },
  },
  리메이: {
    voiceFileName: '리메이.wav',
    lines: {
      ja: '実力は上がった。苦労は無駄じゃなかったな。',
      ko: '실력은 올랐어. 고생은 헛되지 않았네.',
      en: "My skills went up. The hard work wasn't in vain.",
      'zh-cn': '实力提升了。苦心没有白费。',
      ru: 'Мои навыки выросли. Тяжёлый труд не пропал даром.',
      es: 'Mis habilidades mejoraron. El esfuerzo no fue en vano.',
      de: 'Meine Fähigkeiten sind gestiegen. Die Mühe war nicht umsonst.',
    },
  },
  '시라카와 아야': {
    voiceFileName: '시라카와 아야.wav',
    lines: {
      ja: 'ふっ… 確かに腕を上げたわね。教えた甲斐があったってところかしら。',
      ko: '훗… 확실히 실력이 늘었네. 가르친 보람이 있었다는 거지.',
      en: "Hmph… you've definitely improved. I suppose teaching you was worth it.",
      'zh-cn': '哼……确实进步了不少呢。看来指导你是有效果的。',
      ru: 'Хм… ты определённо улучшил навыки. Полагаю, обучать тебя стоило того.',
      es: 'Je… definitivamente has mejorado. Supongo que valió la pena enseñarte.',
      de: 'Ha… du hast dich definitiv verbessert. Scheint, als hätte sich das Unterrichten gelohnt.',
    },
  },
}

export function findPromotionDataForCharacter(nameOrId: string | null | undefined): PromotionCharacterData | null {
  if (!nameOrId) return null
  const query = nameOrId.trim()

  // 1. Direct name match
  if (PROMOTION_DATA_BY_NAME[query]) {
    return PROMOTION_DATA_BY_NAME[query]
  }

  // 2. Partial / name token matching
  for (const [key, data] of Object.entries(PROMOTION_DATA_BY_NAME)) {
    if (query.includes(key) || key.includes(query)) {
      return data
    }
  }

  // 3. ID / English key matching
  const qLower = query.toLowerCase()
  if (qLower.includes('rina') && !qLower.includes('senno')) return PROMOTION_DATA_BY_NAME['미야자와 리나']
  if (qLower.includes('senno')) return PROMOTION_DATA_BY_NAME['센노 리나']
  if (qLower.includes('misaki')) return PROMOTION_DATA_BY_NAME['타치바나 미사키']
  if (qLower.includes('megumi')) return PROMOTION_DATA_BY_NAME['사토 메구미']
  if (qLower.includes('miho')) return PROMOTION_DATA_BY_NAME['아키야마 미호']
  if (qLower.includes('mai')) return PROMOTION_DATA_BY_NAME['사쿠라기 마이']
  if (qLower.includes('luiza') || qLower.includes('louisa')) return PROMOTION_DATA_BY_NAME['루이자']
  if (qLower.includes('mei')) return PROMOTION_DATA_BY_NAME['리메이']
  if (qLower.includes('aya')) return PROMOTION_DATA_BY_NAME['시라카와 아야']

  return null
}

export function getPromotionVoiceUrl(nameOrId: string | null | undefined): string | null {
  const data = findPromotionDataForCharacter(nameOrId)
  if (!data) return null
  const baseUrl = import.meta.env.BASE_URL || '/'
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${cleanBase}audio/promotion_voices/${encodeURIComponent(data.voiceFileName)}`
}

export function getPromotionDialogueText(nameOrId: string | null | undefined, locale: Locale): string {
  const data = findPromotionDataForCharacter(nameOrId)
  if (!data) return ''
  return pickCharacterLocaleText(mergeCharacterLocaleText(data.lines), locale)
}
