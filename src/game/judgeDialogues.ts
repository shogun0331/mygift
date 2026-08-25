export type SupportedLocale = 'ko' | 'en' | 'ja' | 'zh' | 'es' | 'th' | 'vi'

// 🔴 저만족도 (0~29%) 멘트 5개 (7개국어)
export const LOW_SATISFACTION_DIALOGUES: Record<SupportedLocale, string[]> = {
  ko: [
    "이게... 네가 보여주고 싶었던 전부야? 실망했어.",
    "아직 멀었어..",
    "기대 이하야. 다른 걸 보여줄 순 없나?",
    "지루해. 이런 건 시간 낭비야.",
    "시시한데.."
  ],
  en: [
    "Is this... all you wanted to show me? I'm disappointed.",
    "Not even close..",
    "Below expectations. Can't you show something else?",
    "Boring. This is a waste of time.",
    "Boring.."
  ],
  ja: [
    "これが…見せたかった全てなのか？失望したよ。",
    "まだまだだな‥",
    "期待外れだ。他に見せるものはないのか？",
    "退屈だ。こんなのは時間の無駄だな。",
    "くだらないな‥"
  ],
  zh: [
    "这就是……你想展示的全部吗？真令人失望。",
    "还差得远呢……",
    "低于预期。不能拿点别的给我看吗？",
    "真无聊。这纯粹是浪费时间。",
    "真无趣……"
  ],
  es: [
    "¿Esto es... todo lo que querías mostrarme? Decepcionante.",
    "Aún te falta mucho..",
    "Por debajo de lo esperado. ¿No tienes nada más?",
    "Aburrido. Esto es una pérdida de tiempo.",
    "Qué insípido.."
  ],
  th: [
    "นี่คือ... ทั้งหมดที่คุณอยากแสดงเหรอ? ผิดหวังจริงๆ",
    "ยังห่างไกลนัก..",
    "ต่ำกว่าที่คาดไว้ แสดงอย่างอื่นไม่ได้เหรอ?",
    "น่าเบื่อ แบบนี้เสียเวลาเปล่า",
    "จืดชืดจัง.."
  ],
  vi: [
    "Đây là... tất cả những gì bạn muốn thể hiện sao? Thất vọng thật.",
    "Còn kém xa lắm..",
    "Dưới mức kỳ vọng. Không thể diễn cái khác sao?",
    "Tẻ nhạt. Thế này chỉ làm lãng phí thời gian.",
    "Nhạt nhẽo quá.."
  ]
}

// 🟡 중만족도 (30~79%) 멘트 5개 (7개국어)
export const MID_SATISFACTION_DIALOGUES: Record<SupportedLocale, string[]> = {
  ko: [
    "음... 나쁘지 않아. 좀 더 볼까?",
    "생각보다 괜찮은데? 계속해봐.",
    "조금씩 나아지고 있군. 기대해볼게.",
    "이 정도면 무난한데... 아쉽네.",
    "흥미로워지기 시작했어. 다음은?"
  ],
  en: [
    "Hmm... not bad. Shall I watch a bit more?",
    "Better than expected. Keep going.",
    "Improving step by step. I'll look forward to it.",
    "Fairly decent... but a bit lacking.",
    "Starting to get interesting. What's next?"
  ],
  ja: [
    "ふむ…悪くないな。もう少し見ようか？",
    "思ったより悪くないぞ？続けてみろ。",
    "少しずつ良くなっているな。期待しているぞ。",
    "まあまあだな…だが物足りない。",
    "面白くなってきたぞ。次はどうする？"
  ],
  zh: [
    "嗯……还不错。要不要再看一会？",
    "比想象中好呢？继续吧。",
    "在一点点变好呢。值得期待。",
    "这样算尚可……但有点可惜。",
    "开始变得有趣了。下一步呢？"
  ],
  es: [
    "Hmm... nada mal. ¿Vemos un poco más?",
    "¡Mejor de lo que pensaba! Continúa.",
    "Mejorando paso a paso. Estaré atento.",
    "Bastante aceptable... pero le falta algo.",
    "Se está poniendo interesante. ¿Qué sigue?"
  ],
  th: [
    "หืม... ไม่เลวนี่ ลองดูต่ออีกหน่อยไหม?",
    "ดีกว่าที่คิดไว้นะ? ลุยต่อเลย",
    "ค่อยๆ ดีขึ้นเรื่อยๆ นะ รอดูอยู่",
    "ระดับนี้ก็ใช้ได้... แต่ยังเสียดายนิดหน่อย",
    "เริ่มน่าสนใจแล้วสิ ต่อไปล่ะ?"
  ],
  vi: [
    "Ừm... không tệ. Xem thêm chút nữa nhé?",
    "Tốt hơn tôi nghĩ đấy! Tiếp tục đi.",
    "Đang tốt lên từng chút một. Tôi sẽ kỳ vọng đấy.",
    "Mức này cũng tạm ổn... nhưng hơi tiếc.",
    "Bắt đầu thú vị rồi đây. Tiếp theo là gì?"
  ]
}

