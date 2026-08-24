import type { Grade } from './characters'
import { gradeViewerMult } from './stats'
import {
  capStationViewers,
  gatedFloorOfStation,
  stationRankForGrade,
  VIEWER_FLOOR,
  type StationGrade,
} from './station'
import { getViewerBalance } from './viewerBalance'
import { STATION_NAME } from './weeklyReport'

export type CreatorGrade = Grade
export type RankMilestone = 50 | 30 | 20 | 10 | 5 | 1

export type RankCreator = {
  id: string
  name: string
  grade: CreatorGrade
  condition?: string
  conditionScore?: number
  statCommunication?: number
}

export type NpcStation = {
  id: string
  stationName: string
  aceCreatorName: string
  aceCreatorGrade: CreatorGrade
  viewers: number
  lastRank: number
}

export type RankEntry = {
  rank: number
  stationName: string
  aceCreatorName: string
  aceCreatorGrade: CreatorGrade
  viewers: number
  rankChange: number
  isPlayer: boolean
}

export type CreatorRequirement = {
  id: string
  /** B+ / A+ / S */
  minGrade: CreatorGrade
  count: number
  orGroup?: string
}

export type MilestoneReward = {
  subscribersBonus: number
  revenueBonusPercent: number
  scoutRateUp?: boolean
  specialEventUnlock?: boolean
  isGameClear?: boolean
}

export type PromotionTarget = {
  enterRank: number
  requiredViewers: number
  requirements: CreatorRequirement[]
  extraViewers?: number
  reward: MilestoneReward | null
  nextMilestone: RankMilestone | null
}

export type RequirementCheck = CreatorRequirement & {
  current: number
  met: boolean
  labelKey: string
}

export type PromotionStatus = {
  target: PromotionTarget | null
  viewers: number
  requiredViewers: number
  viewerProgress: number
  viewersMet: boolean
  checks: RequirementCheck[]
  creatorsMet: boolean
  eligible: boolean
  heldByGate: boolean
  gatedFloor: number
}

export type LeagueState = {
  currentRank: number
  previousRank: number
  viewers: number
  subscribers: number
  revenueBonusPercent: number
  claimedMilestones: RankMilestone[]
  npcStations: NpcStation[]
  entries: RankEntry[]
  scoutRateUp: boolean
  hiddenEventUnlocked: boolean
  gameCleared: boolean
}

export type RankSettlementResult = {
  previousRank: number
  currentRank: number
  rankChange: number
  viewers: number
  heldByGate: boolean
  gatedFloor: number
  newMilestones: RankMilestone[]
  rewards: MilestoneReward
  scoutRateUp: boolean
  hiddenEventUnlocked: boolean
  gameCleared: boolean
}

/**
 * 시청자 성장 밸런스는 station_grade_config.json 의 `balance` 섹션에서 관리한다.
 * (로드 → setViewerBalance → 여기서 getViewerBalance()로 읽음)
 */
const VIEWER_GROWTH_RANDOM_MIN = 0.55
const VIEWER_GROWTH_RANDOM_MAX = 1.4
const NPC_VIEWER_FLOOR = 30
export const LEAGUE_SIZE = 300
export const STARTING_RANK = 300

const GRADE_RANK: Record<CreatorGrade, number> = {
  C: 0,
  B: 1,
  A: 2,
  S: 3,
}

const VIEWER_BANDS: Array<{
  bestRank: number
  worstRank: number
  minViewers: number
  maxViewers: number
}> = [
  { bestRank: 1, worstRank: 3, minViewers: 220_000, maxViewers: 320_000 },
  { bestRank: 4, worstRank: 10, minViewers: 120_000, maxViewers: 220_000 },
  { bestRank: 11, worstRank: 20, minViewers: 60_000, maxViewers: 120_000 },
  { bestRank: 21, worstRank: 30, minViewers: 30_000, maxViewers: 60_000 },
  { bestRank: 31, worstRank: 50, minViewers: 12_000, maxViewers: 30_000 },
  { bestRank: 51, worstRank: 80, minViewers: 4_000, maxViewers: 12_000 },
  { bestRank: 81, worstRank: 100, minViewers: 1_500, maxViewers: 4_000 },
  { bestRank: 101, worstRank: 150, minViewers: 400, maxViewers: 1_500 },
  { bestRank: 151, worstRank: 200, minViewers: 150, maxViewers: 400 },
  { bestRank: 201, worstRank: 300, minViewers: 0, maxViewers: 150 },
]

export type CompanyTierId = 'top' | 'large' | 'mid' | 'sme' | 'tiny' | 'black'

export type CompanyTier = {
  id: CompanyTierId
  bestRank: number
  worstRank: number | null
  flex: number
}

/** 순위 구간 = 기업 규모. 피라미드는 이 순서로 위에서 아래로 쌓인다. */
export const COMPANY_TIERS: CompanyTier[] = [
  { id: 'top', bestRank: 1, worstRank: 10, flex: 1 },
  { id: 'large', bestRank: 11, worstRank: 20, flex: 1 },
  { id: 'mid', bestRank: 21, worstRank: 50, flex: 1 },
  { id: 'sme', bestRank: 51, worstRank: 100, flex: 1 },
  { id: 'tiny', bestRank: 101, worstRank: 150, flex: 1 },
  { id: 'black', bestRank: 151, worstRank: null, flex: 1 },
]

