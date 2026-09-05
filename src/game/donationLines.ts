import {
  mergeCharacterLocaleText,
  pickCharacterLocaleText,
  type CharacterLocaleText,
} from './characterLocales'
import type { Locale } from '../locales/i18n'

export type DonationLineVariant = {
  voiceFileName: string
  lines: CharacterLocaleText
}

export type DonationCharacterData = {
  variants: DonationLineVariant[]
}

function line(
  voiceFileName: string,
  ja: string,
  ko: string,
  en: string,
  zh: string,
  ru: string,
  es: string,
  de: string,
): DonationLineVariant {
  return {
    voiceFileName,
    lines: { ja, ko, en, 'zh-cn': zh, ru, es, de },
  }
}

/** 대형 후원 감사 대사 3종 + 음성 (public/audio/donation_voices/{이름}_{1|2|3}.wav) */
export const DONATION_DATA_BY_NAME: Record<string, DonationCharacterData> = {
  '미야자와 리나': {
    variants: [
      line(
        '미야자와 리나_1.wav',
        'わあ、ありがとうございます！嬉しい…！',
        '와, 감사합니다! 기뻐요…!',
        "Oh wow, thank you! I'm so happy...!",
        '哇，谢谢！好开心…！',
        'Вау, спасибо! Я так рада…!',
        '¡Guau, gracias! ¡Estoy tan feliz...!',
        'Wow, danke schön! Ich freu mich so…!',
      ),
      line(
        '미야자와 리나_2.wav',
        'えっ、こんなに！本当にありがとうございます。',
        '이런, 이렇게나! 정말 감사합니다.',
        'Oh my, this much! Thank you so much.',
        '哎呀，这么多！真是太感谢了。',
        'Ого, так щедро! Огромное спасибо.',
        '¡Ay, así de mucho! Muchísimas gracias.',
        'Oh, so viel! Vielen, vielen Dank.',
      ),
      line(
        '미야자와 리나_3.wav',
        '感激です…！素敵なご支援、心にしみます。',
        '감격이에요…! 멋진 후원, 마음에 새겨요.',
        "I'm moved...! I'll treasure this wonderful sponsorship.",
        '太感动了……！这么棒的赞助，我会铭记在心的。',
        'Я тронута…! Этот чудесный дар я запомню навсегда.',
        '¡Qué emoción…! Este apoyo tan increíble, lo guardo en el corazón.',
        'Ich bin gerührt…! Diese wunderbare Unterstützung werde ich mir zu Herzen nehmen.',
      ),
    ],
  },
  '타치바나 미사키': {
    variants: [
      line(
        '타치바나 미사키_1.wav',
        'えっ、大金！ありがとう～！',
        '어, 큰돈! 고마워~!',
        'Hey, big money! Thanks~!',
        '诶，大钱！谢啦~！',
        'Ого, крупная сумма! Спасибо~!',
        '¡Ey, un dineral! ¡Gracias~!',
        'Oh, ganz schön viel Geld! Danke~!',
      ),
      line(
        '타치바나 미사키_2.wav',
        'わーい、ありがとう！応援に応えるよ！',
        '와이, 고마워! 응원에 보답할게!',
        "Yay, thank you! I'll repay your support!",
        '哇，谢谢！我会好好回报你的支持的！',
        'Вау, спасибо! Отплачу за твою поддержку!',
        '¡Oye, gracias! ¡Voy a corresponder a tu ánimo!',
        'Juhu, danke! Deine Unterstützung werde ich erwidern!',
      ),
      line(
        '타치바나 미사키_3.wav',
        'すっごく嬉しい！こんなにありがとう！',
        '엄청 기뻐! 이렇게나 고마워!',
        "I'm so happy! Thanks a lot!",
        '超开心！真是太感谢了！',
        'Я так рада! Огромное спасибо!',
        '¡Estoy súper feliz! ¡Gracias por esto!',
        'Ich freu mich riesig! Danke vielmals!',
      ),
    ],
  },
  '사토 메구미': {
    variants: [
      line(
        '사토 메구미_1.wav',
        'ありがとうございます…嬉しい…',
        '감사합니다… 기뻐요…',
        "Thank you... I'm happy...",
        '谢谢你…好开心…',
        'Спасибо… Я рада…',
        'Gracias... estoy feliz...',
        'Danke… das freut mich so…',
      ),
      line(
        '사토 메구미_2.wav',
        'こんなにいただいて…感謝しています…！',
        '이렇게나 받아서… 감사드려요…!',
        'Receiving this much... thank you...!',
        '收到这么多……真是太感谢了……！',
        'Получить так много… благодарю вас…!',
        'Recibir tanto… Muchas gracias…!',
        'Dass ich so viel bekomme… vielen Dank…!',
      ),
      line(
        '사토 메구미_3.wav',
        '私まで温かくなりました…ありがとうございます。',
        '저까지 따뜻해졌어요… 감사합니다.',
        'My heart feels warm too... thank you.',
        '连我也觉得好温暖……谢谢你。',
        'Мне даже стало тепло… Спасибо.',
        'Hasta yo me siento calentita… Gracias.',
        'Mir ist ganz warm ums Herz geworden… Danke schön.',
      ),
    ],
  },
  '아키야마 미호': {
    variants: [
      line(
        '아키야마 미호_1.wav',
        '…感謝する。ちゃんと返す。',
        '…고마워. 제대로 갚을게.',
        "...Thanks. I'll pay you back properly.",
        '…谢了。我会好好报答的。',
        '…Спасибо. Я обязательно всё верну.',
        '...Gracias. Te lo pagaré bien.',
        '…Danke. Ich zahl es dir anständig zurück.',
      ),
      line(
        '아키야마 미호_2.wav',
        '…太っ腹だな。礼を言う。',
        '…통 크네. 고맙다.',
        '...Generous of you. Thanks.',
        '……真大方啊。谢了。',
        '…Щедро же. Спасибо.',
        '…Qué generoso. Gracias.',
        '…Großzügig. Danke.',
      ),
      line(
        '아키야마 미호_3.wav',
        '覚えた。しっかり働いて返す。',
        '기억했어. 제대로 일해서 갚을게.',
        "I'll remember this. I'll pay you back by doing a proper job.",
        '我记住了。会好好工作来报答你的。',
        'Запомнила. Как следует отработаю и расплачусь.',
        'Lo tengo presente. Trabajaré bien para devolverte.',
        'Habe ich mir gemerkt. Ich werde es mit harter Arbeit zurückzahlen.',
      ),
    ],
  },
  '센노 리나': {
    variants: [
      line(
        '센노 리나_1.wav',
        '素敵な贈り物ね。ありがとう。',
        '멋진 선물이네요. 고마워요.',
        'What a splendid gift. Thank you.',
        '好棒的礼物呢。谢谢你。',
        'Какой шикарный подарок. Спасибо тебе.',
        'Qué regalo tan genial. Gracias.',
        'Ein wirklich schönes Geschenk. Danke.',
      ),
      line(
        '센노 리나_2.wav',
        '光栄です。その期待、裏切りませんわ。',
        '영광이에요. 그 기대, 저버리지 않겠어요.',
        "It's an honor. I won't let those expectations down.",
        '这是我的荣幸。我不会辜负那份期待的。',
        'Для меня это честь. Этих ожиданий я не подведу.',
        'Es un honor. No voy a defraudar esa confianza.',
        'Es ist mir eine Ehre. Diese Erwartung werde ich nicht enttäuschen.',
      ),
      line(
        '센노 리나_3.wav',
        'まあ、嬉しい。あなたに感謝します。',
        '어머, 기뻐요. 당신께 감사드려요.',
        "My, I'm so glad. Thank you.",
        '哎呀，真高兴。谢谢您。',
        'Ой, как приятно. Благодарю вас.',
        'Ay, me alegro. Te lo agradezco de corazón.',
        'Oh, wie schön. Ich danke dir von Herzen.',
      ),
    ],
  },
  '사쿠라기 마이': {
    variants: [
      line(
        '사쿠라기 마이_1.wav',
        '太っ腹ね。ありがと。',
        '통 크네. 고마워.',
        'Pretty generous of you. Thanks.',
        '出手真大方。谢了。',
        'Ну ты и щедрый. Спасибо.',
        'Vaya, qué generoso. Gracias.',
        'Großzügig. Danke.',
      ),
      line(
        '사쿠라기 마이_2.wav',
        'ふふ、気前がいいじゃない。嬉しいわ。',
        '후후, 통 크잖아. 기뻐.',
        "Hehe, quite generous, aren't you. I'm happy.",
        '呵呵，真大方呢。好高兴。',
        'Хе-хе, щедро же. Рада.',
        'Jeje, qué generoso. Qué alegría.',
        'Hehe, du bist großzügig. Freut mich.',
      ),
      line(
        '사쿠라기 마이_3.wav',
        'こんなに貰っちゃ、歌も弾むわね。',
        '이렇게 받았으니 노래도 탄력이 나네.',
        'With this much, my singing will pick up momentum too.',
        '收到这么多，唱歌也更有劲了呢。',
        'Раз уж получила так много, то и в песне появится задор.',
        'Con esto recibido, hasta mi canto coge fuerza.',
        'Wenn ich so viel bekomme, singe ich gleich mit mehr Schwung.',
      ),
    ],
  },
  '루이자': {
    variants: [
      line(
        '루이자_1.wav',
        'すごい！ありがとう～！',
        '대박! 고마워~!',
        'Jackpot! Thanks~!',
        '太棒了！谢啦~！',
        'Вот это да! Спасибо~!',
        '¡Increíble! ¡Gracias~!',
        'Der Hammer! Danke~!',
      ),
      line(
        '루이자_2.wav',
        'わあ、太っ腹！うれしーい！',
        '와, 통 크다! 기쁘다~!',
        "Whoa, so generous! I'm thrilled~!",
        '哇，真大方！好开心~！',
        'Вау, щедро! Как радостно~!',
        '¡Wau, qué generoso! ¡Qué feliz estoy!',
        'Wow, großzügig! Ich bin so froh~!',
      ),
      line(
        '루이자_3.wav',
        'こんなに応援してくれて、愛してるよ！',
        '이렇게 응원해주니 널 사랑해!',
        'You cheer me on this much, so I love you!',
        '你这么大力地支持我，我爱上你啦！',
        'Раз так меня поддерживаешь, люблю тебя!',
        '¡Con este ánimo tuyo, te amo!',
        'Wenn du mich so anfeuerst, hab ich dich lieb!',
      ),
    ],
  },
  '리메이': {
    variants: [
      line(
        '리메이_1.wav',
        'ありがとう。応える。',
        '고마워. 보답할게.',
        "Thanks. I'll repay you.",
        '谢了。我会回报的。',
        'Спасибо. Я отплачу тебе.',
        'Gracias. Te lo compensaré.',
        'Danke. Ich werd mich revanchieren.',
      ),
      line(
        '리메이_2.wav',
        '気前がいいな。感謝する。',
        '통 크네. 고마워.',
        "Generous, aren't you. Thanks.",
        '真大方。谢谢。',
        'Щедро. Спасибо.',
        'Qué generoso. Gracias.',
        'Großzügig. Danke.',
      ),
      line(
        '리메이_3.wav',
        'この恩、忘れない。必ず返す。',
        '이 은혜, 잊지 않을게. 반드시 갚지.',
        "I won't forget this kindness. I'll definitely repay it.",
        '这份恩情，我不会忘记的。一定会报答。',
        'Эту милость я не забуду. Обязательно отплачу.',
        'Esta bondad, no la olvidaré. Algún día te la devolveré.',
        'Diese Gunst werde ich nicht vergessen. Ich zahle sie bestimmt zurück.',
      ),
    ],
  },
  '시라카와 아야': {
    variants: [
      line(
        '시라카와 아야_1.wav',
        'ふっ、評価するわ。',
        '훗, 인정할게.',
        "Heh, I'll admit it.",
        '哼，算你识相，我认可了。',
        'Хм, признаю.',
        'Hmph, lo reconozco.',
        'Hmpf, das akzeptier ich.',
      ),
      line(
        '시라카와 아야_2.wav',
        'なかなか見所があるわね。感謝する。',
        '꽤 볼만하네. 고마워.',
        'Pretty impressive. Thanks.',
        '还挺有眼光呢。谢谢。',
        'Весьма впечатляет. Спасибо.',
        'No está nada mal. Gracias.',
        'Gar nicht übel. Danke.',
      ),
      line(
        '시라카와 아야_3.wav',
        'ふふ、嬉しいわ。あなたの感性を認める。',
        '후후, 기뻐. 네 안목을 인정할게.',
        "Hehe, I'm glad. I'll acknowledge your good eye.",
        '呵呵，真高兴。我认可你的眼光。',
        'Хе-хе, рада. Признаю твой вкус.',
        'Jeje, me alegro. Reconozco tu buen gusto.',
        'Hehe, ich freue mich. Deinen guten Geschmack erkenne ich an.',
      ),
    ],
  },
}

