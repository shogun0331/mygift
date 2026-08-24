import type { Grade, OwnedCreator, RegisteredCharacter } from './characters'
import { conditionFromScore } from './condition'
import { rollNegotiatedSalary } from './salary'
import { clampStats, rollInt, rollStatsForGrade, type CharacterStats } from './stats'

export type ScoutOffer = {
  template: RegisteredCharacter
  grade: Grade
  stats: CharacterStats
  salary: number
}

/** 스카우트 런타임 상태 (턴 = broadcastMonthNumber) */
export type ScoutSystemState = {
  nextCheckTurn: number
  failStreak: number
  lastAppearTurn: number
  permanentExcludeIds: string[]
  activeOffer: ScoutOffer | null
  offerAppearedTurn: number | null
  hasUnread: boolean
  /** 첫 스카우트 강제 등장 대기 (풀 준비되면 즉시 스폰) */
  openingScoutPending: boolean
  /** 첫 영입 협상은 무조건 승낙 */
  firstHireGuaranteed: boolean
  /** 성공적으로 등장한 횟수 (1·2회차 100%, 이후 50%) */
  appearCount: number
  /** @deprecated 10위 프리미엄 스카웃 — 국 등급 스카웃으로 대체 */
  premiumScout: boolean
}

export function enablePremiumScout(state: ScoutSystemState): ScoutSystemState {
  return state
}

export function createInitialScoutState(
  currentTurn: number,
  opts?: { openingDone?: boolean },
): ScoutSystemState {
  const turn = Math.max(1, Math.round(currentTurn))
  const openingDone = opts?.openingDone ?? false
  return {
    nextCheckTurn: turn,
    failStreak: 0,
    lastAppearTurn: turn - 6,
    permanentExcludeIds: [],
    activeOffer: null,
    offerAppearedTurn: null,
    hasUnread: false,
    openingScoutPending: !openingDone,
    firstHireGuaranteed: !openingDone,
    appearCount: 0,
    premiumScout: false,
  }
}

function pickRandomTemplate(
  pool: RegisteredCharacter[],
  excludeIds: Set<string>,
): RegisteredCharacter | null {
  const available = pool.filter((character) => !excludeIds.has(character.id))
  if (available.length === 0) return null
  return available[Math.floor(Math.random() * available.length)] ?? null
}

export function createScoutOffer(template: RegisteredCharacter, grade: Grade): ScoutOffer {
  const stats = rollStatsForGrade(grade, template.statType)
  return {
    template,
    grade,
    stats,
    salary: rollNegotiatedSalary(stats, grade),
  }
}

/** 스카우트 — 보유 제외 후 랜덤 1명. 오퍼 등급 = 호출 측 지정 */
export function createRandomScoutOffer(
  registered: RegisteredCharacter[],
  ownedIds: Iterable<string>,
  offerGrade: Grade,
): ScoutOffer | null {
  const template = pickRandomTemplate(registered, new Set(ownedIds))
  if (!template) return null
  return createScoutOffer(template, offerGrade)
}

function buildExcludeSet(
  ownedIds: Iterable<string>,
  permanentExcludeIds: Iterable<string>,
): Set<string> {
  return new Set([...ownedIds, ...permanentExcludeIds])
}

export function hasScoutPool(
  registered: RegisteredCharacter[],
  ownedIds: Iterable<string>,
  permanentExcludeIds: Iterable<string>,
): boolean {
  return pickRandomTemplate(registered, buildExcludeSet(ownedIds, permanentExcludeIds)) != null
}

function expireActiveOffer(
  state: ScoutSystemState,
  options?: { permanentExclude?: boolean },
): ScoutSystemState {
  if (!state.activeOffer) return state
  const id = state.activeOffer.template.id
  const permanentExclude = options?.permanentExclude !== false
  const permanentExcludeIds =
    permanentExclude && !state.permanentExcludeIds.includes(id)
      ? [...state.permanentExcludeIds, id]
      : state.permanentExcludeIds
  return {
    ...state,
    permanentExcludeIds,
    activeOffer: null,
    offerAppearedTurn: null,
    hasUnread: false,
  }
}