export function companyTierOf(rank: number): CompanyTier {
  const r = Math.max(1, Math.round(rank))
  return (
    COMPANY_TIERS.find(
      (tier) => r >= tier.bestRank && (tier.worstRank == null || r <= tier.worstRank),
    ) ?? COMPANY_TIERS[COMPANY_TIERS.length - 1]!
  )
}

export function companyTierLabelKey(id: CompanyTierId): `ranking.company.${CompanyTierId}` {
  return `ranking.company.${id}`
}

/** 해당 등급 구간에 진입했거나 더 위로 올라왔으면 true (아래 층부터 채워 밝힘) */
export function companyTierReached(rank: number, tier: CompanyTier): boolean {
  const worst = tier.worstRank ?? LEAGUE_SIZE
  return Math.max(1, Math.round(rank)) <= worst
}

/** 0 = 구간 최상위, 1 = 구간 최하위 */
export function rankOffsetInTier(rank: number, tier: CompanyTier = companyTierOf(rank)): number {
  const worst = tier.worstRank ?? LEAGUE_SIZE
  const span = Math.max(1, worst - tier.bestRank)
  return Math.max(0, Math.min(1, (rank - tier.bestRank) / span))
}

/** 0 = 피라미드 최상단(1위), 1 = 피라미드 최하단(300위) 연속 Y 비율 계산 */
export function getPyramidY(rank: number): number {
  const r = Math.max(1, Math.min(LEAGUE_SIZE, rank))
  const tier = companyTierOf(r)
  const tierIndex = COMPANY_TIERS.findIndex((t) => t.id === tier.id)
  if (tierIndex === -1) return 1.0
  const worst = tier.worstRank ?? LEAGUE_SIZE
  const span = Math.max(1, worst - tier.bestRank)
  const t = Math.max(0, Math.min(1, (r - tier.bestRank) / span))
  return (tierIndex + t) / COMPANY_TIERS.length
}

export const RANK_MILESTONES: RankMilestone[] = [50, 30, 20, 10, 5, 1]

export const MILESTONE_REWARDS: Record<RankMilestone, MilestoneReward> = {
  50: { subscribersBonus: 1_000, revenueBonusPercent: 0 },
  30: { subscribersBonus: 5_000, revenueBonusPercent: 5 },
  20: { subscribersBonus: 10_000, revenueBonusPercent: 10 },
  10: { subscribersBonus: 50_000, revenueBonusPercent: 0 },
  5: { subscribersBonus: 100_000, revenueBonusPercent: 0, specialEventUnlock: true },
  1: { subscribersBonus: 0, revenueBonusPercent: 0, isGameClear: true },
}

/** 다음 등반 목표 — 더 좋은 순위대로 들어가는 문턱 (티어 게이트와 정합) */
export const PROMOTION_TARGETS: PromotionTarget[] = [
  {
    enterRank: 50,
    requiredViewers: 20_000,
    requirements: [{ id: 'b2', minGrade: 'B', count: 2 }],
    reward: MILESTONE_REWARDS[50],
    nextMilestone: 50,
  },
  {
    enterRank: 40,
    requiredViewers: viewersForRank(40),
    requirements: [
      { id: 'b3', minGrade: 'B', count: 3, orGroup: '40' },
      { id: 'a1', minGrade: 'A', count: 1, orGroup: '40' },
    ],
    reward: null,
    nextMilestone: 30,
  },
  {
    enterRank: 30,
    requiredViewers: 70_000,
    requirements: [{ id: 'a2', minGrade: 'A', count: 2 }],
    reward: MILESTONE_REWARDS[30],
    nextMilestone: 30,
  },
  {
    enterRank: 20,
    requiredViewers: 80_000,
    requirements: [
      { id: 'a3', minGrade: 'A', count: 2, orGroup: '20' },
      { id: 's1a', minGrade: 'S', count: 1, orGroup: '20' },
    ],
    reward: MILESTONE_REWARDS[20],
    nextMilestone: 20,
  },
  {
    enterRank: 10,
    requiredViewers: 250_000,
    requirements: [{ id: 's1', minGrade: 'S', count: 1 }],
    reward: MILESTONE_REWARDS[10],
    nextMilestone: 10,
  },
  {
    enterRank: 3,
    requiredViewers: 250_000,
    requirements: [{ id: 's3', minGrade: 'S', count: 1 }],
    reward: MILESTONE_REWARDS[1],
    nextMilestone: 1,
  },
  {
    enterRank: 1,
    requiredViewers: 250_000,
    requirements: [{ id: 's3-top', minGrade: 'S', count: 1 }],
    reward: MILESTONE_REWARDS[1],
    nextMilestone: 1,
  },
]