export function findDonationDataForCharacter(
  nameOrId: string | null | undefined,
): DonationCharacterData | null {
  if (!nameOrId) return null
  const query = nameOrId.trim()

  if (DONATION_DATA_BY_NAME[query]) return DONATION_DATA_BY_NAME[query]

  for (const [key, data] of Object.entries(DONATION_DATA_BY_NAME)) {
    if (query.includes(key) || key.includes(query)) return data
  }

  const qLower = query.toLowerCase()
  if (qLower.includes('rina') && !qLower.includes('senno')) {
    return DONATION_DATA_BY_NAME['미야자와 리나']
  }
  if (qLower.includes('senno')) return DONATION_DATA_BY_NAME['센노 리나']
  if (qLower.includes('misaki')) return DONATION_DATA_BY_NAME['타치바나 미사키']
  if (qLower.includes('megumi')) return DONATION_DATA_BY_NAME['사토 메구미']
  if (qLower.includes('miho')) return DONATION_DATA_BY_NAME['아키야마 미호']
  if (qLower.includes('mai')) return DONATION_DATA_BY_NAME['사쿠라기 마이']
  if (qLower.includes('luiza') || qLower.includes('louisa') || qLower.includes('luisa')) {
    return DONATION_DATA_BY_NAME['루이자']
  }
  if (qLower.includes('mei') || qLower.includes('rimei') || qLower.includes('limei')) {
    return DONATION_DATA_BY_NAME['리메이']
  }
  if (qLower.includes('aya')) return DONATION_DATA_BY_NAME['시라카와 아야']

  return null
}

function donationVoiceUrlOf(fileName: string): string {
  const baseUrl = import.meta.env.BASE_URL || '/'
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${cleanBase}audio/donation_voices/${encodeURIComponent(fileName)}`
}

/** 캐릭터별 3개 대사 중 하나를 랜덤 선택 (대사·음성 짝 맞춤) */
export function pickRandomDonationThanks(
  nameOrId: string | null | undefined,
  locale: Locale,
): { text: string; voiceUrl: string; index: number } | null {
  const data = findDonationDataForCharacter(nameOrId)
  if (!data || data.variants.length === 0) return null
  const index = Math.floor(Math.random() * data.variants.length)
  const variant = data.variants[index]!
  return {
    index,
    text: pickCharacterLocaleText(mergeCharacterLocaleText(variant.lines), locale),
    voiceUrl: donationVoiceUrlOf(variant.voiceFileName),
  }
}
