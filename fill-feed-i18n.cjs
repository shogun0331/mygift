// Recent Events / 월간 정산 하드코딩 문구용 i18n 키 추가 (7개국)
// 용법: node fill-feed-i18n.cjs
const fs = require('fs')
const path = require('path')

const DIR = path.join(__dirname, 'src', 'locales')
const FILES = ['KO.json', 'EN.json', 'JA.json', 'ZH-CN.json', 'RU.json', 'ES.json', 'DE.json']

const FEED = {
  KO: {
    viewersGained: '📈 시청자 {count}명 증가! ({name})',
    taxUpcoming: '다음 달 연간 소득세 과세 예정 ({year}년 누적 수익 {amount})',
    bigDonation: '{name} 대형 후원! ({amount})',
    donationTopic: '{name} 후원 화제! ({amount})',
    viewersSpike: '{name} 시청자 급증!',
    monthlyTopEarn: '{name} 월간 최고 수익!',
    annualTaxNotice: '{year}년 연간 소득세 과세 (−{amount})',
    annualTaxNone: '{year}년 연간 소득세 과세 (해당 없음)',
    noSpecialEvents: '이번 달 특이 이벤트 없음',
  },
  EN: {
    viewersGained: '📈 {count} viewers gained! ({name})',
    taxUpcoming: 'Annual income tax due next month ({year} cumulative revenue: {amount})',
    bigDonation: '{name} huge donation! ({amount})',
    donationTopic: '{name} donation makes waves! ({amount})',
    viewersSpike: '{name} viewers surge!',
    monthlyTopEarn: '{name} top earner of the month!',
    annualTaxNotice: '{year} annual income tax (−{amount})',
    annualTaxNone: '{year} annual income tax (none due)',
    noSpecialEvents: 'No notable events this month',
  },
  JA: {
    viewersGained: '📈 視聴者 {count}人増加! ({name})',
    taxUpcoming: '来月、年間所得税の課税予定 ({year}年の累計収益 {amount})',
    bigDonation: '{name} 大型ドネーション! ({amount})',
    donationTopic: '{name} のドネーションが話題に! ({amount})',
    viewersSpike: '{name} 視聴者急増!',
    monthlyTopEarn: '{name} 月間最高収益!',
    annualTaxNotice: '{year}年の年間所得税 (−{amount})',
    annualTaxNone: '{year}年の年間所得税 (該当なし)',
    noSpecialEvents: '今月は特筆すべきイベントなし',
  },
  'ZH-CN': {
    viewersGained: '📈 观众增加 {count}人！({name})',
    taxUpcoming: '下月年度所得税开征 ({year}年累计收益 {amount})',
    bigDonation: '{name} 大额赞助！({amount})',
    donationTopic: '{name} 的赞助引发热议！({amount})',
    viewersSpike: '{name} 观众激增！',
    monthlyTopEarn: '{name} 本月最高收益！',
    annualTaxNotice: '{year}年度所得税 (−{amount})',
    annualTaxNone: '{year}年度所得税（无）',
    noSpecialEvents: '本月无特殊事件',
  },
  RU: {
    viewersGained: '📈 Просмотры +{count}! ({name})',
    taxUpcoming: 'Годовой подоходный налог — в следующем месяце (доход за {year}: {amount})',
    bigDonation: '{name} — крупное пожертвование! ({amount})',
    donationTopic: 'Пожертвование {name} — тема дня! ({amount})',
    viewersSpike: 'Зрители {name} резко выросли!',
    monthlyTopEarn: '{name} — лучший доход месяца!',
    annualTaxNotice: 'Годовой подоходный налог за {year} (−{amount})',
    annualTaxNone: 'Годовой подоходный налог за {year} (не применимо)',
    noSpecialEvents: 'В этом месяце не было заметных событий',
  },
  ES: {
    viewersGained: '📈 ¡{count} espectadores más! ({name})',
    taxUpcoming: 'Impuesto anual sobre la renta el próximo mes (ingresos acumulados de {year}: {amount})',
    bigDonation: '¡{name} gran donación! ({amount})',
    donationTopic: '¡La donación de {name} da que hablar! ({amount})',
    viewersSpike: '¡Aumento de espectadores de {name}!',
    monthlyTopEarn: '¡{name} mejor ingreso del mes!',
    annualTaxNotice: 'Impuesto anual de {year} (−{amount})',
    annualTaxNone: 'Impuesto anual de {year} (no aplica)',
    noSpecialEvents: 'Sin eventos destacados este mes',
  },
  DE: {
    viewersGained: '📈 {count} Zuschauer gewonnen! ({name})',
    taxUpcoming: 'Jahreseinkommensteuer fällig im nächsten Monat ({year} kumulierter Umsatz: {amount})',
    bigDonation: '{name} große Spende! ({amount})',
    donationTopic: '{name} Spende macht Schlagzeilen! ({amount})',
    viewersSpike: 'Zuschaueransturm bei {name}!',
    monthlyTopEarn: '{name} Höchsteinnahmen des Monats!',
    annualTaxNotice: 'Jahreseinkommensteuer {year} (−{amount})',
    annualTaxNone: 'Jahreseinkommensteuer {year} (keine fällig)',
    noSpecialEvents: 'Keine besonderen Ereignisse in diesem Monat',
  },
}