const STATION_NAMES = [
  '갓생 라이브',
  '네오 엔터',
  '미드나잇 스튜디오',
  '루멘 방송',
  '하이퍼 채널',
  '오로라 스트림',
  '픽셀 하우스',
  '노바 엔터테인',
  '블루문 라이브',
  '크림슨 스튜디오',
  '스파크 TV',
  '벨벳 방송국',
  '카이로스 미디어',
  '드림캐처 라이브',
  '선셋 채널',
  '아이리스 스튜디오',
  '플럭스 엔터',
  '모먼트 TV',
  '스타더스트 방송',
  '에코 라이브',
  '팬텀 스트림',
  '골든아워 스튜디오',
  '나이트오울 TV',
  '리프 방송국',
  '코스모 채널',
  '헤이즐 라이브',
  '미라주 엔터',
  '아케이드 스튜디오',
  '윈드업 TV',
  '로렐라이 방송',
  '신생 TV',
  '북극성 라이브',
  '세레나데 채널',
  '오빗 스튜디오',
  '파라솔 TV',
  '퀀텀 라이브',
  '라디언트 방송',
  '사파이어 엔터',
  '트와일라잇 스튜디오',
  '울트라바이올렛 TV',
  '페더 채널',
  '헬리오스 라이브',
  '제피르 방송',
  '카멜레온 스튜디오',
  '타이달 TV',
  '노틸러스 라이브',
  '메이데이 채널',
  '리리컬 엔터',
  '사우스폴 스튜디오',
  '플래니타리움 TV',
  '하모니 라이브',
  '인디고 방송',
  '제이드 채널',
  '코랄 스튜디오',
  '미스트 라이브',
  '애프터글로우 TV',
  '브라이트링 엔터',
  '솔스티스 방송',
  '네온가든 스튜디오',
  '폴라리스 채널',
  '아스트랄 라이브',
  '문라이트 하우스',
  '실버라인 TV',
  '크로노스 방송',
  '페일린 스튜디오',
  '다스크 라이브',
  '오로락스 채널',
  '비트닉 엔터',
  '글림 방송국',
  '세븐스카이 TV',
  '로터스 라이브',
  '아케이디아 스튜디오',
  '노바플레어 채널',
  '미러볼 방송',
  '캔들라이트 TV',
  '에버그린 라이브',
  '사운드웨이브 엔터',
  '크리스탈 스튜디오',
  '레드시프트 채널',
  '블루아워 방송',
  '스타라인 라이브',
  '페가수스 TV',
  '문플라워 스튜디오',
  '하이타이드 채널',
  '라이트박스 방송',
  '선샤인 라이브',
  '더스크레인 엔터',
  '코스믹덕 스튜디오',
  '와일드카드 TV',
  '나이트브리즈 채널',
  '오로라벨 방송',
  '스파크노트 라이브',
  '미라클아워 스튜디오',
  '플럭스웨이 TV',
  '골드립 채널',
  '사일런트스테이지',
  '브이넥스트 방송',
  '데이브레이크 라이브',
  '엔들리스 스튜디오',
]

const ACE_NAMES = [
  '한소희',
  '김미래',
  '박수진',
  '이하늘',
  '최서연',
  '정민재',
  '윤하린',
  '조은별',
  '강태오',
  '신유나',
  '배지훈',
  '문채원',
  '오세린',
  '임도윤',
  '한지율',
  '서지안',
  '류하은',
  '권시우',
  '남지민',
  '황소라',
  '안도하',
  '송예린',
  '백현우',
  '전아리',
  '노은재',
  '하윤서',
  '구민성',
  '설아진',
  '도은호',
  '차수빈',
]

function countAtLeast(creators: RankCreator[], minGrade: CreatorGrade): number {
  const min = GRADE_RANK[minGrade]
  return creators.filter((c) => GRADE_RANK[c.grade] >= min).length
}

export function viewersForRank(rank: number): number {
  const r = Math.max(1, Math.min(LEAGUE_SIZE, Math.round(rank)))
  const band = VIEWER_BANDS.find((b) => r >= b.bestRank && r <= b.worstRank)
  if (!band) return NPC_VIEWER_FLOOR
  if (band.bestRank === band.worstRank) return band.maxViewers
  const t = (band.worstRank - r) / (band.worstRank - band.bestRank)
  return Math.round(band.minViewers + t * (band.maxViewers - band.minViewers))
}

