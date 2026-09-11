const fs = require('fs')
const path = require('path')
const { Converter } = require('opencc-js')

const convert = Converter({ from: 'cn', to: 'tw' })
const root = path.join(__dirname, '..')

function walkConvert(value) {
  if (typeof value === 'string') return convert(value)
  if (Array.isArray(value)) return value.map(walkConvert)
  if (value && typeof value === 'object') {
    const next = {}
    for (const [key, nested] of Object.entries(value)) next[key] = walkConvert(nested)
    return next
  }
  return value
}

function writeConverted(srcRel, destRel) {
  const src = path.join(root, srcRel)
  const dest = path.join(root, destRel)
  const raw = fs.readFileSync(src, 'utf8')
  if (src.endsWith('.json')) {
    const parsed = JSON.parse(raw)
    fs.writeFileSync(dest, `${JSON.stringify(walkConvert(parsed), null, 2)}\n`, 'utf8')
    return
  }
  fs.writeFileSync(dest, convert(raw), 'utf8')
}

writeConverted('src/locales/ZH-CN.json', 'src/locales/ZH-TW.json')
writeConverted('src/data/sns/line.zh.txt', 'src/data/sns/line.zh-tw.txt')
writeConverted('src/data/sns/S1.zh.txt', 'src/data/sns/S1.zh-tw.txt')
writeConverted('src/data/sns/S2.zh.txt', 'src/data/sns/S2.zh-tw.txt')
writeConverted('src/data/sns/S3.zh.txt', 'src/data/sns/S3.zh-tw.txt')
writeConverted('src/data/chat/userChat.zh.json', 'src/data/chat/userChat.zh-tw.json')

console.log('wrote ZH-TW UI/SNS/chat packs (event loc skipped)')