const SETTLEMENT = {
  KO: {
    expenseStudioOps: '스튜디오 운영비',
    expenseEmptyBroadcast: '무배치 방송 ({percent}%)',
    expenseStaffPayroll: '스탭 인건비',
    expenseStaffCount: '{count}명',
    careExpenseLabel: '컨디션 케어 ({name})',
    taxLabel: '세금 과세',
    taxDetail: '{year}년 연간 수익 {amount} 기준',
  },
  EN: {
    expenseStudioOps: 'Studio operating cost',
    expenseEmptyBroadcast: 'No-creator broadcast ({percent}%)',
    expenseStaffPayroll: 'Staff payroll',
    expenseStaffCount: '{count} staff',
    careExpenseLabel: 'Condition care ({name})',
    taxLabel: 'Income tax',
    taxDetail: 'based on {year} annual revenue {amount}',
  },
  JA: {
    expenseStudioOps: 'スタジオ運営費',
    expenseEmptyBroadcast: '未配置の放送 ({percent}%)',
    expenseStaffPayroll: 'スタッフ人件費',
    expenseStaffCount: '{count}人',
    careExpenseLabel: 'コンディションケア ({name})',
    taxLabel: '所得税',
    taxDetail: '{year}年の年間収益 {amount} 基準',
  },
  'ZH-CN': {
    expenseStudioOps: '演播室运营费',
    expenseEmptyBroadcast: '无主播放送 ({percent}%)',
    expenseStaffPayroll: '员工人工费',
    expenseStaffCount: '{count}人',
    careExpenseLabel: '状态照料 ({name})',
    taxLabel: '所得税',
    taxDetail: '基于{year}年年度收益 {amount}',
  },
  RU: {
    expenseStudioOps: 'Эксплуатационные расходы студии',
    expenseEmptyBroadcast: 'Эфир без креаторов ({percent}%)',
    expenseStaffPayroll: 'Зарплата персонала',
    expenseStaffCount: '{count} чел.',
    careExpenseLabel: 'Уход за состоянием ({name})',
    taxLabel: 'Подоходный налог',
    taxDetail: 'на основе годового дохода {amount} за {year}',
  },
  ES: {
    expenseStudioOps: 'Costo operativo del estudio',
    expenseEmptyBroadcast: 'Emisión sin creadores ({percent}%)',
    expenseStaffPayroll: 'Nómina del personal',
    expenseStaffCount: '{count} empleados',
    careExpenseLabel: 'Cuidado de condición ({name})',
    taxLabel: 'Impuesto sobre la renta',
    taxDetail: 'según ingresos anuales de {year}: {amount}',
  },
  DE: {
    expenseStudioOps: 'Studiobetriebskosten',
    expenseEmptyBroadcast: 'Sendung ohne Creator ({percent}%)',
    expenseStaffPayroll: 'Personalkosten',
    expenseStaffCount: '{count} Mitarbeiter',
    careExpenseLabel: 'Zustandsbetreuung ({name})',
    taxLabel: 'Einkommensteuer',
    taxDetail: 'basierend auf {year} Jahresumsatz {amount}',
  },
}

for (const file of FILES) {
  const lang = file.replace('.json', '')
  const filePath = path.join(DIR, file)
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  if (!json.feed || !json.settlement) throw new Error(`missing section in ${file}`)
  Object.assign(json.feed, FEED[lang])
  Object.assign(json.settlement, SETTLEMENT[lang])
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8')
  console.log(`updated ${file} (feed +${Object.keys(FEED[lang]).length}, settlement +${Object.keys(SETTLEMENT[lang]).length})`)
}