// 🟢 고만족도 (80~100%) 멘트 5개 (7개국어)
export const HIGH_SATISFACTION_DIALOGUES: Record<SupportedLocale, string[]> = {
  ko: [
    "이거야! 바로 이 맛이야!",
    "완벽해! 이걸 기다렸어!",
    "대단하다! 이런 퍼포먼스는 처음이야.",
    "자극적이면서도 우아해... 완전히 빠져들었어.",
    "인정할 수밖에 없군. 너희가 해냈어!"
  ],
  en: [
    "This is it! Exactly what I wanted!",
    "Perfect! I've been waiting for this!",
    "Amazing! I've never seen such a performance.",
    "Thrilling yet elegant... I'm completely mesmerized.",
    "I have to admit it. You guys pulled it off!"
  ],
  ja: [
    "これだ！まさにこれを求めていた！",
    "完璧だ！これが見たかったんだよ！",
    "素晴らしい！こんなパフォーマンスは初めてだ。",
    "刺激的でいながらエレガント…完全に魅了されたよ。",
    "認めざるを得ないな。君たちの勝ちだ！"
  ],
  zh: [
    "就是这个！这就是我要的感觉！",
    "太完美了！我一直在期待这个！",
    "太棒了！第一次看到这样的表演。",
    "既刺激又优雅……完全沦陷了。",
    "不得不承认。你们做到了！"
  ],
  es: [
    "¡Esto es! ¡Justo lo que quería!",
    "¡Perfecto! ¡Llevaba esperando esto!",
    "¡Increíble! Nunca había visto tal actuación.",
    "Sensual pero elegante... me ha cautivado por completo.",
    "Tengo que admitirlo. ¡Lo habéis conseguido!"
  ],
  th: [
    "ใช่เลย! นี่แหละที่ต้องการ!",
    "สมบูรณ์แบบ! รอคอยสิ่งนี้มานาน!",
    "สุดยอด! ไม่เคยเห็นการแสดงแบบนี้มาก่อนเลย",
    "ตื่นเต้นเร้าใจและสง่างาม... หลงใหลจนโงหัวไม่ขึ้นแล้ว",
    "ต้องยอมรับจริงๆ พวกเธอทำได้แล้ว!"
  ],
  vi: [
    "Chính là nó! Đỉnh cao là đây!",
    "Hoàn hảo! Tôi đã chờ đợi điều này!",
    "Tuyệt vời! Lần đầu tiên tôi thấy màn trình diễn thế này.",
    "Kích thích nhưng vẫn thanh lịch... tôi bị mê hoặc hoàn toàn rồi.",
    "Phải thừa nhận thôi. Các bạn đã làm được!"
  ]
}

