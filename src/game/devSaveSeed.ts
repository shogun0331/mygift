import bundle from '../generated/devSRankTopSave.json'

const SAVE_PREFIX = 'broadcast-save-'

/**
 * 데브 실행 시 S랭크 전원·시청자 100만·일등기업 1위 세이브 슬롯을 넣는다.
 * 해당 슬롯만 추가하며, 한 번 넣은 뒤에는 플레이 진행을 덮어쓰지 않는다.
 */
export function seedDevSRankTopSave(): void {
  if (typeof window === 'undefined' || !window.localStorage) return

  try {
    const save = (bundle as { save?: { id?: string } }).save
    if (!save?.id) return
    const marker = `broadcast-seed-${save.id}-v2`
    if (localStorage.getItem(marker) === '1') return
    localStorage.setItem(SAVE_PREFIX + save.id, JSON.stringify(save))
    localStorage.setItem(marker, '1')
  } catch (err) {
    console.error('[devSaveSeed] failed to seed S-rank top save:', err)
  }
}
