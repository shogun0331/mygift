/** VN 스킵 버튼 표시 여부. 개발 모드·에디터는 항상, 실제 빌드의 인게임은 1회 이상 시청한 이벤트만. */
export function shouldShowVnSkip(options: {
  mode?: 'debug' | 'game'
  alreadyWatched?: boolean
  allowSkip?: boolean
}): boolean {
  if (typeof options.allowSkip === 'boolean') return options.allowSkip
  if (options.mode !== 'game') return true
  if (import.meta.env.DEV) return true
  return Boolean(options.alreadyWatched)
}
