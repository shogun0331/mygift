import {
  mergeCharacterLocaleText,
  pickCharacterLocaleText,
  type CharacterLocaleText,
} from './characterLocales'
import type { Locale } from '../locales/i18n'

export type DateLineVariant = {
  voiceFileName: string
  lines: CharacterLocaleText
}

export type DateCharacterData = {
  variants: DateLineVariant[]
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
): DateLineVariant {
  return {
    voiceFileName,
    lines: { ja, ko, en, 'zh-cn': zh, ru, es, de },
  }
}

/** 데이트/H 신청 대사 3종 + 음성 (public/audio/date_voices/{이름}_{1|2|3}.wav) */
export const DATE_DATA_BY_NAME: Record<string, DateCharacterData> = {
  '미야자와 리나': {
    variants: [
      line(
        '미야자와 리나_1.wav',
        'あの…お休みの日、よかったら一緒に過ごしませんか？',
        '저기… 쉬는 날, 괜찮으시면 같이 시간 보내지 않으실래요?',
        'Um... on your day off, if it\'s alright with you, would you like to spend some time together?',
        '那个……休息日的时候，方便的话，要不要和我一起度过时光呢？',
        'Слушайте… в выходной, если вам не трудно, не проведёте ли время вместе со мной?',
        'Oye… el día de descanso, si no te molesta, ¿no quieres pasar el rato conmigo?',
        'Ähm… An deinem freien Tag, wenn es dir recht ist, würdest du nicht ein bisschen Zeit mit mir verbringen wollen?',
      ),
      line(
        '미야자와 리나_2.wav',
        'もしご都合がよければ、私とデートしてほしいんです。',
        '시간 괜찮으시면, 저와 데이트해 주셨으면 해요.',
        'If you have the time, I\'d like you to go on a date with me.',
        '如果您时间合适的话，希望能和我约个会。',
        'Если у вас будет время, я хотела бы, чтобы вы сходили со мной на свидание.',
        'Si tienes tiempo libre, me gustaría que salieras conmigo de cita.',
        'Wenn du Zeit hast, würde ich mich freuen, wenn du mit mir auf ein Date gehen würdest.',
      ),
      line(
        '미야자와 리나_3.wav',
        '次のお休み、あなたと過ごせたら嬉しいな、って…',
        '다음 휴일에, 당신과 보낼 수 있으면 좋겠다… 싶어서요.',
        'On your next day off, I wish I could spend it with you... that\'s what I was hoping.',
        '下一个休息日，如果能和你一起度过就好了……我这么想着。',
        'В следующий выходной я бы хотела… провести время с вами… вот и позвала.',
        'El próximo día libre me gustaría… poder pasarlo contigo.',
        'Am nächsten freien Tag… wäre es schön, wenn ich die Zeit mit dir verbringen könnte, dachte ich mir.',
      ),
    ],
  },
  '타치바나 미사키': {
    variants: [
      line(
        '타치바나 미사키_1.wav',
        'ねえ社長さん、今度一緒に遊びに行かない？',
        '저기 사장님, 다음에 같이 놀러 안 갈래요?',
        'Hey, boss, want to go hang out somewhere together next time?',
        '那个，社长，下次要不要一起去玩呀？',
        'Эй, шеф, не сходим ли в следующий раз куда-нибудь развлечься?',
        'Oye, jefe, ¿no nos vamos a dar una vuelta la próxima vez?',
        'Hey Chef, hast du nicht Lust, beim nächsten Mal zusammen etwas zu unternehmen?',
      ),
      line(
        '타치바나 미사키_2.wav',
        '次の休み、二人でどっか行こうよ！',
        '다음 휴일, 둘이서 어디 가지 않을래요?',
        'Next day off, want to go somewhere just the two of us?',
        '下一个休息日，我们两个人去哪里逛逛好不好？',
        'В следующий выходной не сходим ли куда-нибудь вдвоём?',
        'El próximo día libre, ¿no nos vamos a algún lado tú y yo?',
        'Am nächsten freien Tag, lass uns doch zu zweit irgendwohin gehen, ja?',
      ),
      line(
        '타치바나 미사키_3.wav',
        '私とデートしてくれない？絶対楽しいよ！',
        '저랑 데이트 안 해줄래요? 분명 재밌을 거예요!',
        'Won\'t you go on a date with me? I\'m sure it\'ll be fun!',
        '能不能和我约会呀？一定会很好玩的！',
        'Не сходишь со мной на свидание? Будет точно весело!',
        '¿No quieres tener una cita conmigo? ¡Seguro que va a estar buenísima!',
        'Gehst du nicht mit mir auf ein Date? Es wird bestimmt lustig!',
      ),
    ],
  },
  '사토 메구미': {
    variants: [
      line(
        '사토 메구미_1.wav',
        'あの…もしよかったら、私と出かけませんか…？',
        '저기… 괜찮으시면, 저랑 나가시지 않으실래요…?',
        'Um... if it\'s alright with you, would you... go out with me...?',
        '那个……方便的话，要不要和我一起出去呢……？',
        'Э-это… если можно… не прогуляетесь ли вы со мной…?',
        'Oye… si no te molesta, ¿no querrías salir conmigo…?',
        'Ähm… wenn es dir recht ist, würdest du… mit mir ausgehen…?',
      ),
      line(
        '사토 메구미_2.wav',
        'よかったら…お時間、いただけませんか…？',
        '괜찮으시면… 시간을 주실 수 있을까요…?',
        'If it\'s alright... could you spare me some time...?',
        '如果方便的话……能给我一点时间吗……？',
        'Если вам не трудно… не уделите ли вы мне немного времени…?',
        'Si no tienes problema… ¿podrías regalarme un rato de tu tiempo…?',
        'Wenn du nichts dagegen hast… hättest du… ein bisschen Zeit für mich…?',
      ),
      line(
        '사토 메구미_3.wav',
        '一緒に、どこか行きたいな…って思って…',
        '같이 어디 가고 싶다… 싶어서요…',
        'I want to go somewhere with you... that\'s how I feel...',
        '想着……能和你一起去哪里就好了……',
        'Мне бы очень хотелось… сходить куда-нибудь вместе…',
        'Es que… me dan ganas de ir a algún lado contigo…',
        'Ich würde gern… irgendwohin mit dir gehen… dachte ich mir.',
      ),
    ],
  },
  '아키야마 미호': {
    variants: [
      line(
        '아키야마 미호_1.wav',
        '…暇なら、一緒にどうだ。',
        '…시간 되면, 같이 어때.',
        '...If you\'re free, how about we get together.',
        '……有空的话，要不要一起。',
        '…Если будет время, как насчёт вместе.',
        '…Si tienes tiempo, qué te parece que salgamos juntos.',
        '…Wenn du Zeit hast, lass uns zusammen etwas unternehmen.',
      ),
      line(
        '아키야마 미호_2.wav',
        '週末、二人で出かけないか。',
        '주말에, 둘이 나가지 않을래.',
        'This weekend, let\'s go out just the two of us.',
        '周末的时候，我们两个人出去走走吧。',
        'В выходные не сходим ли куда-нибудь вдвоём.',
        'El fin de semana, sal tú y yo.',
        'Am Wochenende, lass uns zu zweit rausgehen.',
      ),
      line(
        '아키야마 미호_3.wav',
        '…たまには、お前と出かけたいんだ。',
        '…가끔은, 너랑 나가고 싶어.',
        '...Sometimes, I want to go out with you.',
        '……偶尔，也想和你一起出去。',
        '…Иногда хочется сходить куда-нибудь с тобой.',
        '…A veces, yo también quiero salir contigo.',
        '…Ab und zu möchte ich mit dir ausgehen.',
      ),
    ],
  },
  '센노 리나': {
    variants: [
      line(
        '센노 리나_1.wav',
        'お時間のある時、私とお出かけしませんか？',
        '시간 되실 때, 저와 외출하지 않으시겠어요?',
        'When you have the time, would you go out with me?',
        '您有空的时候，要不要和我一起外出呢？',
        'Когда у вас будет время, не прогуляетесь ли со мной?',
        'Cuando tengas tiempo, ¿no te gustaría salir conmigo?',
        'Wenn du Zeit hast, würdest du nicht mit mir ausgehen?',
      ),
      line(
        '센노 리나_2.wav',
        'もしよろしければ、次の休みを私にください。',
        '괜찮으시다면, 다음 휴일을 저에게 주세요.',
        'If it\'s alright with you, please give me your next day off.',
        '如果方便的话，请把下一个休息日留给我吧。',
        'Если вам не трудно, посвятите мне следующий выходной.',
        'Si no tienes problema, regálame tu próximo día libre.',
        'Wenn es dir nichts ausmacht, schenk mir deinen nächsten freien Tag.',
      ),
      line(
        '센노 리나_3.wav',
        'あなたとデートしたいと思っているんですの。',
        '당신과 데이트하고 싶다고 생각하고 있어요.',
        'I\'ve been thinking that I\'d like to go on a date with you.',
        '我一直想着能和你约会。',
        'Я всё думаю о том, что хочу сходить с вами на свидание.',
        'Es que estoy pensando en que me gustaría tener una cita contigo.',
        'Ich habe das Gefühl, ich würde gern mit dir auf ein Date gehen.',
      ),
    ],
  },
  '사쿠라기 마이': {
    variants: [
      line(
        '사쿠라기 마이_1.wav',
        'ねえ、たまには二人で出かけない？',
        '있잖아, 가끔은 둘이 나가지 않을래?',
        'Hey, want to go out just the two of us sometimes?',
        '喂，偶尔我们两个人出去走走吧？',
        'Слушай, не сходить ли нам иногда куда-нибудь вдвоём?',
        'Oye, ¿no salimos tú y yo de vez en cuando?',
        'Hey, lass uns nicht ab und zu auch mal zu zweit rausgehen?',
      ),
      line(
        '사쿠라기 마이_2.wav',
        '一緒に飲みに行かない？私が奢るわ。',
        '같이 술 마시러 갈래? 내가 살게.',
        'Want to go grab a drink together? I\'ll pay.',
        '要不要一起去喝酒？我请客。',
        'Пойдёшь со мной выпить? Я угощаю.',
        '¿Quieres ir a tomarnos algo? Invito yo.',
        'Lass uns zusammen was trinken gehen? Ich lade dich ein.',
      ),
      line(
        '사쿠라기 마이_3.wav',
        'あんたと過ごすのも、悪くないかなって思ってね。',
        '너랑 보내는 것도 나쁘지 않겠다 싶어서 말이야.',
        'I figured spending time with you wouldn\'t be so bad, you know.',
        '觉得和你在一起也不错嘛，所以才这么说的。',
        'Вот я подумала, что провести время с тобой было бы совсем неплохо.',
        'Es que pensé que pasarla contigo tampoco estaría nada mal.',
        'Ich dachte mir, mit dir Zeit zu verbringen wäre gar nicht so übel.',
      ),
    ],
  },
  '루이자': {
    variants: [
      line(
        '루이자_1.wav',
        '社長さん、一緒に遊びに行かない？',
        '사장님, 같이 놀러 안 갈래요?',
        'Boss, want to go hang out together?',
        '社长，要不要一起去玩呀？',
        'Шеф, не сходим куда-нибудь развлечься?',
        '¡Jefe, vamos a pasear!',
        'Chef, lass uns doch zusammen etwas unternehmen!',
      ),
      line(
        '루이자_2.wav',
        '今度デートしようよ！いつがいい？',
        '다음에 데이트 하자! 언제가 좋아?',
        'Let\'s go on a date next time! When works for you?',
        '下次约会吧！你什么时候方便？',
        'Давай в следующий раз на свидание! Когда тебе удобно?',
        '¡Tengamos una cita la próxima! ¿Cuándo te queda bien?',
        'Lass uns bald auf ein Date gehen! Wann passt es dir?',
      ),
      line(
        '루이자_3.wav',
        '二人で楽しいことしたいな～！どう？',
        '둘이서 재밌는 거 하고 싶어~! 어때?',
        'I want to do something fun together, just us two~! What do you say?',
        '想和你一起做些好玩的事情~！怎么样？',
        'Хочу вдвоём заняться чем-нибудь весёленьким~! Как тебе?',
        '¡Quiero hacer algo divertido tú y yo! ¿Qué te parece?',
        'Ich will mit dir zu zweit etwas Lustiges machen~! Wie wäre es?',
      ),
    ],
  },
  '리메이': {
    variants: [
      line(
        '리메이_1.wav',
        '暇な時、一緒に飯でもどうだ。',
        '시간 될 때, 같이 밥이라도 어때.',
        'When you\'re free, how about we grab a meal sometime.',
        '有空的时候，一起吃个饭什么的怎么样。',
        'Когда будет время, как насчёт вместе поесть.',
        'Cuando tengas tiempo, qué tal si vamos a comer algo juntos.',
        'Wenn du Zeit hast, wie wäre es, zusammen etwas zu essen?',
      ),
      line(
        '리메이_2.wav',
        '次の休み、俺と出かけてくれないか。',
        '다음 휴일에, 나랑 나가주지 않을래.',
        'Next day off, won\'t you go out with me?',
        '下一个休息日，能不能陪我出去呀。',
        'В следующий выходной не сходишь ли со мной куда-нибудь.',
        'El próximo día libre, ¿no sales conmigo?',
        'Am nächsten freien Tag, gehst du nicht mit mir aus?',
      ),
      line(
        '리메이_3.wav',
        'たまには、お前とゆっくりしたい。',
        '가끔은, 너랑 천천히 있고 싶어.',
        'Sometimes, I want to take it slow with you.',
        '偶尔，想和你一起慢慢地待着。',
        'Иногда хочется просто спокойно побыть с тобой.',
        'A veces… también me dan ganas de estar tranquila contigo.',
        'Ab und zu möchte ich einfach in Ruhe mit dir zusammen sein.',
      ),
    ],
  },
  '시라카와 아야': {
    variants: [
      line(
        '시라카와 아야_1.wav',
        '…よければ、私とお茶でもどうかしら。',
        '…괜찮으면, 저랑 차라도 어때요.',
        '...If it\'s alright, how about tea with me?',
        '……如果不介意的话，要不要和我一起喝杯茶？',
        '…Если вы не против, как насчёт выпить со мной чаю?',
        '…Si no te importa, ¿qué te parece un café conmigo?',
        '…Wenn es dir recht ist, wie wäre es mit einem Tee mit mir?',
      ),
      line(
        '시라카와 아야_2.wav',
        'もし迷惑でなければ、一緒に夕食でも。',
        '폐가 안 된다면, 같이 저녁이라도.',
        'If it\'s not a bother, how about dinner together.',
        '如果不会给您添麻烦的话，一起共进晚餐如何。',
        'Если я не помешаю, может, поужинаем вместе?',
        'Si no es molestia, qué tal si cenamos juntos.',
        'Wenn ich nicht störe, wie wäre es mit einem gemeinsamen Abendessen?',
      ),
      line(
        '시라카와 아야_3.wav',
        'あなたと、少しゆっくりした時間を過ごしたいの。',
        '당신이랑 조금 천천히 있는 시간을 보내고 싶어요.',
        'I\'d like to spend a little time together with you, taking it slow.',
        '想和你一起度过一段慢慢来的悠闲时光。',
        'Я хочу провести с вами немного времени, не торопясь.',
        'Me gustaría pasar un momento tranquilo y sin prisa contigo.',
        'Ich möchte gern ein wenig ruhige Zeit mit dir verbringen.',
      ),
    ],
  },
}

