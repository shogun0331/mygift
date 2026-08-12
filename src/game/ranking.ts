import type { Grade } from './characters'
import {
  CONDITION_MULT,
  conditionFromScore,
  scoreOf,
} from './condition'
import {
  capStationViewers,
  gatedFloorOfStation,
  VIEWER_FLOOR,
  type StationGrade,
} from './station'
import { STATION_NAME } from './weeklyReport'

export type CreatorGrade = Grade
export type RankMilestone = 50 | 30 | 20 | 10 | 5 | 1

export type RankCreator = {
  id: string
  name: string
  grade: CreatorGrade
  popularity?: number
  skill?: number
  condition?: string
  conditionScore?: number
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

const GRADE_VIEWER_MULT: Record<CreatorGrade, number> = {
  C: 1,
  B: 3,
  A: 12,
  S: 40,
}

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
  { bestRank: 1, worstRank: 3, minViewers: 1_000_000, maxViewers: 1_400_000 },
  { bestRank: 4, worstRank: 10, minViewers: 500_000, maxViewers: 1_000_000 },
  { bestRank: 11, worstRank: 20, minViewers: 100_000, maxViewers: 500_000 },
  { bestRank: 21, worstRank: 30, minViewers: 50_000, maxViewers: 100_000 },
  { bestRank: 31, worstRank: 50, minViewers: 10_000, maxViewers: 50_000 },
  { bestRank: 51, worstRank: 100, minViewers: 1_000, maxViewers: 10_000 },
]

export const RANK_MILESTONES: RankMilestone[] = [50, 30, 20, 10, 5, 1]

export const MILESTONE_REWARDS: Record<RankMilestone, MilestoneReward> = {
  50: { subscribersBonus: 1_000, revenueBonusPercent: 0 },
  30: { subscribersBonus: 5_000, revenueBonusPercent: 5 },
  20: { subscribersBonus: 10_000, revenueBonusPercent: 10 },
  10: { subscribersBonus: 50_000, revenueBonusPercent: 0 },
  5: { subscribersBonus: 100_000, revenueBonusPercent: 0, specialEventUnlock: true },
  1: { subscribersBonus: 0, revenueBonusPercent: 0, isGameClear: true },
}

/** 다음 등반 목표 — 더 좋은 순위대로 들어가는 문턱 */
export const PROMOTION_TARGETS: PromotionTarget[] = [
  {
    enterRank: 50,
    requiredViewers: 10_000,
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
    requiredViewers: 50_000,
    requirements: [{ id: 'a2', minGrade: 'A', count: 2 }],
    reward: MILESTONE_REWARDS[30],
    nextMilestone: 30,
  },
  {
    enterRank: 20,
    requiredViewers: 100_000,
    requirements: [
      { id: 'a3', minGrade: 'A', count: 3, orGroup: '20' },
      { id: 's1a', minGrade: 'S', count: 1, orGroup: '20' },
    ],
    reward: MILESTONE_REWARDS[20],
    nextMilestone: 20,
  },
  {
    enterRank: 10,
    requiredViewers: 500_000,
    requirements: [{ id: 's1', minGrade: 'S', count: 1 }],
    extraViewers: 500_000,
    reward: MILESTONE_REWARDS[10],
    nextMilestone: 10,
  },
  {
    enterRank: 3,
    requiredViewers: 1_000_000,
    requirements: [{ id: 's3', minGrade: 'S', count: 3 }],
    extraViewers: 1_000_000,
    reward: MILESTONE_REWARDS[1],
    nextMilestone: 1,
  },
  {
    enterRank: 1,
    requiredViewers: 1_200_000,
    requirements: [{ id: 's3-top', minGrade: 'S', count: 3 }],
    extraViewers: 1_000_000,
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
  const r = Math.max(1, Math.min(100, Math.round(rank)))
  const band = VIEWER_BANDS.find((b) => r >= b.bestRank && r <= b.worstRank)
  if (!band) return 1_000
  if (band.bestRank === band.worstRank) return band.maxViewers
  const t = (band.worstRank - r) / (band.worstRank - band.bestRank)
  return Math.round(band.minViewers + t * (band.maxViewers - band.minViewers))
}

export function calcRosterViewers(
  creators: RankCreator[],
  subscribers: number,
): number {
  const roster = creators.reduce((sum, creator) => {
    const popularity = Number(creator.popularity) || 0
    const skill = Number(creator.skill ?? 25) || 25
    const grade = creator.grade
    const cond = CONDITION_MULT[conditionFromScore(scoreOf(creator))] ?? 1
    return sum + popularity * skill * GRADE_VIEWER_MULT[grade] * cond
  }, 0)
  return Math.max(VIEWER_FLOOR, Math.round(VIEWER_FLOOR + roster + Math.max(0, subscribers) * 0.4))
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
  const rank = Math.max(1, Math.min(100, currentRank))
  if (rank <= 1) return null
  return PROMOTION_TARGETS.find((target) => rank > target.enterRank) ?? null
}

export function checkPromotionEligible(
  currentRank: number,
  viewers: number,
  creators: RankCreator[],
  stationGrade: StationGrade = 'C',
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

export function generateNpcStations(): NpcStation[] {
  const usedStations = new Set<string>()
  const usedAces = new Set<string>()
  const npcs: NpcStation[] = []
  for (let rank = 1; rank <= 99; rank += 1) {
    const stationName = pickUnique(STATION_NAMES, usedStations)
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
      viewers: Math.max(1_000, Math.round(base * noise)),
      lastRank: rank,
    })
  }
  return npcs
}