function clampCommunication(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

/** 소통 0~100 → 시청자 잠재력 1.0~2.0배 */
export function communicationMultOf(communication = 0): number {
  return 1 + clampCommunication(communication) / 100
}

export function averageCommunication(creators: RankCreator[]): number {
  if (creators.length === 0) return 0
  const sum = creators.reduce((acc, creator) => acc + clampCommunication(creator.statCommunication), 0)
  return sum / creators.length
}

/** 소통이 높을수록 이탈이 줄어듦. 0 → 1.0, 100 → 0.5 */
function communicationRetainOf(communication = 0): number {
  return 1 - clampCommunication(communication) / 200
}

/** 로스터 잠재력·배분 가중치 = 소통 × 등급 배율 */
export function creatorViewerWeight(creator: RankCreator): number {
  return (
    clampCommunication(creator.statCommunication) *
    getViewerBalance().viewerPerCommPoint *
    gradeViewerMult(creator.grade)
  )
}

/** 회사 획득 시청자를 가중치 비율로 나눠 합이 gained와 같게 맞춤 */
export function allocateViewersGained(
  gained: number,
  shares: Array<{ id: string; weight: number }>,
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const share of shares) result[share.id] = 0
  const totalGained = Math.round(gained)
  const eligible = shares.filter((share) => share.weight > 0)
  if (totalGained === 0 || eligible.length === 0) return result

  const weightSum = eligible.reduce((sum, share) => sum + share.weight, 0)
  const rows = eligible.map((share) => {
    const exact = (totalGained * share.weight) / weightSum
    const n = totalGained >= 0 ? Math.floor(exact) : Math.ceil(exact)
    return { id: share.id, n, frac: exact - n }
  })
  let assigned = rows.reduce((sum, row) => sum + row.n, 0)
  let leftover = totalGained - assigned
  rows.sort((a, b) => (totalGained >= 0 ? b.frac - a.frac : a.frac - b.frac))
  for (const row of rows) {
    if (leftover === 0) break
    const step = leftover > 0 ? 1 : -1
    row.n += step
    leftover -= step
  }
  for (const row of rows) result[row.id] = row.n
  return result
}

export function calcRosterViewers(
  creators: RankCreator[],
  subscribers: number,
): number {
  const roster = creators.reduce((sum, creator) => sum + creatorViewerWeight(creator), 0)
  return Math.max(
    VIEWER_FLOOR,
    Math.round(
      VIEWER_FLOOR +
        roster +
        Math.max(0, subscribers) * getViewerBalance().subscriberViewerRate,
    ),
  )
}

function rollViewerGrowthFactor(): number {
  return (
    VIEWER_GROWTH_RANDOM_MIN +
    Math.random() * (VIEWER_GROWTH_RANDOM_MAX - VIEWER_GROWTH_RANDOM_MIN)
  )
}

/** 잠재력까지 시청자를 일부만 쌓는다. 무방송이면 소폭 감소. */
/** 방송 턴 N회마다 리그 순위 갱신 */
export const RANK_REFRESH_TURNS = 3

/**
 * 순위 갱신 사이 턴 — 시청자만 쌓고 보드/순위는 유지
 */
export function growLeagueBetweenRefresh(
  state: LeagueState,
  broadcastedCreators: RankCreator[],
  ownedCreators: RankCreator[] = broadcastedCreators,
  stationGrade: StationGrade = 'tiny',
): LeagueState {
  const organicSubs = Math.round(state.viewers * 0.03)
  const subscribers = state.subscribers + organicSubs
  const didBroadcast = broadcastedCreators.length > 0
  const viewerRoster = didBroadcast ? broadcastedCreators : ownedCreators
  // 포텐셜 상한은 보유 로스터(팀 전체) 기준 — 부분 라인업 방송으로 상한이 내려가지 않음
  const potential = calcRosterViewers(ownedCreators, subscribers)
  const viewers = capStationViewers(
    growLeagueViewers(
      state.viewers,
      potential,
      didBroadcast,
      averageCommunication(viewerRoster),
    ),
    stationGrade,
  )
  const ace = playerAce(didBroadcast ? broadcastedCreators : ownedCreators)
  // 매 턴 시청자 진행도에 따른 순위를 갱신 (랭킹 패널 이동 없이 명세서에 반영)
  const board = assembleLeaderboard({
    playerViewers: viewers,
    playerAceName: ace.name,
    playerAceGrade: ace.grade,
    previousPlayerRank: state.currentRank,
    gatedFloor: gatedFloorOf(stationGrade),
    npcs: ensureNpcRoster(state.npcStations),
    pinRank: stationRankForGrade(stationGrade, viewers),
  })
  if (
    viewers === state.viewers &&
    subscribers === state.subscribers &&
    board.playerRank === state.currentRank
  ) {
    return state
  }
  return {
    ...state,
    viewers,
    subscribers,
    currentRank: board.playerRank,
    previousRank: state.currentRank,
    npcStations: board.npcs,
    entries: board.entries,
  }
}

export function growLeagueViewers(
  current: number,
  potential: number,
  didBroadcast: boolean,
  communication = 0,
): number {
  const now = Math.max(VIEWER_FLOOR, Math.round(current))
  const cap = Math.max(VIEWER_FLOOR, Math.round(potential))
  const retain = communicationRetainOf(communication)

  // 무방송: 자연 이탈 (이탈율은 소통이 높을수록 감소)
  if (!didBroadcast) {
    return Math.max(
      VIEWER_FLOOR,
      Math.round(now * (1 - getViewerBalance().idleViewerDecay * retain)),
    )
  }

  // 방송 중: 절대 감소 없음 — 미달이면 상한까지 성장, 도달/초과면 소폭 유기적 성장
  if (now >= cap) {
    // 유기적 성장: 활동 보상 (로스터 상한이 현재보다 낮아도 감소하지 않음)
    const gain = Math.max(
      1,
      Math.round(now * getViewerBalance().viewerOrganicGrowthRate * rollViewerGrowthFactor()),
    )
    return now + gain
  }
  const gain = Math.max(
    1,
    Math.round((cap - now) * getViewerBalance().viewerGrowthRate * rollViewerGrowthFactor()),
  )
  return Math.min(cap, now + gain)
}

