// Google gtx 번역 엔드포인트 테스트 — 용법: node test-gtx.cjs
const https = require('https')

const SAMPLES = [
  '한낮의 공원. 햇살이 벤치 위로 쏟아진다.',
  '"…오셨네요."',
  '미야자와 리나가 다리를 꼰다. 치마 끝이 허벅지 위로 밀려 올라간다.',
]

function translate(text, target) {
  return new Promise((resolve, reject) => {
    const q = encodeURIComponent(text)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=${target}&dt=t&q=${q}`
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`))
            return
          }
          try {
            const j = JSON.parse(data)
            resolve((j[0] || []).map((seg) => seg[0]).join(''))
          } catch (e) {
            reject(new Error('PARSE: ' + data.slice(0, 200)))
          }
        })
      })
      .on('error', reject)
  })
}

async function main() {
  for (const lang of ['en', 'ja']) {
    console.log(`=== ko -> ${lang} ===`)
    for (const s of SAMPLES) {
      try {
        const out = await translate(s, lang)
        console.log('IN :', s)
        console.log('OUT:', out)
      } catch (e) {
        console.log('ERR:', e.message)
      }
    }
  }
}

main()