// ⚔️ 심사관 공격 멘트 5개 (7개국어)
export const JUDGE_ATTACK_DIALOGUES: Record<SupportedLocale, string[]> = {
  ko: [
    "흥... 이 정도면 나름대로 준비한 티가 나는군.",
    "오호... 의외로 괜찮은데? 계속해봐.",
    "자, 이제 진짜 실력을 보여줘. 기대하고 있을게.",
    "흥미롭군... 이 정도면 내 시간을 투자할 가치가 있겠어.",
    "좋아, 한번 제대로 감상해보지. 네가 얼마나 할 수 있는지."
  ],
  en: [
    "Hmph... at least it shows you put some effort in.",
    "Oho... surprisingly decent. Keep it up.",
    "Now then, show me your true skills. I'll be waiting.",
    "Intriguing... this might actually be worth my time.",
    "Alright, let me enjoy this properly. Show me what you've got."
  ],
  ja: [
    "ふん…まあ、それなりに準備してきたようだな。",
    "ほう…案外悪くないな。もっと見せてみろ。",
    "さあ、本当の実力を見せてみろ。期待しているぞ。",
    "興味深いな…これなら私の時間を割く価値がありそうだ。",
    "いいだろう、じっくり鑑賞してやろう。どこまでやれるか見ものだな。"
  ],
  zh: [
    "哼……这倒是能看出你做了一些准备呢。",
    "哦？意外地还不错？继续表演吧。",
    "来吧，展示你真正的实力。我会期待着的。",
    "有趣……看来值得我投入一些时间呢。",
    "很好，那就让我好好欣赏一下吧。看看你能做到什么程度。"
  ],
  es: [
    "Hum... al menos se nota que te has preparado un poco.",
    "Oho... sorprendentemente aceptable. Sigue así.",
    "Vamos, muéstrame tu verdadero talento. Estaré esperando.",
    "Interesante... esto podría valer mi tiempo después de todo.",
    "Está bien, disfrutémoslo como es debido. Muéstrame de qué eres capaz."
  ],
  th: [
    "หึ... อย่างน้อยก็เห็นว่าเตรียมตัวมาพอสมควรนะ",
    "โอ้โฮ... ใช้ได้เกินคาดแฮะ ทำต่อไปสิ",
    "เอาล่ะ ทีนี้แสดงฝีมือที่แท้จริงให้ดูหน่อย รอดูอยู่นะ",
    "น่าสนใจ... แบบนี้ก็คุ้มค่าที่จะเสียเวลาหน่อย",
    "ดีเลย งั้นขอชมแบบตั้งใจหน่อยสิ ว่าเธอจะทำได้แค่ไหน"
  ],
  vi: [
    "Hừm... ít nhất cũng cho thấy có sự chuẩn bị đấy.",
    "Ồ... ngạc nhiên là không tệ chút nào? Tiếp tục đi.",
    "Nào, bây giờ hãy thể hiện thực lực thật sự đi. Tôi đang kỳ vọng đấy.",
    "Thú vị đấy... thế này thì đáng để tôi bỏ thời gian ra xem.",
    "Được lắm, hãy để tôi thưởng thức một cách tử tế xem. Để xem bạn làm được đến đâu."
  ]
}

// 🏆 승급 통과 성공 & 진행 버튼 7개국어 텍스트
export const AUDIT_PASS_TITLE: Record<SupportedLocale, string> = {
  ko: "🎉 승급심사 통과 성공!",
  en: "🎉 Promotion Audit Passed!",
  ja: "🎉 昇格審査 合格成功！",
  zh: "🎉 晋升审查 通过成功！",
  es: "🎉 ¡Auditoría de Ascenso Aprobada!",
  th: "🎉 ผ่านการประเมินการเลื่อนขั้นสำเร็จ!",
  vi: "🎉 Thăng Hạng Thành Công!"
}

export const CONFIRM_PROCEED_BTN: Record<SupportedLocale, string> = {
  ko: "확인 및 진행",
  en: "Confirm & Proceed",
  ja: "確認して進む",
  zh: "确认并继续",
  es: "Confirmar y Continuar",
  th: "ยืนยันและดำเนินการต่อ",
  vi: "Xác Nhận & Tiếp Tục"
}