export function gatedFloorOf(stationGrade: StationGrade): number {
  return gatedFloorOfStation(stationGrade)
}

function checksForTarget(
  target: PromotionTarget,
  creators: RankCreator[],
): RequirementCheck[] {
  return target.requirements.map((req) => {
    const current = countAtLeast(creators, req.minGrade)
    return {
      ...req,
      current,
      met: current >= req.count,
      labelKey: `ranking.req.${req.id}`,
    }
  })
}

function creatorsMetOf(checks: RequirementCheck[]): boolean {
  if (checks.length === 0) return true
  const groups = new Map<string, RequirementCheck[]>()
  const singles: RequirementCheck[] = []
  for (const check of checks) {
    if (check.orGroup) {
      const list = groups.get(check.orGroup) ?? []
      list.push(check)
      groups.set(check.orGroup, list)
    } else {
      singles.push(check)
    }
  }
  const singlesOk = singles.every((c) => c.met)
  const groupsOk = [...groups.values()].every((list) => list.some((c) => c.met))
  return singlesOk && groupsOk
}

export function nextPromotionTarget(currentRank: number): PromotionTarget | null {
  const rank = Math.max(1, Math.min(LEAGUE_SIZE, currentRank))
  if (rank <= 1) return null
  return PROMOTION_TARGETS.find((target) => rank > target.enterRank) ?? null
}

export function checkPromotionEligible(
  currentRank: number,
  viewers: number,
  creators: RankCreator[],
  stationGrade: StationGrade = 'tiny',
): PromotionStatus {
  const gatedFloor = gatedFloorOf(stationGrade)
  const target = nextPromotionTarget(currentRank)
  if (!target) {
    return {
      target: null,
      viewers,
      requiredViewers: viewers,
      viewerProgress: 1,
      viewersMet: true,
      checks: [],
      creatorsMet: true,
      eligible: true,
      heldByGate: false,
      gatedFloor,
    }
  }

  const checks = checksForTarget(target, creators)
  const creatorsMet = creatorsMetOf(checks)
  const extraOk = target.extraViewers == null || viewers >= target.extraViewers
  const viewersMet = viewers >= target.requiredViewers && extraOk
  const viewerProgress = target.requiredViewers <= 0
    ? 1
    : Math.max(0, Math.min(1, viewers / target.requiredViewers))

  return {
    target,
    viewers,
    requiredViewers: target.requiredViewers,
    viewerProgress,
    viewersMet,
    checks,
    creatorsMet: creatorsMet && extraOk,
    eligible: viewersMet && creatorsMet && extraOk,
    heldByGate: viewersMet && !(creatorsMet && extraOk),
    gatedFloor,
  }
}

function aceGradeForRank(rank: number): CreatorGrade {
  if (rank <= 3) return 'S'
  if (rank <= 10) return Math.random() < 0.7 ? 'S' : 'A'
  if (rank <= 20) return 'A'
  if (rank <= 30) return Math.random() < 0.55 ? 'A' : 'B'
  if (rank <= 50) return 'B'
  if (rank <= 80) return Math.random() < 0.45 ? 'B' : 'C'
  return 'C'
}

function pickUnique<T>(pool: T[], used: Set<T>): T {
  const available = pool.filter((item) => !used.has(item))
  const source = available.length > 0 ? available : pool
  return source[Math.floor(Math.random() * source.length)]!
}

const STATION_NAME_TAGS = ['HD', 'PLUS', 'LAB', 'ONE', 'MAX', 'PRO']

function stationNamePool(): string[] {
  const names = [...STATION_NAMES]
  for (const tag of STATION_NAME_TAGS) {
    for (const base of STATION_NAMES) names.push(`${base} ${tag}`)
  }
  return names
}

export function generateNpcStations(): NpcStation[] {
  const usedStations = new Set<string>()
  const usedAces = new Set<string>()
  const names = stationNamePool()
  const npcs: NpcStation[] = []
  for (let rank = 1; rank <= LEAGUE_SIZE - 1; rank += 1) {
    const stationName = pickUnique(names, usedStations)
    const aceCreatorName = pickUnique(ACE_NAMES, usedAces)
    usedStations.add(stationName)
    usedAces.add(aceCreatorName)
    const base = viewersForRank(rank)
    const noise = 0.97 + Math.random() * 0.06
    npcs.push({
      id: `npc-${rank}`,
      stationName,
      aceCreatorName,
      aceCreatorGrade: aceGradeForRank(rank),
      viewers: Math.max(NPC_VIEWER_FLOOR, Math.round(base * noise)),
      lastRank: rank,
    })
  }
  return npcs
}