export function jitterNpcViewers(npcs: NpcStation[]): NpcStation[] {
  return npcs.map((npc) => {
    const delta = 0.88 + Math.random() * 0.24
    return {
      ...npc,
      viewers: Math.max(1_000, Math.round(npc.viewers * delta)),
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
  const actualRank = Math.max(unconstrainedRank, Math.min(100, opts.gatedFloor))

  const withoutPlayer = mixed.filter((row) => !row.isPlayer)
  const ordered = [...withoutPlayer]
  ordered.splice(actualRank - 1, 0, playerRow)

  const entries: RankEntry[] = ordered.slice(0, 100).map((row, index) => {
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
  stationGrade: StationGrade = 'C',
): LeagueState {
  const viewers = capStationViewers(calcRosterViewers(creators, 0), stationGrade)
  const npcs = generateNpcStations()
  const ace = playerAce(creators)
  const gatedFloor = gatedFloorOf(stationGrade)
  const board = assembleLeaderboard({
    playerViewers: viewers,
    playerAceName: ace.name,
    playerAceGrade: ace.grade,
    previousPlayerRank: 100,
    gatedFloor,
    npcs,
  })
  return {
    currentRank: board.playerRank,
    previousRank: 100,
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
  stationGrade: StationGrade = 'C',
): { state: LeagueState; result: RankSettlementResult } {
  const jittered = jitterNpcViewers(state.npcStations)
  const organicSubs = Math.round(state.viewers * 0.03)
  let subscribers = state.subscribers + organicSubs
  /** 시청자 산출: 이번 달 방송 로스터 (무방송이면 보유 로스터) */
  const viewerRoster =
    broadcastedCreators.length > 0 ? broadcastedCreators : ownedCreators
  /** 승격 게이트: 스펙상 '보유' 크리에이터 */
  const gateRoster = ownedCreators.length > 0 ? ownedCreators : broadcastedCreators
  let viewers = capStationViewers(calcRosterViewers(viewerRoster, subscribers), stationGrade)
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
    viewers = capStationViewers(calcRosterViewers(viewerRoster, subscribers), stationGrade)
    board = applyBoard(viewers, state.currentRank)
    claimAt(board.playerRank)
  }

  const unconstrained = assembleLeaderboard({
    playerViewers: viewers,
    playerAceName: ace.name,
    playerAceGrade: ace.grade,
    previousPlayerRank: state.currentRank,
    gatedFloor: 1,
    npcs: jittered,
  })
  const heldByGate = unconstrained.playerRank < board.playerRank

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
      state.gameCleared || (Boolean(rewards.isGameClear) && stationGrade === 'S'),
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
  stationGrade: StationGrade = 'C',
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
      npcs: state.npcStations,
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
    gameCleared = gameCleared || (Boolean(reward.isGameClear) && stationGrade === 'S')
  }
  if (bonusSubs > 0) {
    subscribers += bonusSubs
    viewers = capStationViewers(Math.max(viewers, Math.round(viewers + bonusSubs * 0.4)), stationGrade)
    board = apply(viewers)
    for (const milestone of unclaimedMilestonesFor(board.playerRank, claimed)) {
      claimed.push(milestone)
      const reward = MILESTONE_REWARDS[milestone]
      subscribers += reward.subscribersBonus
      viewers = capStationViewers(
        Math.max(viewers, Math.round(viewers + reward.subscribersBonus * 0.4)),
        stationGrade,
      )
      revenueBonusPercent += reward.revenueBonusPercent
      scoutRateUp = scoutRateUp || Boolean(reward.scoutRateUp)
      hiddenEventUnlocked = hiddenEventUnlocked || Boolean(reward.specialEventUnlock)
      gameCleared = gameCleared || (Boolean(reward.isGameClear) && stationGrade === 'S')
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
    const center = player?.rank ?? 100
    return entries.filter((row) => Math.abs(row.rank - center) <= 5)
  }
  return entries
}
