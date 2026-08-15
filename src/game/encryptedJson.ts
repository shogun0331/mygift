const XOR_KEY = [0x7e, 0x3f, 0x1a, 0x9b, 0x5c, 0xd2, 0x48, 0xfe]

function xorBytes(buffer: Uint8Array): Uint8Array {
  const result = new Uint8Array(buffer.length)
  for (let i = 0; i < buffer.length; i++) {
    result[i] = buffer[i] ^ XOR_KEY[i % XOR_KEY.length]
  }
  return result
}

/** 평문 JSON이든 XOR 암호문이든 파싱 */
export function parseMaybeEncryptedJsonBytes(buffer: Uint8Array): unknown {
  if (buffer.length === 0) return null
  const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes)
  const first = buffer[0]
  if (first === 0x7b || first === 0x5b) {
    try {
      return JSON.parse(text(buffer))
    } catch {
      // 복호화 시도
    }
  }
  try {
    return JSON.parse(text(xorBytes(buffer)))
  } catch {
    return JSON.parse(text(buffer))
  }
}

export async function fetchPublicJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null
  const buffer = new Uint8Array(await res.arrayBuffer())
  return parseMaybeEncryptedJsonBytes(buffer) as T
}