export function findDateDataForCharacter(
  nameOrId: string | null | undefined,
): DateCharacterData | null {
  if (!nameOrId) return null
  const query = nameOrId.trim()

  if (DATE_DATA_BY_NAME[query]) return DATE_DATA_BY_NAME[query]

  for (const [key, data] of Object.entries(DATE_DATA_BY_NAME)) {
    if (query.includes(key) || key.includes(query)) return data
  }

  const qLower = query.toLowerCase()
  if (qLower.includes('rina') && !qLower.includes('senno')) {
    return DATE_DATA_BY_NAME['미야자와 리나']
  }
  if (qLower.includes('senno')) return DATE_DATA_BY_NAME['센노 리나']
  if (qLower.includes('misaki')) return DATE_DATA_BY_NAME['타치바나 미사키']
  if (qLower.includes('megumi')) return DATE_DATA_BY_NAME['사토 메구미']
  if (qLower.includes('miho')) return DATE_DATA_BY_NAME['아키야마 미호']
  if (qLower.includes('mai')) return DATE_DATA_BY_NAME['사쿠라기 마이']
  if (qLower.includes('luiza') || qLower.includes('louisa') || qLower.includes('luisa')) {
    return DATE_DATA_BY_NAME['루이자']
  }
  if (qLower.includes('mei') || qLower.includes('rimei') || qLower.includes('limei')) {
    return DATE_DATA_BY_NAME['리메이']
  }
  if (qLower.includes('aya')) return DATE_DATA_BY_NAME['시라카와 아야']

  return null
}

function dateVoiceUrlOf(fileName: string): string {
  const baseUrl = import.meta.env.BASE_URL || '/'
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${cleanBase}audio/date_voices/${encodeURIComponent(fileName)}`
}

/** 캐릭터별 3개 데이트 신청 대사 중 하나를 랜덤 선택 (대사·음성 짝 맞춤) */
export function pickRandomDateOfferLine(
  nameOrId: string | null | undefined,
  locale: Locale,
): { text: string; voiceUrl: string; index: number } | null {
  const data = findDateDataForCharacter(nameOrId)
  if (!data || data.variants.length === 0) return null
  const index = Math.floor(Math.random() * data.variants.length)
  const variant = data.variants[index]!
  return {
    index,
    text: pickCharacterLocaleText(mergeCharacterLocaleText(variant.lines), locale),
    voiceUrl: dateVoiceUrlOf(variant.voiceFileName),
  }
}
