import {
  mergeCharacterLocaleText,
  pickCharacterLocaleText,
  type CharacterLocaleText,
} from './characterLocales'
import type { Locale } from '../locales/i18n'

export type VipLineData = {
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
): VipLineData {
  return {
    voiceFileName,
    lines: { ja, ko, en, 'zh-cn': zh, ru, es, de },
  }
}

/** VIP 수락 직후 출발전 인사 (public/audio/vip_voices/{이름}.wav) */
export const VIP_DATA_BY_NAME: Record<string, VipLineData> = {
  '미야자와 리나': entry(
    '미야자와 리나.wav',
    '行ってまいります。しっかり務めてきますね。',
    '다녀오겠습니다. 제대로 임하고 올게요.',
    'I\'m heading out. I\'ll do it right and come back.',
    '我出发了。会认真干好回来的。',
    'Я пошёл. Я справлюсь как следует.',
    'Me voy. Voy a dar lo mejor de mí.',
    'Ich gehe dann. Ich werde es richtig anpacken und wiederkommen.',
  ),
  '타치바나 미사키': entry(
    '타치바나 미사키.wav',
    '行ってくるね！楽しんでくるよ～！',
    '다녀올게! 신나게 갔다 올게~!',
    'See you later! I\'m off for some fun~!',
    '我出发啦！痛快地去一趟就回来~！',
    'Я пошла! Иду развлечься по полной~!',
    '¡Me voy! ¡Voy a ir a divertirme un montón~!',
    'Ich geh los! Ich hab richtig Spaß und komm wieder~!',
  ),
  '사토 메구미': entry(
    '사토 메구미.wav',
    '…行ってまいります。ちゃんと頑張ってきます。',
    '…다녀오겠습니다. 열심히 하고 올게요.',
    '…I\'m heading out. I\'ll give it my all.',
    '…我出发了。会努力干完回来的。',
    '…Я пошла. Постараюсь изо всех сил.',
    '…Me voy. Voy a esforzarme de verdad.',
    '…Ich gehe dann. Ich werde mein Bestes geben.',
  ),
  '아키야마 미호': entry(
    '아키야마 미호.wav',
    '行ってくる。任せろ。',
    '다녀올게. 맡겨.',
    'See you. Leave it to me.',
    '我出发了。交给我吧。',
    'Я пошёл. Положись на меня.',
    'Me voy. Déjamelo a mí.',
    'Ich geh los. Vertrau mir.',
  ),
  '센노 리나': entry(
    '센노 리나.wav',
    '行ってまいりますわ。お相手、務めさせていただきます。',
    '다녀오겠어요. 상대를 잘 모시고 올게요.',
    'I\'m heading out. I\'ll take good care of the client.',
    '我出发了。会好好服侍对方回来的。',
    'Я пошла. Буду достойно принимать гостя.',
    'Me voy. Voy a atender bien al cliente.',
    'Ich gehe dann. Ich werde gut auf die Leute aufpassen und wiederkommen.',
  ),
  '사쿠라기 마이': entry(
    '사쿠라기 마이.wav',
    '行ってくるわ。ちゃんと稼いでくるから。',
    '다녀올게. 제대로 벌어 올 테니까.',
    'I\'m heading out. I\'ll earn us a proper sum.',
    '我出发了。会好好赚一笔回来的。',
    'Я пошла. Я заработаю как следует.',
    'Me voy. Voy a ganar bien la plata.',
    'Ich geh los. Ich werde ordentlich was verdienen.',
  ),
  '루이자': entry(
    '루이자.wav',
    '行ってくるね！いっぱい楽しむよ～！',
    '다녀올게! 잔뜩 즐기고 올게~!',
    'See you! I\'m off to have myself a blast~!',
    '我出发啦！好好玩个够再回来~！',
    'Я пошла! Пойду как следует повеселюсь~!',
    '¡Me voy! ¡Voy a disfrutar a lo grande~!',
    'Ich geh los! Ich genieße es in vollen Zügen~!',
  ),
  '리메이': entry(
    '리메이.wav',
    '行ってくる。上手くやってくる。',
    '다녀올게. 잘 처리하고 올게.',
    'I\'m heading out. I\'ll handle it cleanly and come back.',
    '我出发了。会好好处理完回来的。',
    'Я пошёл. Разберусь как надо.',
    'Me voy. Voy a arreglarlo bien.',
    'Ich geh los. Ich regle das ordentlich.',
  ),
  '시라카와 아야': entry(
    '시라카와 아야.wav',
    '…行ってまいります。期待を裏切りませんので。',
    '…다녀오겠어요. 기대 저버리지 않을게요.',
    '…I\'m heading out. I won\'t let you down.',
    '…我出发了。不会辜负你的期待的。',
    '…Я пошла. Я вас не подведу.',
    '…Me voy. No voy a defraudar tus expectativas.',
    '…Ich gehe dann. Ich werde eure Erwartungen nicht enttäuschen.',
  ),
}

export function findVipDataForCharacter(
  nameOrId: string | null | undefined,
): VipLineData | null {
  if (!nameOrId) return null
  const query = nameOrId.trim()
  if (VIP_DATA_BY_NAME[query]) return VIP_DATA_BY_NAME[query]
  for (const [key, data] of Object.entries(VIP_DATA_BY_NAME)) {
    if (query.includes(key) || key.includes(query)) return data
  }
  const qLower = query.toLowerCase()
  if (qLower.includes('rina') && !qLower.includes('senno')) return VIP_DATA_BY_NAME['미야자와 리나']
  if (qLower.includes('senno')) return VIP_DATA_BY_NAME['센노 리나']
  if (qLower.includes('misaki')) return VIP_DATA_BY_NAME['타치바나 미사키']
  if (qLower.includes('megumi')) return VIP_DATA_BY_NAME['사토 메구미']
  if (qLower.includes('miho')) return VIP_DATA_BY_NAME['아키야마 미호']
  if (qLower.includes('mai')) return VIP_DATA_BY_NAME['사쿠라기 마이']
  if (qLower.includes('luiza') || qLower.includes('louisa') || qLower.includes('luisa')) {
    return VIP_DATA_BY_NAME['루이자']
  }
  if (qLower.includes('mei') || qLower.includes('rimei') || qLower.includes('limei')) {
    return VIP_DATA_BY_NAME['리메이']
  }
  if (qLower.includes('aya')) return VIP_DATA_BY_NAME['시라카와 아야']
  return null
}

function vipVoiceUrlOf(fileName: string): string {
  const baseUrl = import.meta.env.BASE_URL || '/'
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${cleanBase}audio/vip_voices/${encodeURIComponent(fileName)}`
}

export function pickVipDepartLine(
  nameOrId: string | null | undefined,
  locale: Locale,
): { text: string; voiceUrl: string } | null {
  const data = findVipDataForCharacter(nameOrId)
  if (!data) return null
  return {
    text: pickCharacterLocaleText(mergeCharacterLocaleText(data.lines), locale),
    voiceUrl: vipVoiceUrlOf(data.voiceFileName),
  }
}
