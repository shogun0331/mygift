import bundle from '../generated/reviewBundle.json'

export const IS_REVIEW_BUILD = import.meta.env.VITE_REVIEW_BUILD === 'true'

const SAVE_PREFIX = 'broadcast-save-'
const ACHIEVEMENT_KEY = 'broadcast_game_achievements'

/**
 * 심사용 빌드에서 올오픈 세이브·업적·갤러리 플래그를 localStorage에 주입한다.
 * 매 실행 시 덮어써서 심사자가 항상 동일 상태를 보게 한다.
 */
export function seedReviewBuildProgress(): void {
  if (!IS_REVIEW_BUILD) return
  if (typeof window === 'undefined' || !window.localStorage) return

  try {
    const save = bundle.save as { id: string }
    if (!save?.id) return

    // 다른 세이브가 남아 갤러리/목록을 어지럽히지 않도록 review 전용으로 정리
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && key.startsWith(SAVE_PREFIX) && key !== SAVE_PREFIX + save.id) {
        toRemove.push(key)
      }
    }
    for (const key of toRemove) localStorage.removeItem(key)

    localStorage.setItem(SAVE_PREFIX + save.id, JSON.stringify(bundle.save))
    localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify(bundle.achievements ?? {}))

    const flags = (bundle.flags ?? {}) as Record<string, string>
    for (const [key, value] of Object.entries(flags)) {
      localStorage.setItem(key, value)
    }

    const watched = (bundle.save as { watchedEventIds?: string[] }).watchedEventIds ?? []
    const watchedKey = (bundle as { watchedEventsKey?: string }).watchedEventsKey || 'broadcast-watched-events'
    localStorage.setItem(watchedKey, JSON.stringify(watched))
    localStorage.setItem('broadcast-review-seeded', String(bundle.generatedAt || Date.now()))
  } catch (err) {
    console.error('[reviewSeed] failed to seed review progress:', err)
  }
}