function ensureNpcRoster(npcs: NpcStation[]): NpcStation[] {
  const need = LEAGUE_SIZE - 1
  if (npcs.length >= need) return npcs.slice(0, need)
  const used = new Set(npcs.map((npc) => npc.stationName))
  const extra: NpcStation[] = []
  for (const npc of generateNpcStations()) {
    if (npcs.length + extra.length >= need) break
    if (used.has(npc.stationName)) continue
    used.add(npc.stationName)
    extra.push({
      ...npc,
      id: `npc-fill-${extra.length}-${npc.id}`,
      lastRank: Math.max(npcs.length + extra.length + 1, npc.lastRank),
    })
  }
  return [...npcs, ...extra]
}

export function jitterNpcViewers(npcs: NpcStation[]): NpcStation[] {
  return npcs.map((npc) => {
    const delta = 0.88 + Math.random() * 0.24
    return {
      ...npc,
      viewers: Math.max(NPC_VIEWER_FLOOR, Math.round(npc.viewers * delta)),
    }
  })
}

function playerAce(creators: RankCreator[]): { name: string; grade: CreatorGrade } {
  if (creators.length === 0) {
    return { name: '—', grade: 'C' }
  }
  const sorted = [...creators].sort((a, b) => GRADE_RANK[b.grade] - GRADE_RANK[a.grade])
  const ace = sorted[0]!
  return { name: ace.name, grade: ace.grade }
}

export function assembleLeaderboard(opts: {
  playerViewers: number
  playerAceName: string
  playerAceGrade: CreatorGrade
  previousPlayerRank: number
  gatedFloor: number
  npcs: NpcStation[]
  pinRank?: number
}): { entries: RankEntry[]; npcs: NpcStation[]; playerRank: number } {
  const playerRow = {
    id: 'player',
    stationName: STATION_NAME,
    aceCreatorName: opts.playerAceName,
    aceCreatorGrade: opts.playerAceGrade,
    viewers: opts.playerViewers,
    isPlayer: true,
  }
  const mixed = [
    ...opts.npcs.map((npc) => ({ ...npc, isPlayer: false as const })),
    playerRow,
  ].sort((a, b) => b.viewers - a.viewers || Number(a.isPlayer) - Number(b.isPlayer))

  const unconstrainedIndex = mixed.findIndex((row) => row.isPlayer)
  const unconstrainedRank = unconstrainedIndex + 1
  const stationCapped = Math.max(unconstrainedRank, Math.min(LEAGUE_SIZE, opts.gatedFloor))
  const actualRank = Math.max(
    1,
    Math.min(LEAGUE_SIZE, opts.pinRank ?? stationCapped),
  )

  const withoutPlayer = mixed.filter((row) => !row.isPlayer)
  const ordered = [...withoutPlayer]
  ordered.splice(actualRank - 1, 0, playerRow)

  const entries: RankEntry[] = ordered.slice(0, LEAGUE_SIZE).map((row, index) => {
    const rank = index + 1
    if (row.isPlayer) {
      return {
        rank,
        stationName: row.stationName,
        aceCreatorName: row.aceCreatorName,
        aceCreatorGrade: row.aceCreatorGrade,
        viewers: row.viewers,
        rankChange: opts.previousPlayerRank - rank,
        isPlayer: true,
      }
    }
    const npc = row as NpcStation & { isPlayer: false }
    return {
      rank,
      stationName: npc.stationName,
      aceCreatorName: npc.aceCreatorName,
      aceCreatorGrade: npc.aceCreatorGrade,
      viewers: npc.viewers,
      rankChange: npc.lastRank - rank,
      isPlayer: false,
    }
  })

  const nextNpcs = opts.npcs.map((npc) => {
    const found = entries.find(
      (entry) => !entry.isPlayer && entry.stationName === npc.stationName,
    )
    return { ...npc, lastRank: found?.rank ?? npc.lastRank, viewers: found?.viewers ?? npc.viewers }
  })

  return { entries, npcs: nextNpcs, playerRank: actualRank }
}

function emptyReward(): MilestoneReward {
  return { subscribersBonus: 0, revenueBonusPercent: 0 }
}

function mergeRewards(base: MilestoneReward, extra: MilestoneReward): MilestoneReward {
  return {
    subscribersBonus: base.subscribersBonus + extra.subscribersBonus,
    revenueBonusPercent: base.revenueBonusPercent + extra.revenueBonusPercent,
    scoutRateUp: Boolean(base.scoutRateUp || extra.scoutRateUp),
    specialEventUnlock: Boolean(base.specialEventUnlock || extra.specialEventUnlock),
    isGameClear: Boolean(base.isGameClear || extra.isGameClear),
  }
}

export function unclaimedMilestonesFor(
  rank: number,
  claimed: RankMilestone[],
): RankMilestone[] {
  return RANK_MILESTONES.filter((m) => rank <= m && !claimed.includes(m))
}

