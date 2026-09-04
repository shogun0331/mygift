export type ProposalDialogue = {
  ko: string
  ja: string
  en: string
  zh: string
  es: string
  de: string
  ru: string
}

export type ProposalItem = {
  characterName: string
  imageFileName: string
  voiceFileName: string
  dialogue: ProposalDialogue
}

export const PROPOSAL_DATA: ProposalItem[] = [
  {
    characterName: '미야자와 리나',
    imageFileName: '미야자와 리나.webp',
    voiceFileName: '미야자와 리나.wav',
    dialogue: {
      ko: '사장님… 저, 더 이상 떨어져 있고 싶지 않아요. 저와 결혼해 주세요.',
      ja: '社長さん… 私、もう離れたくありません。私と結婚してください。',
      en: "President... I don't want to be apart from you anymore. Please marry me.",
      zh: '社长… 我再也不想和你分开了。请和我结婚吧。',
      es: 'Presidente... Ya no quiero estar lejos de ti. Por favor, cásate conmigo.',
      de: 'Chef... Ich möchte nicht mehr von Ihnen getrennt sein. Bitte heiraten Sie mich.',
      ru: 'Директор... Я больше не хочу быть отдельно от вас. Пожалуйста, выходите за меня.',
    },
  },
  {
    characterName: '타치바나 미사키',
    imageFileName: '타치바나 미사키.webp',
    voiceFileName: '타치바나 미사키.wav',
    dialogue: {
      ko: '저기 사장님! 계속 같이 있고 싶어. 나를 아내로 삼아줘!',
      ja: 'ねえ社長さん！ ずっと一緒にいたいの。私のお嫁さんにしてよ！',
      en: 'Hey President! I want to be with you forever. Make me your wife!',
      zh: '喂社长！我想一直和你在一起。请让我做你的妻子吧！',
      es: '¡Oye, Presidente! Quiero estar contigo para siempre. ¡Hazme tu esposa!',
      de: 'Hey Chef! Ich möchte für immer bei dir sein. Mach mich zu deiner Frau!',
      ru: 'Эй, директор! Я хочу быть с тобой всегда. Сделай меня своей женой!',
    },
  },
  {
    characterName: '사토 메구미',
    imageFileName: '사토 메구미.webp',
    voiceFileName: '사토 메구미.wav',
    dialogue: {
      ko: '저기… 사장님. 계속 제 곁에 있어 주시겠어요…? 결혼해 주세요…',
      ja: 'あの… 社長さん。ずっと私のそばにいてくれますか…？ 結婚してください…',
      en: 'Um... President. Will you stay by my side forever...? Please marry me...',
      zh: '那个… 社长。你能一直陪在我身边吗…？ 请和我结婚吧…',
      es: 'Este... Presidente. ¿Estarías a mi lado para siempre...? Por favor, cásate conmigo...',
      de: 'Ähm... Chef. Wirst du für immer an meiner Seite bleiben...? Bitte heirate mich...',
      ru: 'Эмм... Директор. Ты будешь рядом со мной всегда...? Пожалуйста, женись на мне...',
    },
  },
  {
    characterName: '아키야마 미호',
    imageFileName: '아키야마 미호.webp',
    voiceFileName: '아키야마 미호.wav',
    dialogue: {
      ko: '…나랑 결혼해 주지 않겠어? 앞으로도 계속 네 곁에 있을게.',
      ja: '…俺と、結婚してくれないか。これから先もずっとお前のそばにいる。',
      en: "...Won't you marry me? I'll stay by your side for the rest of our lives.",
      zh: '…要和我结婚吗？今后的日子里我也将一直留在你身边。',
      es: '...¿No te casarías conmigo? Estaré a tu lado por el resto de nuestras vidas.',
      de: '...Willst du mich nicht heiraten? Ich werde für den Rest unseres Lebens an deiner Seite sein.',
      ru: '...Не выйдешь за меня? Я останусь рядом с тобой до конца жизни.',
    },
  },
  {
    characterName: '센노 리나',
    imageFileName: '센노 리나.webp',
    voiceFileName: '센노 리나.wav',
    dialogue: {
      ko: '제 최고의 파트너가 되어 주세요. 당신과 이 인생을 춤추고 싶어요.',
      ja: '私の一番のパートナーになってください。あなたと、この人生を踊りたいの。',
      en: 'Please be my best partner. I want to dance through this life with you.',
      zh: '请成为我最好的搭档。我想和你一起跳完这人生的舞步。',
      es: 'Por favor, sé mi mejor compañero. Quiero bailar esta vida contigo.',
      de: 'Bitte sei mein bester Partner. Ich möchte mit dir durch dieses Leben tanzen.',
      ru: 'Пожалуйста, стань моим лучшим партнером. Я хочу танцевать эту жизнь с тобой.',
    },
  },
  {
    characterName: '사쿠라기 마이',
    imageFileName: '사쿠라기 마이.webp',
    voiceFileName: '사쿠라기 마이.wav',
    dialogue: {
      ko: '…왜? 네가 평생 내 전속이 되고 싶어졌어. 결혼, 하자?',
      ja: '…なに？ あんたのこと、一生私の専属にしたくなっちゃった。結婚、しよ？',
      en: "...What? I decided I want you to be mine exclusively forever. Let's get married, okay?",
      zh: '…怎么了？我好想让你一生都做我的专属。我们结婚吧，好吗？',
      es: '...¿Qué? Decidí que quiero que seas mío exclusivamente para siempre. Casémonos, ¿vale?',
      de: '...Was? Ich habe beschlossen, dass ich dich für immer ganz für mich alleine haben will. Wollen wir heiraten?',
      ru: '...Что? Я решила, что хочу сделать тебя своим эксклюзивным на всю жизнь. Давай поженимся, а?',
    },
  },
  {
    characterName: '루이자',
    imageFileName: '루이자.webp',
    voiceFileName: '루이자.wav',
    dialogue: {
      ko: '사장님! 나 당신이랑 결혼하고 싶어! 쭉 같이 춤추자!',
      ja: '社長さん！ 私、あなたと結婚したいよ！ ずーっと一緒に踊ろうね！',
      en: "President! I want to marry you! Let's dance together forever and ever!",
      zh: '社长！我想和你结婚！让我们永远一起跳舞吧！',
      es: '¡Presidente! ¡Quiero casarme contigo! ¡Bailemos juntos por siempre jamás!',
      de: 'Chef! Ich möchte dich heiraten! Lass uns für immer zusammen tanzen!',
      ru: 'Директор! Я хочу выйти за тебя! Давай танцевать вместе целую вечность!',
    },
  },
  {
    characterName: '리메이',
    imageFileName: '리메이.webp',
    voiceFileName: '리메이.wav',
    dialogue: {
      ko: '나랑 결혼해. 앞으로의 인생은 내가 책임질게.',
      ja: '俺と結婚しろ。これから先の人生、俺が責任取る。',
      en: 'Marry me. I will take responsibility for the rest of your life.',
      zh: '和我结婚吧。今后的人生的由我负责。',
      es: 'Cásate conmigo. Asumiré la responsabilidad de tu vida a partir de ahora.',
      de: 'Heirate mich. Ich werde für den Rest deines Lebens die Verantwortung übernehmen.',
      ru: 'Выходи за меня. Я возьму ответственность за твоя дальнейшую жизнь.',
    },
  },
  {
    characterName: '시라카와 아야',
    imageFileName: '시라카와 아야.webp',
    voiceFileName: '시라카와 아야.wav',
    dialogue: {
      ko: '…나 같은 여자라도 괜찮다면, 평생의 반려자가 되어 주지 않겠어?',
      ja: '…私のような女でよければ、生涯の伴侶になってくれないかしら。',
      en: "...If a woman like me is alright with you, won't you become my lifelong partner?",
      zh: '…如果像我这样的女人也可以的话，愿不愿意成为我一生的伴侣呢？',
      es: '...Si una mujer como yo está bien para ti, ¿no te convertirías en mi compañero de por vida?',
      de: '...Wenn eine Frau wie ich dir recht ist, würdest du dann nicht mein Lebenspartner werden?',
      ru: '...Если такая женщина, как я, подходит тебе, не согласишься ли стать моим партнером на всю жизнь?',
    },
  },
]

export function getProposalItem(name: string): ProposalItem | null {
  const norm = (name || '').trim().toLowerCase()
  return PROPOSAL_DATA.find((item) => item.characterName.trim().toLowerCase() === norm) ?? null
}

export function getProposalVoiceUrl(name: string): string | null {
  const item = getProposalItem(name)
  if (!item) return null
  return `${import.meta.env.BASE_URL}proposal_voices/${item.voiceFileName}`
}

export function getProposalImageUrl(name: string): string | null {
  const item = getProposalItem(name)
  if (!item) return null
  return `${import.meta.env.BASE_URL}proposal_images/${item.imageFileName}`
}

export function getProposalDialogueText(name: string, locale: string = 'ko'): string {
  const item = getProposalItem(name)
  if (!item) return ''
  const loc = (locale || 'ko').toLowerCase()
  if (loc.startsWith('ja')) return item.dialogue.ja
  if (loc.startsWith('en')) return item.dialogue.en
  if (loc.startsWith('zh')) return item.dialogue.zh
  if (loc.startsWith('es')) return item.dialogue.es
  if (loc.startsWith('de')) return item.dialogue.de
  if (loc.startsWith('ru')) return item.dialogue.ru
  return item.dialogue.ko
}
