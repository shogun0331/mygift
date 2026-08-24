// Recent Events / 정산 i18n 치환 검증 (문자열 $1 특수문자 문제 포함)
const fs = require('fs')

const files = ['KO.json', 'EN.json', 'JA.json', 'ZH-CN.json', 'RU.json', 'ES.json', 'DE.json']
const formatMoney = (v) => `$${Math.round(v).toLocaleString('en-US')}`

let failed = false
const check = (cond, label) => {
  if (!cond) failed = true
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`)
}

for (const f of files) {
  const j = JSON.parse(fs.readFileSync('src/locales/' + f, 'utf8'))
  const money = formatMoney(1234) // '$1,234'

  const donation = j.feed.donation
    .replace('{amount}', () => money)
    .replace('{name}', 'Miyazawa')
  check(donation.includes(money), `[${f}] donation keeps amount: ${donation}`)

  const viewers = j.feed.viewersGained.replace('{count}', '42').replace('{name}', 'Miyazawa')
  check(viewers.includes('42'), `[${f}] viewersGained count: ${viewers}`)

  const tax = j.feed.taxUpcoming
    .replace('{year}', '2031')
    .replace('{amount}', () => money)
  check(tax.includes('2031') && tax.includes(money), `[${f}] taxUpcoming: ${tax}`)

  const big = j.feed.bigDonation
    .replace('{name}', 'Miyazawa')
    .replace('{amount}', () => money)
  check(big.includes(money), `[${f}] bigDonation keeps amount: ${big}`)

  const topic = j.feed.donationTopic
    .replace('{name}', 'Miyazawa')
    .replace('{amount}', () => money)
  check(topic.includes(money), `[${f}] donationTopic keeps amount: ${topic}`)

  const spike = j.feed.viewersSpike.replace('{name}', 'Miyazawa')
  check(spike.includes('Miyazawa'), `[${f}] viewersSpike: ${spike}`)

  const topEarn = j.feed.monthlyTopEarn.replace('{name}', 'Miyazawa')
  check(topEarn.includes('Miyazawa'), `[${f}] monthlyTopEarn: ${topEarn}`)

  const taxNotice = j.feed.annualTaxNotice
    .replace('{year}', '2031')
    .replace('{amount}', () => money)
  check(taxNotice.includes('2031') && taxNotice.includes(money), `[${f}] annualTaxNotice: ${taxNotice}`)

  const taxNone = j.feed.annualTaxNone.replace('{year}', '2031')
  check(taxNone.includes('2031'), `[${f}] annualTaxNone: ${taxNone}`)

  check(j.feed.noSpecialEvents.trim() !== '', `[${f}] noSpecialEvents: ${j.feed.noSpecialEvents}`)

  check(
    j.settlement.expenseStudioOps.trim() !== '',
    `[${f}] expenseStudioOps: ${j.settlement.expenseStudioOps}`,
  )
  const eb = j.settlement.expenseEmptyBroadcast.replace('{percent}', '10')
  check(eb.includes('10%'), `[${f}] expenseEmptyBroadcast: ${eb}`)
  check(
    j.settlement.expenseStaffPayroll.trim() !== '',
    `[${f}] expenseStaffPayroll: ${j.settlement.expenseStaffPayroll}`,
  )
  const sc = j.settlement.expenseStaffCount.replace('{count}', '3')
  check(sc.includes('3'), `[${f}] expenseStaffCount: ${sc}`)
  const ce = j.settlement.careExpenseLabel.replace('{name}', 'Rina')
  check(ce.includes('Rina'), `[${f}] careExpenseLabel: ${ce}`)
  check(j.settlement.taxLabel.trim() !== '', `[${f}] taxLabel: ${j.settlement.taxLabel}`)
  const td = j.settlement.taxDetail.replace('{year}', '2031').replace('{amount}', () => money)
  check(td.includes('2031') && td.includes(money), `[${f}] taxDetail: ${td}`)
}

process.exit(failed ? 1 : 0)

