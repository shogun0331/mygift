/**
 * 탑 HUD 퀘스트(임무) 시스템 — 한 줄 지시형 + 캐릭터 지정형.
 * 모든 임무는 특정 캐릭터를 지목한다(프로필·이름 표시).
 * 한 턴(달)에 임무 하나만 부여 → 대상 캐릭터로 수행 시 (V) 체크 + 예상매출 수준 보상.
 * 완료 감지는 InGame 행동 핸들러에서 signalQuest(kind, creatorId) 호출로 이뤄진다.
 */

export type QuestKind = 'sns' | 'train' | 'vacation' | 'promote'

export type QuestDef = {
  kind: QuestKind
  /** KO 다국어 키 (mission.quest.<kind>) — {name} 포함 */
  textKey: string
  icon: string
}

export const QUEST_DEFS: Record<QuestKind, QuestDef> = {
  sns: { kind: 'sns', textKey: 'mission.quest.sns', icon: '📱' },
  train: { kind: 'train', textKey: 'mission.quest.train', icon: '🎯' },
  vacation: { kind: 'vacation', textKey: 'mission.quest.vacation', icon: '🏖️' },
  promote: { kind: 'promote', textKey: 'mission.quest.promote', icon: '⭐' },
}

export type QuestAvailability = {
  /** 등급 승급(돌파) 가능한 캐릭터 존재 */
  canPromote: boolean
  /** 체력 부족(특별휴가 대상) 캐릭터 존재 */
  hasLowStamina: boolean
  /** SNS 발행 가능(게시물 잔여) 캐릭터 존재 */
  canSns: boolean
  /** 트레이닝 가능 캐릭터 존재 */
  canTrain: boolean
  /** 보유 캐릭터가 아예 없는지 (없으면 임무 없음) */
  hasAnyCreator: boolean
}

/**
 * 한 턴에 줄 임무 하나를 선택한다(모두 캐릭터 지정형).
 * - 가능한 임무들 중 하나를 고른다(단조 반복 방지).
 * - 직전 턴과 같은 임무는, 다른 대안이 있으면 피한다.
 * - 가능한 게 없으면 null(임무 없음).
 */
export function pickQuestKind(
  a: QuestAvailability,
  prev?: QuestKind | null,
): QuestKind | null {
  if (!a.hasAnyCreator) return null

  const applicable: QuestKind[] = []
  if (a.canPromote) applicable.push('promote')
  if (a.hasLowStamina) applicable.push('vacation')
  if (a.canSns) applicable.push('sns')
  if (a.canTrain) applicable.push('train')

  if (applicable.length === 0) return null

  let pool = applicable
  if (applicable.length > 1 && prev && applicable.includes(prev)) {
    pool = applicable.filter((k) => k !== prev)
  }

  return pool[Math.floor(Math.random() * pool.length)] ?? applicable[0] ?? null
}
