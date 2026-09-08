const fs = require('fs')
const path = require('path')
const { MAGIC, xorInPlace } = require('../electron/gamePak.cjs')

const ROOT = path.resolve(__dirname, '..')
const PUBLIC_DIR = path.join(ROOT, 'public')
const OUT_DIR = path.join(ROOT, 'build')
const OUT_FILE = path.join(OUT_DIR, 'game.dat')
const CHUNK = 1024 * 1024

function walkFiles(dir, base = dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.' || entry.name === '..') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkFiles(full, base, acc)
      continue
    }
    if (!entry.isFile()) continue
    if (entry.name === 'Thumbs.db' || entry.name === '.DS_Store') continue
    acc.push(path.relative(base, full).replace(/\\/g, '/'))
  }
  return acc
}

function xorCopyFile(srcPath, destFd, payloadOffset) {
  const srcFd = fs.openSync(srcPath, 'r')
  const buf = Buffer.alloc(CHUNK)
  let copied = 0
  let n
  while ((n = fs.readSync(srcFd, buf, 0, buf.length, copied)) > 0) {
    const chunk = buf.subarray(0, n)
    xorInPlace(chunk, payloadOffset + copied)
    fs.writeSync(destFd, chunk, 0, n)
    copied += n
  }
  fs.closeSync(srcFd)
  return copied
}

function main() {
  if (!fs.existsSync(PUBLIC_DIR)) {
    throw new Error(`public folder missing: ${PUBLIC_DIR}`)
  }
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const rels = walkFiles(PUBLIC_DIR).sort()
  const payloadTmp = `${OUT_FILE}.payload`
  if (fs.existsSync(payloadTmp)) fs.unlinkSync(payloadTmp)

  const payloadFd = fs.openSync(payloadTmp, 'w')
  const index = {}
  let offset = 0
  for (const rel of rels) {
    const abs = path.join(PUBLIC_DIR, rel)
    const size = xorCopyFile(abs, payloadFd, offset)
    index[rel] = [offset, size]
    offset += size
  }
  fs.closeSync(payloadFd)

  const indexJson = Buffer.from(JSON.stringify(index), 'utf8')
  xorInPlace(indexJson, 0)
  const header = Buffer.alloc(12)
  MAGIC.copy(header, 0)
  header.writeUInt32LE(indexJson.length, 8)

  const outFd = fs.openSync(OUT_FILE, 'w')
  fs.writeSync(outFd, header)
  fs.writeSync(outFd, indexJson)
  const payloadIn = fs.openSync(payloadTmp, 'r')
  const buf = Buffer.alloc(CHUNK)
  let copied = 0
  let n
  while ((n = fs.readSync(payloadIn, buf, 0, buf.length, copied)) > 0) {
    fs.writeSync(outFd, buf, 0, n)
    copied += n
  }
  fs.closeSync(payloadIn)
  fs.closeSync(outFd)
  fs.unlinkSync(payloadTmp)

  const mb = (fs.statSync(OUT_FILE).size / (1024 * 1024)).toFixed(1)
  console.log(`[pack-public] ${rels.length} files -> ${OUT_FILE} (${mb} MB)`)
}

try {
  main()
} catch (err) {
  console.error('[pack-public] failed:', err)
  process.exit(1)
}
