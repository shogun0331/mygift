import type { Grade, OwnedCreator, RegisteredCharacter } from './characters'
import { conditionFromScore } from './condition'
import { rollNegotiatedSalary } from './salary'
import {
  clampStats,
  rollGrade,
  rollInt,
  rollStatsForGrade,
  type CharacterStats,
} from './stats'

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
  /** 10위 진입 후 A/S 가중 상향 */
  premiumScout: boolean
}

export function scoutGradeForTurn(turn: number): Grade {
  const t = Math.max(1, Math.round(turn))
  if (t <= 12) return 'C'
  if (t <= 24) return 'B'
  if (t <= 36) return 'A'
  return 'S'
}

const GRADE_ORDER: Grade[] = ['C', 'B', 'A', 'S']

function betterGrade(a: Grade, b: Grade): Grade {
  return GRADE_ORDER.indexOf(b) > GRADE_ORDER.indexOf(a) ? b : a
}

export function enablePremiumScout(state: ScoutSystemState): ScoutSystemState {
  if (state.premiumScout) return state
  return { ...state, premiumScout: true }
}

export function createInitialScoutState(currentTurn: number): ScoutSystemState {
  const turn = Math.max(1, Math.round(currentTurn))
  return {
    nextCheckTurn: turn,
    failStreak: 0,
    lastAppearTurn: turn - 6,
    permanentExcludeIds: [],
    activeOffer: null,
    offerAppearedTurn: null,
    hasUnread: false,
    openingScoutPending: true,
    firstHireGuaranteed: true,
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
  const stats = rollStatsForGrade(grade)
  return {
    template,
    grade,
    stats,
    salary: rollNegotiatedSalary(stats, grade),
  }
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
  const turnGrade = scoutGradeForTurn(currentTurn)
  const rolled = state.premiumScout ? rollGrade(true) : turnGrade
  const grade = betterGrade(turnGrade, rolled)
  const template = pickRandomTemplate(registered, exclude)
  const scheduleNext = (): ScoutSystemState => ({
    ...state,
    nextCheckTurn: currentTurn + rollInt(2, 3),
  })

  if (!template) {
    return scheduleNext()
  }

  const force =
    Boolean(options?.force) ||
    state.failStreak >= 3 ||
    currentTurn - state.lastAppearTurn >= 6
  const success = force || Math.random() < scoutAppearChance(state.appearCount)
  if (!success) {
    return {
      ...state,
      failStreak: state.failStreak + 1,
      nextCheckTurn: currentTurn + rollInt(2, 3),
    }
  }

  const offer = createScoutOffer(template, grade)
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
 * 1) 이전 턴 후보 만료  2) 체크 도래 시 등장 판정
 */
export function advanceScoutTurn(
  state: ScoutSystemState,
  currentTurn: number,
  registered: RegisteredCharacter[],
  ownedIds: Iterable<string>,
): ScoutSystemState {
  let next = state

  if (
    next.activeOffer &&
    next.offerAppearedTurn != null &&
    next.offerAppearedTurn < currentTurn
  ) {
    // 달을 넘겨 미처리된 후보 — 이번 기회만 소멸, 풀에서 영구 제외하지 않음
    next = expireActiveOffer(next, { permanentExclude: false })
  }

  if (next.openingScoutPending && !next.activeOffer) {
    next = ensureOpeningScout(next, currentTurn, registered, ownedIds)
    if (next.activeOffer) return next
  }

  if (next.activeOffer) return next
  if (currentTurn < next.nextCheckTurn) return next

  return trySpawnOffer(next, currentTurn, registered, ownedIds)
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
): { ok: true } | { ok: false; reason: 'assets' } {
  if (assets < offer.salary) return { ok: false, reason: 'assets' }
  return { ok: true }
}

/**
 * 스카우트 등장 확률 — 누적 등장 횟수 기준
 * 1·2회차(appearCount 0·1) → 100%, 이후 → 50%
 */
export function scoutAppearChance(appearCount: number): number {
  const n = Math.max(0, Math.round(appearCount))
  return n < 2 ? 1 : 0.5
}

/**
 * 스카우트 승낙 확률 — 보유 n명일 때 다음 영입
 * 1·2회차(n=0·1) → 100%, 이후 → 50%
 */
export function scoutAcceptChance(ownedCount: number): number {
  const n = Math.max(0, Math.round(ownedCount))
  return n < 2 ? 1 : 0.5
}

export function rollScoutAccept(ownedCount: number, guaranteed = false): boolean {
  if (guaranteed) return true
  return Math.random() < scoutAcceptChance(ownedCount)
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
    popularity: stats.popularity,
    salary: offer.salary,
    skill: stats.skill,
    heat: stats.heat,
    trust: stats.trust,
    stamina: staminaMax,
    staminaMax,
    revenueMult: stats.revenueMult,
    contractWeeks: 12,
    nextPayTurns: 4,
    conditionScore,
    condition: conditionFromScore(conditionScore),
    restStreak: 0,
    lastVacationMonth: null,
  }
}
