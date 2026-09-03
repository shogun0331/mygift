import {
  emptyCharacterLocaleText,
  mergeCharacterLocaleText,
  pickCharacterLocaleText,
  type CharacterLocaleText,
} from './characterLocales'

/** 캐릭터 한글 이름 → 특별휴가 감사 대본 (7개국) */
export const SPECIAL_VACATION_SCRIPTS_BY_NAME: Record<string, CharacterLocaleText> = {
  '미야자와 리나': {
    ja: '社長さん、本当にありがとうございました。',
    ko: '사장님, 정말 감사했습니다.',
    en: 'Boss, thank you so very much.',
    'zh-cn': '社长，真的非常感谢您。',
    ru: 'Босс, правда большое спасибо.',
    es: 'Jefe, de verdad muchas gracias.',
    de: 'Chef, wirklich vielen Dank.',
  },
  '시라카와 아야': {
    ja: '……ありがとう。悪くない休暇だったわ。',
    ko: '……고마워. 나쁘지 않은 휴가였어.',
    en: '…Thanks. Not a bad vacation.',
    'zh-cn': '……谢谢。不算坏的假期。',
    ru: '…Спасибо. Неплохой отпуск.',
    es: '…Gracias. No estuvo mal la vacación.',
    de: '…Danke. Kein schlechter Urlaub.',
  },
  루이자: {
    ja: '社長さん、ありがとう！すごく楽しかった！',
    ko: '사장님, 고마워! 정말 재밌었어!',
    en: 'Boss, thanks! That was so much fun!',
    'zh-cn': '社长，谢谢！超开心的！',
    ru: 'Босс, спасибо! Было супер весело!',
    es: '¡Jefe, gracias! ¡Fue genial!',
    de: 'Chef, danke! Das hat mega Spaß gemacht!',
  },
  리메이: {
    ja: '……ありがとう。よく休めた。',
    ko: '……고마워. 잘 쉬었어.',
    en: '…Thanks. I rested well.',
    'zh-cn': '……谢谢。好好休息了。',
    ru: '…Спасибо. Хорошо отдохнула.',
    es: '…Gracias. Descansé bien.',
    de: '…Danke. Hab gut ausgeruht.',
  },
  '사쿠라기 마이': {
    ja: '……本当に楽しかったわ。ありがとう、社長さん。',
    ko: '……정말 즐거웠어. 고마워, 사장님.',
    en: '…I really had fun. Thank you, boss.',
    'zh-cn': '……真的很开心。谢谢你，社长。',
    ru: '…Правда было весело. Спасибо, босс.',
    es: '…De verdad lo pasé bien. Gracias, jefe.',
    de: '…Es hat wirklich Spaß gemacht. Danke, Chef.',
  },
  '아키야마 미호': {
    ja: '……ありがとうございます。',
    ko: '……감사합니다.',
    en: '…Thank you.',
    'zh-cn': '……谢谢您。',
    ru: '…Спасибо.',
    es: '…Gracias.',
    de: '…Danke.',
  },
  '센노 리나': {
    ja: 'このようなお休みをいただき、ありがとうございます。',
    ko: '이런 휴가를 주셔서 감사드립니다.',
    en: 'Thank you for granting me this time off.',
    'zh-cn': '能得到这样的假期，非常感谢。',
    ru: 'Благодарю вас за такой отпуск.',
    es: 'Gracias por concederme estas vacaciones.',
    de: 'Danke, dass Sie mir diesen Urlaub gewährt haben.',
  },
  '사토 메구미': {
    ja: 'あの……本当にありがとうございます。',
    ko: '저……정말 감사합니다.',
    en: 'Um… thank you so much.',
    'zh-cn': '那个……真的非常感谢。',
    ru: 'Эм… правда большое спасибо.',
    es: 'Eh… de verdad muchas gracias.',
    de: 'Ähm… wirklich vielen Dank.',
  },
  '타치바나 미사키': {
    ja: '社長さん～！ありがとうございます！',
    ko: '사장님~! 감사합니다!',
    en: 'Boss~! Thank you!',
    'zh-cn': '社长～！谢谢您！',
    ru: 'Босс~! Спасибо!',
    es: '¡Jefe~! ¡Gracias!',
    de: 'Chef~! Danke!',
  },
}

export function defaultSpecialVacationCaptionsForCharacter(name: string | null | undefined): CharacterLocaleText {
  const key = String(name || '').trim()
  const found = SPECIAL_VACATION_SCRIPTS_BY_NAME[key]
  if (found) return mergeCharacterLocaleText(found)
  return emptyCharacterLocaleText()
}

export function pickSpecialVacationCaption(
  captions: Partial<Record<string, string>> | null | undefined,
  locale: string | null | undefined,
  characterName?: string | null,
): string {
  const picked = pickCharacterLocaleText(captions, locale)
  if (picked.trim()) return picked
  return pickCharacterLocaleText(defaultSpecialVacationCaptionsForCharacter(characterName), locale)
}