function trySpawnOffer(
  state: ScoutSystemState,
  currentTurn: number,
  registered: RegisteredCharacter[],
  ownedIds: Iterable<string>,
  options?: { force?: boolean },
): ScoutSystemState {
  const exclude = buildExcludeSet(ownedIds, state.permanentExcludeIds)
  const template = pickRandomTemplate(registered, exclude)
  const scheduleNext = (): ScoutSystemState => ({
    ...state,
    nextCheckTurn: currentTurn + rollInt(2, 3),
  })

  if (!template) {
    return scheduleNext()
  }

  if (!options?.force) {
    return scheduleNext()
  }

  const offer = createScoutOffer(template, 'C')
  return {
    ...state,
    activeOffer: offer,
    offerAppearedTurn: currentTurn,
    failStreak: 0,
    lastAppearTurn: currentTurn,
    nextCheckTurn: currentTurn + rollInt(2, 3),
    hasUnread: true,
    openingScoutPending: false,
    appearCount: state.appearCount + 1,
  }
}

/**
 * 새 게임 시작/풀 로드 시 첫 스카우트 무조건 등장
 */
export function ensureOpeningScout(
  state: ScoutSystemState,
  currentTurn: number,
  registered: RegisteredCharacter[],
  ownedIds: Iterable<string>,
): ScoutSystemState {
  if (!state.openingScoutPending) return state
  if (state.activeOffer) {
    return { ...state, openingScoutPending: false }
  }
  const spawned = trySpawnOffer(state, currentTurn, registered, ownedIds, { force: true })
  if (spawned.activeOffer) return spawned
  // 풀이 아직 없으면 대기 유지
  return { ...state, openingScoutPending: true, nextCheckTurn: currentTurn }
}

/**
 * 새 턴(달) 진입 시 호출.
 * 일반 턴 카드 등장은 하지 않는다. 오프닝 강제 스카웃만 유지.
 */
export function advanceScoutTurn(
  state: ScoutSystemState,
  currentTurn: number,
  registered: RegisteredCharacter[],
  ownedIds: Iterable<string>,
): ScoutSystemState {
  if (state.openingScoutPending && !state.activeOffer) {
    return ensureOpeningScout(state, currentTurn, registered, ownedIds)
  }
  return state
}

export function clearFirstHireGuarantee(state: ScoutSystemState): ScoutSystemState {
  if (!state.firstHireGuaranteed) return state
  return { ...state, firstHireGuaranteed: false }
}

export function passScoutOffer(state: ScoutSystemState): ScoutSystemState {
  if (!state.activeOffer) return state
  return expireActiveOffer(state, { permanentExclude: true })
}

export function clearScoutOfferAfterHire(state: ScoutSystemState): ScoutSystemState {
  if (!state.activeOffer) return { ...state, hasUnread: false }
  return {
    ...state,
    activeOffer: null,
    offerAppearedTurn: null,
    hasUnread: false,
  }
}

export function markScoutViewed(state: ScoutSystemState): ScoutSystemState {
  if (!state.hasUnread) return state
  return { ...state, hasUnread: false }
}

export function canHireScoutOffer(
  offer: ScoutOffer,
  assets: number,
  freeHire = false,
): { ok: true } | { ok: false; reason: 'assets' } {
  if (!freeHire && assets < offer.salary) return { ok: false, reason: 'assets' }
  return { ok: true }
}

/** 스카우트 오퍼 → 보유 크리에이터 (영입 직후 컨디션·스테미나 풀) */
export function hireScoutOffer(offer: ScoutOffer): OwnedCreator {
  const stats = clampStats(offer.stats, offer.grade)
  const { template } = offer
  const staminaMax = 100
  const conditionScore = 100
  return {
    ...template,
    grade: offer.grade,
    salary: offer.salary,
    heat: 1,
    trust: stats.trust,
    stamina: staminaMax,
    staminaMax,
    revenueMult: stats.revenueMult,
    statSexy: stats.statSexy,
    statElegance: stats.statElegance,
    statCommunication: stats.statCommunication,
    statPerformance: stats.statPerformance,
    contractWeeks: 12,
    nextPayTurns: 4,
    conditionScore,
    condition: conditionFromScore(conditionScore),
    restStreak: 0,
    lastVacationMonth: null,
    dateArcStep: 0,
    snsPublishedIds: [],
    snsFeed: [],
    snsPending: null,
  }
}
