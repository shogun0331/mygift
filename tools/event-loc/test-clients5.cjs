// clients5 엔드포인트 상세 테스트 — 용법: node test-clients5.cjs
// (터미널 캡처 불안정 → 결과를 out/test-result.txt 로 기록)
const https = require('https')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, 'out', 'test-result.txt')

function translate(text, target) {
  return new Promise((resolve, reject) => {
    const q = encodeURIComponent(text)
    const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=ko&tl=${target}&q=${q}`
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (x) => {
      let d = ''
      x.on('data', (c) => (d += c))
      x.on('end', () => {
        if (x.statusCode !== 200) {
          reject(new Error(`HTTP ${x.statusCode}: ${d.slice(0, 100)}`))
          return
        }
        try {
          const j = JSON.parse(d)
          if (Array.isArray(j) && typeof j[0] === 'string') resolve(j.join(''))
          else if (Array.isArray(j) && Array.isArray(j[0])) resolve(j[0].map((s) => s[0]).join(''))
          else resolve(JSON.stringify(j).slice(0, 200))
        } catch (e) {
          reject(new Error('PARSE: ' + d.slice(0, 100)))
        }
      })
    })
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')) })
    req.on('error', reject)
  })
}

const TESTS = [
  ['en', '미야자와 리나가 다리를 꼰다. 치마 끝이 허벅지 위로 밀려 올라간다.'],
  ['en', '"…난 네 대표야. 크리에이터를 그런 눈으로 보지 않아요."'],
  ['en', '그녀는 지금 내 발기를 확인하고 있다. 대표니까 참아야 해.'],
  ['ja', '한낮의 공원. 햇살이 벤치 위로 쏟아진다. 미야자와 리나가 벤치 옆에 먼저 도착해 팔짱을 낀 채 서 있다.'],
  ['ja', '미야자와 리나가 원피스를 어깨에서 아래로 밀어 내린다. 흰 원피스와 브라가 한 번에 허리까지 흘러내리고, 가슴이 그대로 드러난다.'],
  ['zh-cn', '입꼬리만 살짝 올린다.'],
  ['ru', '정지 이미지 — 미야자와 리나 상반신, 어깨끈 흘러내려 브라 윗라인 노출.'],
  ['es', '평소엔 방송국에서 사무적으로만 마주치던 얼굴인데… 이렇게 사적인 자리에서 보니, 저 평상복 차림이 오히려 더 신경 쓰인다.'],
  ['de', '뼈가 있다. 시크한 척하면서 저렇게 파고들 줄은… 여기서 넘어가면 안 된다. 나는 그녀의 대표니까.'],
]

async function main() {
  const lines = []
  for (const [lang, text] of TESTS) {
    try {
      const out = await translate(text, lang)
      lines.push(`[${lang}] OK ${out}`)
    } catch (e) {
      lines.push(`[${lang}] ERR ${text.slice(0, 30)} => ${e.message}`)
    }
    fs.writeFileSync(OUT, lines.join('\n'), 'utf8') // 즉시 기록
    await new Promise((r) => setTimeout(r, 250))
  }
  lines.push('DONE')
  fs.writeFileSync(OUT, lines.join('\n'), 'utf8')
}

main()