export const AUDIT_FAIL_TITLE: Record<SupportedLocale, string> = {
  ko: "❌ 승급심사 통과 실패...",
  en: "❌ Promotion Audit Failed...",
  ja: "❌ 昇格審査 不合格...",
  zh: "❌ 晋升审查 未通过...",
  es: "❌ Auditoría de Ascenso Fallida...",
  th: "❌ ไม่ผ่านการประเมินการเลื่อนขั้น...",
  vi: "❌ Thăng Hạng Thất Bại...",
}

export const SATISFY_JUDGE_TITLE: Record<SupportedLocale, string> = {
  ko: "🔥 심사관을 만족시켜라!",
  en: "🔥 Satisfy the Judge!",
  ja: "🔥 審査員を満足させろ！",
  zh: "🔥 征服审查员！",
  es: "🔥 ¡Satisface al Juez!",
  th: "🔥 ทำคะแนนให้พึงพอใจกรรมการ!",
  vi: "🔥 Chinh Phục Giám Khảo!",
}

export const SELECT_CARD_PROMPT: Record<SupportedLocale, string> = {
  ko: "✨ 심사관을 만족시킬 카드를 선택해 주세요.",
  en: "✨ Please select a card to satisfy the judge.",
  ja: "✨ 審査員を満足させるカードを選択してください。",
  zh: "✨ 请选择能够征服审查员的卡牌。",
  es: "✨ Selecciona una carta para satisfacer al juez.",
  th: "✨ โปรดเลือกการ์ดเพื่อทำให้กรรมการพึงพอใจ",
  vi: "✨ Vui lòng chọn thẻ để chinh phục giám khảo.",
}

export const AUDIT_DOC_PASS_NOTICE: Record<
  SupportedLocale,
  (tierName: string) => { title: string; body: string; button: string }
> = {
  ko: (tierName) => ({
    title: `📋 [${tierName}] 승급심사 서류 통과!`,
    body: `축하합니다! ${tierName} 승급을 위한 자격 요건 및 1차 서류 심사에 통과하였습니다.\n\n승급심사 진행을 위해 출전할 4명의 크리에이터 덱 카드를 배치해 주세요.`,
    button: `🚀 출전 덱 세팅 및 심사 도전`,
  }),
  en: (tierName) => ({
    title: `📋 [${tierName}] Audit Documents Passed!`,
    body: `Congratulations! You have passed the eligibility and document review for ${tierName} promotion.\n\nPlease arrange your 4 creator deck cards to begin the official performance audit.`,
    button: `🚀 Set Up Deck & Begin Audit`,
  }),
  ja: (tierName) => ({
    title: `📋 [${tierName}] 昇格審査 書類通過！`,
    body: `おめでとうございます！ ${tierName} 昇格のための資格要件および第1次書類審査に通過しました。\n\n正式なパフォーマンス審査のため、出陣する4人のクリエイターデッキカードを配置してください。`,
    button: `🚀 デッキ設定＆審査挑戦`,
  }),
  zh: (tierName) => ({
    title: `📋 [${tierName}] 晋升审查 材料审核通过！`,
    body: `恭喜！您已通过 ${tierName} 晋升的资格要求及第一轮材料审核。\n\n请配置出战的4位创作者卡组，准备开启正式绩效审查。`,
    button: `🚀 配置卡组并开始审查`,
  }),
  es: (tierName) => ({
    title: `📋 ¡Documentos Aprobados para ${tierName}!`,
    body: `¡Felicidades! Ha pasado los requisitos y la revisión de documentos para el ascenso a ${tierName}.\n\nPor favor coloque sus 4 cartas de creadores para comenzar la auditoría oficial.`,
    button: `🚀 Configurar Mazo y Comenzar`,
  }),
  th: (tierName) => ({
    title: `📋 ผ่านการพิจารณาเอกสาร ${tierName}!`,
    body: `ยินดีด้วย! คุณผ่านคุณสมบัติและการพิจารณาเอกสารสำหรับการเลื่อนขั้นเป็น ${tierName} แล้ว\n\nโปรดวางการ์ดครีเอเตอร์ 4 คนเพื่อเริ่มการประเมินอย่างเป็นทางการ`,
    button: `🚀 ตั้งค่าเด็ค & เริ่มการประเมิน`,
  }),
  vi: (tierName) => ({
    title: `📋 Thông Qua Hồ Sơ Thăng Hạng ${tierName}!`,
    body: `Xin chúc mừng! Bạn đã vượt qua điều kiện và xét duyệt hồ sơ cho đợt thăng hạng ${tierName}.\n\nVui lòng sắp xếp 4 thẻ creator để bắt đầu buổi đánh giá chính thức.`,
    button: `🚀 Cấu Hình Thẻ & Bắt Đầu`,
  }),
}

