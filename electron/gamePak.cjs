const fs = require('fs')
const { Transform } = require('stream')

const MAGIC = Buffer.from('BGPAK01\0')
const KEY = Buffer.from([0x42, 0x47, 0x8a, 0x31, 0xc4, 0x77, 0x09, 0xe2, 0x5d, 0x13, 0xa8, 0x6f])

function xorInPlace(buf, startOffset) {
  const keyLen = KEY.length
  for (let i = 0; i < buf.length; i++) {
    buf[i] ^= KEY[(startOffset + i) % keyLen]
  }
  return buf
}

class XorTransform extends Transform {
  constructor(startOffset) {
    super()
    this.offset = startOffset
  }

  _transform(chunk, _enc, cb) {
    const out = Buffer.from(chunk)
    xorInPlace(out, this.offset)
    this.offset += out.length
    cb(null, out)
  }
}

function open(filePath) {
  const fd = fs.openSync(filePath, 'r')
  const header = Buffer.alloc(12)
  if (fs.readSync(fd, header, 0, 12, 0) !== 12) {
    fs.closeSync(fd)
    throw new Error('game.dat header truncated')
  }
  if (!header.subarray(0, 8).equals(MAGIC)) {
    fs.closeSync(fd)
    throw new Error('game.dat magic mismatch')
  }
  const indexLen = header.readUInt32LE(8)
  const indexBuf = Buffer.alloc(indexLen)
  if (fs.readSync(fd, indexBuf, 0, indexLen, 12) !== indexLen) {
    fs.closeSync(fd)
    throw new Error('game.dat index truncated')
  }
  xorInPlace(indexBuf, 0)
  const parsed = JSON.parse(indexBuf.toString('utf8'))
  const index = new Map()
  for (const [key, value] of Object.entries(parsed)) {
    const rel = String(key).replace(/\\/g, '/')
    if (!Array.isArray(value) || value.length < 2) continue
    index.set(rel, { offset: Number(value[0]), size: Number(value[1]) })
  }
  return {
    filePath,
    fd,
    index,
    payloadStart: 12 + indexLen,
  }
}

function close(pak) {
  if (pak && pak.fd != null) {
    fs.closeSync(pak.fd)
    pak.fd = null
  }
}

function readEntrySync(pak, entry) {
  if (!pak || !entry || entry.size <= 0) return Buffer.alloc(0)
  const buf = Buffer.alloc(entry.size)
  const bytes = fs.readSync(pak.fd, buf, 0, entry.size, pak.payloadStart + entry.offset)
  if (bytes !== entry.size) {
    throw new Error(`game.dat short read (${bytes}/${entry.size})`)
  }
  xorInPlace(buf, entry.offset)
  return buf
}

function createEntryStream(pak, entry, start, end) {
  const from = Math.max(0, start)
  const to = Math.min(entry.size - 1, end)
  const absStart = pak.payloadStart + entry.offset + from
  const absEnd = pak.payloadStart + entry.offset + to
  const raw = fs.createReadStream(pak.filePath, { start: absStart, end: absEnd })
  return raw.pipe(new XorTransform(entry.offset + from))
}

module.exports = {
  MAGIC,
  KEY,
  XorTransform,
  xorInPlace,
  open,
  close,
  readEntrySync,
  createEntryStream,
}