export function createInitialLeagueState(
  creators: RankCreator[] = [],
  stationGrade: StationGrade = 'black',
): LeagueState {
  const viewers = capStationViewers(viewersForRank(STARTING_RANK), stationGrade)
  const npcs = generateNpcStations()
  const ace = playerAce(creators)
  const gatedFloor = gatedFloorOf(stationGrade)
  // 시작 순위 = 현재 시청자 진행도에 따른 결정적 순위 (일반사업자 300위부터)
  const initialRank = stationRankForGrade(stationGrade, viewers)
  const board = assembleLeaderboard({
    playerViewers: viewers,
    playerAceName: ace.name,
    playerAceGrade: ace.grade,
    previousPlayerRank: initialRank,
    gatedFloor,
    npcs,
    pinRank: initialRank,
  })
  return {
    currentRank: board.playerRank,
    previousRank: initialRank,
    viewers,
    subscribers: 0,
    revenueBonusPercent: 0,
    claimedMilestones: [],
    npcStations: board.npcs,
    entries: board.entries,
    scoutRateUp: false,
    hiddenEventUnlocked: false,
    gameCleared: false,
  }
}

export function settleLeagueRank(
  state: LeagueState,
  broadcastedCreators: RankCreator[],
  ownedCreators: RankCreator[] = broadcastedCreators,
  stationGrade: StationGrade = 'tiny',
): { state: LeagueState; result: RankSettlementResult } {
  const jittered = jitterNpcViewers(ensureNpcRoster(state.npcStations))
  const organicSubs = Math.round(state.viewers * 0.03)
  let subscribers = state.subscribers + organicSubs
  const didBroadcast = broadcastedCreators.length > 0
  /** 잠재력: 보유 로스터 기준 — 부분 라인업 방송으로 상한이 내려가지 않음 */
  const viewerRoster = didBroadcast ? broadcastedCreators : ownedCreators
  /** 승격 게이트: 스펙상 '보유' 크리에이터 */
  const gateRoster = ownedCreators.length > 0 ? ownedCreators : broadcastedCreators
  const potential = calcRosterViewers(ownedCreators, subscribers)
  let viewers = capStationViewers(
    growLeagueViewers(
      state.viewers,
      potential,
      didBroadcast,
      averageCommunication(viewerRoster),
    ),
    stationGrade,
  )
  const ace = playerAce(gateRoster)
  const stationFloor = gatedFloorOf(stationGrade)

  const applyBoard = (nextViewers: number, previousRank: number) => {
    const floor = stationFloor
    return assembleLeaderboard({
      playerViewers: nextViewers,
      playerAceName: ace.name,
      playerAceGrade: ace.grade,
      previousPlayerRank: previousRank,
      gatedFloor: floor,
      npcs: jittered,
      pinRank: stationRankForGrade(stationGrade, nextViewers),
    })
  }

  let board = applyBoard(viewers, state.currentRank)
  let claimed = [...state.claimedMilestones]
  let rewards = emptyReward()
  const fresh: RankMilestone[] = []

  const claimAt = (rank: number) => {
    const due = unclaimedMilestonesFor(rank, claimed)
    for (const milestone of due) {
      claimed.push(milestone)
      fresh.push(milestone)
      rewards = mergeRewards(rewards, MILESTONE_REWARDS[milestone])
    }
  }

  claimAt(board.playerRank)
  if (rewards.subscribersBonus > 0) {
    subscribers += rewards.subscribersBonus
    const nextPotential = calcRosterViewers(viewerRoster, subscribers)
    viewers = capStationViewers(
      Math.min(
        nextPotential,
        viewers + Math.round(rewards.subscribersBonus * getViewerBalance().subscriberViewerRate),
      ),
      stationGrade,
    )
    board = applyBoard(viewers, state.currentRank)
    claimAt(board.playerRank)
  }

  // 승격 보류 팝업은 제거 — 순위 변동 없는 정산은 조용히 넘어가고, 승격은 1월 1일 심사에서만 안내
  const heldByGate = false

  const nextState: LeagueState = {
    currentRank: board.playerRank,
    previousRank: state.currentRank,
    viewers,
    subscribers,
    revenueBonusPercent: state.revenueBonusPercent + rewards.revenueBonusPercent,
    claimedMilestones: claimed,
    npcStations: board.npcs,
    entries: board.entries,
    scoutRateUp: state.scoutRateUp || Boolean(rewards.scoutRateUp),
    hiddenEventUnlocked: state.hiddenEventUnlocked || Boolean(rewards.specialEventUnlock),
    gameCleared:
      state.gameCleared || (Boolean(rewards.isGameClear) && stationGrade === 'top'),
  }

  return {
    state: nextState,
    result: {
      previousRank: state.currentRank,
      currentRank: board.playerRank,
      rankChange: state.currentRank - board.playerRank,
      viewers,
      heldByGate,
      gatedFloor: stationFloor,
      newMilestones: fresh,
      rewards,
      scoutRateUp: nextState.scoutRateUp,
      hiddenEventUnlocked: nextState.hiddenEventUnlocked,
      gameCleared: nextState.gameCleared && !state.gameCleared,
    },
  }
}

