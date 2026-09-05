import {
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
  '미야자와 리나': entry(
    '미야자와 리나.wav',
    'おめでとうございます！また一つ、大きな一歩ですね。',
    '축하드려요! 또 한 걸음 크게 나아갔네요.',
    'Congratulations! You\'ve taken another big step forward.',
    '恭喜您！又向前迈进了一大步呢。',
    'Поздравляю! Вы сделали ещё один большой шаг вперёд.',
    '¡Felicidades! Dimos otro gran paso hacia adelante.',
    'Herzlichen Glückwunsch! Wieder ein großer Schritt nach vorn.',
  ),
  '타치바나 미사키': entry(
    '타치바나 미사키.wav',
    'おめでとう！これからもっとすごくなるんだね～！',
    '축하해! 이제 더 대단해지는 거지~!',
    'Congrats! Now you\'re just getting even more amazing~!',
    '恭喜！接下来要变得更加厉害咯~！',
    'Поздравляю! Теперь станешь ещё круче~!',
    '¡Felicidades! ¡Ahora nos volvemos aún más increíbles~!',
    'Glückwunsch! Jetzt wird es noch großartiger~!',
  ),
  '사토 메구미': entry(
    '사토 메구미.wav',
    'おめでとうございます…！私も、頑張ってついていきますね…！',
    '축하드려요…! 저도 열심히 따라갈게요…!',
    'Congratulations...! I\'ll do my best to keep up too...!',
    '恭喜…！我也会努力跟上您的步伐…！',
    'Поздравляю…! Я тоже буду стараться не отставать…!',
    'Felicidades…! Yo también me esforzaré por seguirte el paso…!',
    'Herzlichen Glückwunsch…! Ich werde auch fleißig folgen…!',
  ),
  '아키야마 미호': entry(
    '아키야마 미호.wav',
    '…よくやったな。お前なら、ここで止まらないだろ。',
    '…잘했어. 너라면 여기서 멈추지 않겠지.',
    '...Good job. Someone like you wouldn\'t stop here.',
    '…做得好。你不会就此止步的，对吧。',
    '…Молодец. Ты ведь не остановишься на этом.',
    '…Bien hecho. No te detendrías aquí.',
    '…Gut gemacht. Du würdest hier sicher nicht aufhören.',
  ),
  '센노 리나': entry(
    '센노 리나.wav',
    'おめでとうございます。あなたなら、もっと高みへ行けますわ。',
    '축하드려요. 당신이라면 더 높은 곳으로 갈 수 있어요.',
    'Congratulations. With you at the helm, we can reach even higher.',
    '恭喜您。以您的能力，一定还能站上更高的地方。',
    'Поздравляю. Вы можете подняться ещё выше.',
    'Felicidades. Si eres tú, puedes llegar aún más alto.',
    'Herzlichen Glückwunsch. Mit dir kann es noch höher hinausgehen.',
  ),
  '사쿠라기 마이': entry(
    '사쿠라기 마이.wav',
    'やるじゃない。この調子で、私のステージも上げてよね。',
    '꽤 하는데? 이 기세로 내 무대도 올려줘.',
    'Not bad, huh? Keep this momentum going and lift my stage up too.',
    '挺能干的嘛？就趁这股气势，把我的舞台也往上提一提吧。',
    'Неплохо справляешься? В таком темпе подними и мою сцену.',
    '¿No está nada mal? Con este ritmo, sube también mi escenario.',
    'Gar nicht schlecht! In diesem Schwung heb auch meine Bühne nach oben.',
  ),
  '루이자': entry(
    '루이자.wav',
    'おめでとう～！すごいすごい！もっとお祝いしよう！',
    '축하해~! 대단해 대단해! 더 축하하자!',
    'Congrats~! Amazing, amazing! Let\'s celebrate even more!',
    '恭喜~！好厉害好厉害！让我们再好好庆祝一下吧！',
    'Поздравляю~! Здорово, здорово! Давай праздновать ещё!',
    '¡Felicidades~! ¡Genial, genial! ¡Sigamos celebrando más!',
    'Glückwunsch~! Toll, toll! Feiern wir noch mehr!',
  ),
  '리메이': entry(
    '리메이.wav',
    'おめでとう。この先も、一緒に伸ばしていこう。',
    '축하해. 앞으로도 같이 키워 나가자.',
    'Congrats. Let\'s keep building this up together from here on.',
    '恭喜。今后也一起把它做大吧。',
    'Поздравляю. Давай и дальше расти вместе.',
    'Felicidades. Sigamos haciéndolo crecer juntos de ahora en adelante.',
    'Glückwunsch. Lass uns sie auch weiterhin zusammen aufbauen.',
  ),
  '시라카와 아야': entry(
    '시라카와 아야.wav',
    '…おめでとう。評価に値する成果だったわ。',
    '…축하해. 평가받을 만한 성과였어.',
    '...Congrats. That was a truly worthy achievement.',
    '…恭喜。这是值得称道的成果。',
    '…Поздравляю. Это был результат, достойный признания.',
    '…Felicidades. Fue un logro digno de reconocimiento.',
    '…Glückwunsch. Das war eine Leistung, die Anerkennung verdient.',
  ),
}

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
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${cleanBase}audio/promotion_voices/${encodeURIComponent(fileName)}`
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

export function getPromotionDialogueText(
  nameOrId: string | null | undefined,
  locale: Locale,
): string | null {
  return pickPromotionCongratsLine(nameOrId, locale)?.text ?? null
}

export function getPromotionVoiceUrl(
  nameOrId: string | null | undefined,
): string | null {
  const data = findPromotionDataForCharacter(nameOrId)
  if (!data) return null
  return promotionVoiceUrlOf(data.voiceFileName)
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
