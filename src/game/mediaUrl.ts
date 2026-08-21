/** media:// 또는 상대경로를 재생 가능한 src로 만들고, 교체 즉시 반영되도록 캐시 키를 붙임 */
export function resolveMediaSrc(url: string | null | undefined, cacheKey?: string | number | null): string {
  if (!url) return ''

  // blob/data는 그대로
  if (url.startsWith('blob:') || url.startsWith('data:')) return url

  let resolved = url.split('?')[0] ?? url

  if (resolved.startsWith('media://')) {
    const rel = resolved.slice('media://'.length).replace(/^\/+/, '')
    const inElectron = typeof window !== 'undefined' && Boolean(window.electronAPI)
    if (inElectron) {
      // 패키징된 asar 안 영상은 file:// 상대경로로 못 읽음 → 커스텀 프로토콜 유지
      resolved = `media://${rel}`
    } else if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
      resolved = `/${rel}`
    } else {
      resolved = `./${rel}`
    }
  } else if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
    // keep absolute http as-is (without query we stripped — restore path only)
  }

  if (cacheKey == null || cacheKey === '') return resolved
  const joiner = resolved.includes('?') ? '&' : '?'
  return `${resolved}${joiner}v=${encodeURIComponent(String(cacheKey))}`
}

export function characterMediaUrl(
  characterId: string,
  kind: 'image' | 'video',
  fileName: string,
): string {
  const folder = kind === 'image' ? 'images' : 'videos'
  return resolveMediaSrc(`media://characters/${characterId}/${folder}/${fileName}`)
}