/**
 * 보유 로스터 기준으로 게이트만 재적용 (시청자·NPC는 유지).
 * 정산 시 방송 인원만 보고 막혔던 순위를 즉시 보정한다.
 */
export function reapplyLeagueGate(
  state: LeagueState,
  ownedCreators: RankCreator[],
  stationGrade: StationGrade = 'tiny',
): LeagueState {
  const gateRoster = ownedCreators
  const ace = playerAce(gateRoster)
  let subscribers = state.subscribers
  let viewers = capStationViewers(state.viewers, stationGrade)
  let claimed = [...state.claimedMilestones]
  let revenueBonusPercent = state.revenueBonusPercent
  let scoutRateUp = state.scoutRateUp
  let hiddenEventUnlocked = state.hiddenEventUnlocked
  let gameCleared = state.gameCleared

  const apply = (nextViewers: number) =>
    assembleLeaderboard({
      playerViewers: nextViewers,
      playerAceName: ace.name,
      playerAceGrade: ace.grade,
      previousPlayerRank: state.currentRank,
      gatedFloor: gatedFloorOf(stationGrade),
      npcs: ensureNpcRoster(state.npcStations),
      pinRank: stationRankForGrade(stationGrade, nextViewers),
    })

  let board = apply(viewers)
  let bonusSubs = 0
  for (const milestone of unclaimedMilestonesFor(board.playerRank, claimed)) {
    claimed.push(milestone)
    const reward = MILESTONE_REWARDS[milestone]
    bonusSubs += reward.subscribersBonus
    revenueBonusPercent += reward.revenueBonusPercent
    scoutRateUp = scoutRateUp || Boolean(reward.scoutRateUp)
    hiddenEventUnlocked = hiddenEventUnlocked || Boolean(reward.specialEventUnlock)
    gameCleared = gameCleared || (Boolean(reward.isGameClear) && stationGrade === 'top')
  }
  if (bonusSubs > 0) {
    subscribers += bonusSubs
    viewers = capStationViewers(
      Math.max(viewers, Math.round(viewers + bonusSubs * getViewerBalance().subscriberViewerRate)),
      stationGrade,
    )
    board = apply(viewers)
    for (const milestone of unclaimedMilestonesFor(board.playerRank, claimed)) {
      claimed.push(milestone)
      const reward = MILESTONE_REWARDS[milestone]
      subscribers += reward.subscribersBonus
      viewers = capStationViewers(
        Math.max(viewers, Math.round(viewers + reward.subscribersBonus * getViewerBalance().subscriberViewerRate)),
        stationGrade,
      )
      revenueBonusPercent += reward.revenueBonusPercent
      scoutRateUp = scoutRateUp || Boolean(reward.scoutRateUp)
      hiddenEventUnlocked = hiddenEventUnlocked || Boolean(reward.specialEventUnlock)
      gameCleared = gameCleared || (Boolean(reward.isGameClear) && stationGrade === 'top')
      board = apply(viewers)
    }
  }

  if (board.playerRank === state.currentRank && bonusSubs === 0) {
    const aceChanged =
      state.entries.find((row) => row.isPlayer)?.aceCreatorName !== ace.name ||
      state.entries.find((row) => row.isPlayer)?.aceCreatorGrade !== ace.grade
    if (
      !aceChanged &&
      viewers === state.viewers &&
      subscribers === state.subscribers
    ) {
      return state
    }
  }

  return {
    ...state,
    currentRank: board.playerRank,
    previousRank: state.currentRank,
    viewers,
    subscribers,
    revenueBonusPercent,
    claimedMilestones: claimed,
    npcStations: board.npcs,
    entries: board.entries,
    scoutRateUp,
    hiddenEventUnlocked,
    gameCleared,
  }
}

/** VIP 거절 등 — 시청자·구독자를 깎고 순위를 다시 맞춘다 */
export function applyAudiencePenalty(
  state: LeagueState,
  ownedCreators: RankCreator[],
  stationGrade: StationGrade,
  viewerLoss: number,
): LeagueState {
  const loss = Math.max(0, Math.round(viewerLoss))
  const viewers = capStationViewers(state.viewers - loss, stationGrade)
  const subscribers = Math.max(0, Math.round(state.subscribers - loss))
  return reapplyLeagueGate({ ...state, viewers, subscribers }, ownedCreators, stationGrade)
}

export function formatViewers(count: number): string {
  return `${Math.max(0, Math.round(count)).toLocaleString('en-US')}`
}

export function filterRankEntries(
  entries: RankEntry[],
  filter: 'all' | 'rivals' | 'top10',
): RankEntry[] {
  if (filter === 'top10') return entries.filter((row) => row.rank <= 10)
  if (filter === 'rivals') {
    const player = entries.find((row) => row.isPlayer)
    const center = player?.rank ?? LEAGUE_SIZE
    return entries.filter((row) => Math.abs(row.rank - center) <= 5)
  }
  return entries
}