// 지원되는 언어 안전 매핑 헬퍼
export function normalizeLocale(locale: string): SupportedLocale {
  const loc = (locale || 'ko').toLowerCase()
  if (loc.startsWith('en')) return 'en'
  if (loc.startsWith('ja')) return 'ja'
  if (loc.startsWith('zh')) return 'zh'
  if (loc.startsWith('es')) return 'es'
  if (loc.startsWith('th')) return 'th'
  if (loc.startsWith('vi')) return 'vi'
  return 'ko'
}

// 만족도 %에 따른 랜덤 멘트 추출 헬퍼
export function getJudgeReactionDialogue(pct: number, localeStr: string): string {
  const loc = normalizeLocale(localeStr)
  let pool: string[]
  if (pct >= 80) {
    pool = HIGH_SATISFACTION_DIALOGUES[loc]
  } else if (pct >= 30) {
    pool = MID_SATISFACTION_DIALOGUES[loc]
  } else {
    pool = LOW_SATISFACTION_DIALOGUES[loc]
  }
  const idx = Math.floor(Math.random() * pool.length)
  return pool[idx] || pool[0]
}

// 심사관 공격 시 랜덤 멘트 추출 헬퍼
export function getJudgeAttackDialogue(localeStr: string): string {
  const loc = normalizeLocale(localeStr)
  const pool = JUDGE_ATTACK_DIALOGUES[loc]
  const idx = Math.floor(Math.random() * pool.length)
  return pool[idx] || pool[0]
}

// 승급 성공 타이틀 획득
export function getAuditPassTitle(localeStr: string): string {
  const loc = normalizeLocale(localeStr)
  return AUDIT_PASS_TITLE[loc] || AUDIT_PASS_TITLE.ko
}

// 승급 실패 타이틀 획득
export function getAuditFailTitle(localeStr: string): string {
  const loc = normalizeLocale(localeStr)
  return AUDIT_FAIL_TITLE[loc] || AUDIT_FAIL_TITLE.ko
}

// 승급 서류 통과 안내 획득
export function getAuditDocPassNotice(localeStr: string, tierName: string) {
  const loc = normalizeLocale(localeStr)
  const fn = AUDIT_DOC_PASS_NOTICE[loc] || AUDIT_DOC_PASS_NOTICE.ko
  return fn(tierName)
}

// 심사관을 만족시켜라 타이틀 획득
export function getSatisfyJudgeTitle(localeStr: string): string {
  const loc = normalizeLocale(localeStr)
  return SATISFY_JUDGE_TITLE[loc] || SATISFY_JUDGE_TITLE.ko
}

// 심사관을 만족시킬 카드를 선택해주세요 안내 획득
export function getSelectCardPrompt(localeStr: string): string {
  const loc = normalizeLocale(localeStr)
  return SELECT_CARD_PROMPT[loc] || SELECT_CARD_PROMPT.ko
}

// 확인 및 진행 버튼 텍스트 획득
export function getConfirmProceedBtnText(localeStr: string): string {
  const loc = normalizeLocale(localeStr)
  return CONFIRM_PROCEED_BTN[loc] || CONFIRM_PROCEED_BTN.ko
}
