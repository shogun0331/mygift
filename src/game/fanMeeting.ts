import type { BlurRegion } from '../events/types'
import {
  ALL_CREATOR_TYPES,
  mentalDefenseOf,
  rollAuditStrike,
  typeForCreator,
} from './auditEngine'
import type { CharacterAuditMedia, Grade } from './characters'
import type { CharacterLocaleText } from './characterLocales'
import { rollInt } from './stats'
import {
  canonicalizeVipRewardText,
  type AuditLineupMember,
  type CreatorType,
  type PromotionAuditConfig,
  type StationGrade,
  type VipCharacterConfig,
  type VipVisitConfig,
} from './stationGradeConfig'
import { isVipGrade, vipVisitPay } from './vip'

export type FanPortrait = {
  url: string
  blurRegions: BlurRegion[]
}

export type ActiveFan = {
  key: string
  characterId: string
  name: string
  names?: CharacterLocaleText
  title: string
  wait: FanPortrait
  center: FanPortrait
  satisfied: FanPortrait
  /** 이 팬의 만족도 목표. 체력과 같다 */
  target: number
  ironWall: number
  pressure: number
  demand: CreatorType
  satisfaction: number
  pay: number
  rewardText: string
}

export type FanCardState = {
  id: string
  name: string
  grade: Grade
  statType: string
  statPerformance: number
  statMental: number
  hp: number
  hpMax: number
  auditMedia?: CharacterAuditMedia
  profileImageUrl?: string | null
}

export type FanMeeting = {
  center: ActiveFan
  waiting: ActiveFan[]
  cards: FanCardState[]
  earned: number
  satisfiedCount: number
  lastRewardText: string
  over: boolean
}

export type FanSubmitResult = {
  meeting: FanMeeting
  gained: number
  typeMatched: boolean
  critical: boolean
  damage: number
  satisfied: boolean
}

function portrait(url: string | undefined, regions: BlurRegion[] | undefined, fallback?: FanPortrait): FanPortrait {
  const clean = url?.trim() ?? ''
  if (!clean && fallback) return fallback
  return { url: clean, blurRegions: regions ?? [] }
}

function fanImages(character: VipCharacterConfig): { wait: FanPortrait; center: FanPortrait; satisfied: FanPortrait } | null {
  const wait = portrait(character.imageUrl, character.blurRegions)
  const center = portrait(character.centerImageUrl, character.centerBlurRegions, wait.url ? wait : undefined)
  const satisfied = portrait(character.satisfiedImageUrl, character.satisfiedBlurRegions, center.url ? center : wait.url ? wait : undefined)
  if (!wait.url && !center.url) return null
  return { wait: wait.url ? wait : center, center: center.url ? center : wait, satisfied }
}

function rosterOf(config: VipVisitConfig): VipCharacterConfig[] {
  return config.characters.filter((character) => fanImages(character))
}

export function rollDemand(except?: CreatorType): CreatorType {
  const pool = except ? ALL_CREATOR_TYPES.filter((type) => type !== except) : ALL_CREATOR_TYPES
  const list = pool.length > 0 ? pool : ALL_CREATOR_TYPES
  return list[Math.floor(Math.random() * list.length)]!
}

export function spawnFan(config: VipVisitConfig, grade: StationGrade, avoid: string[] = []): ActiveFan | null {
  if (!isVipGrade(grade)) return null
  const roster = rosterOf(config)
  if (roster.length === 0) return null
  const pool = roster.filter((character) => !avoid.includes(character.id))
  const list = pool.length > 0 ? pool : roster
  const character = list[Math.floor(Math.random() * list.length)]!
  const images = fanImages(character)
  if (!images) return null
  const tier = config.tiers[grade]
  const target = Math.max(1, rollInt(Math.min(tier.satisfactionMin, tier.satisfactionMax), Math.max(tier.satisfactionMin, tier.satisfactionMax)))
  const ironWall = rollInt(Math.min(tier.ironWallMin, tier.ironWallMax), Math.max(tier.ironWallMin, tier.ironWallMax))
  const pressure = rollInt(Math.min(tier.pressureMin, tier.pressureMax), Math.max(tier.pressureMin, tier.pressureMax))
  const rewards = tier.rewards.filter((reward) => reward.text.trim())
  const reward = rewards.length > 0 ? rewards[Math.floor(Math.random() * rewards.length)]! : null
  return {
    key: `${character.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    characterId: character.id,
    name: character.name,
    names: character.names,
    title: character.title?.trim() ?? '',
    ...images,
    target,
    ironWall,
    pressure,
    demand: rollDemand(),
    satisfaction: 0,
    pay: vipVisitPay({
      stat: target,
      statMin: tier.satisfactionMin,
      statMax: tier.satisfactionMax,
      ironWall,
      ironWallMin: tier.ironWallMin,
      ironWallMax: tier.ironWallMax,
      payMin: tier.payMin,
      payMax: tier.payMax,
    }),
    rewardText: reward ? canonicalizeVipRewardText(reward) : '',
  }
}

export function createFanMeeting(config: VipVisitConfig, grade: StationGrade, cards: FanCardState[]): FanMeeting | null {
  const living = cards.filter((card) => card.hp > 0)
  if (living.length === 0) return null
  const center = spawnFan(config, grade)
  if (!center) return null
  const waiting: ActiveFan[] = []
  for (let i = 0; i < 2; i += 1) {
    const fan = spawnFan(config, grade, [center.characterId, ...waiting.map((item) => item.characterId)])
    if (fan) waiting.push(fan)
  }
  return {
    center,
    waiting,
    cards: living,
    earned: 0,
    satisfiedCount: 0,
    lastRewardText: '',
    over: false,
  }
}

function cardsDead(cards: FanCardState[]): boolean {
  return cards.every((card) => card.hp <= 0)
}

/**
 * 승급심사·팬미팅 카드전의 압박.
 * 멘탈 방어(멘탈×0.35)를 뺀 뒤에도 압박의 35%는 남는다. 만족시킨 타격에도 들어간다.
 */
function fanPressureDamage(pressure: number, mental: number): number {
  const press = Math.max(0, Math.round(Number(pressure) || 0))
  if (press <= 0) return 0
  const kept = Math.max(1, Math.round(press * 0.35))
  return Math.max(kept, press - mentalDefenseOf(mental))
}

export function submitFanCard(meeting: FanMeeting, cardId: string): FanSubmitResult {
  const card = meeting.cards.find((item) => item.id === cardId)
  if (!card || card.hp <= 0 || meeting.over) {
    return { meeting, gained: 0, typeMatched: false, critical: false, damage: 0, satisfied: false }
  }
  const creatorType = typeForCreator(card.id, card.statType)
  const typeMatched = creatorType === meeting.center.demand
  const strike = rollAuditStrike(card.statPerformance, meeting.center.ironWall, typeMatched)
  const satisfaction = Math.min(meeting.center.target, meeting.center.satisfaction + strike.scoreGained)
  const satisfied = satisfaction >= meeting.center.target
  const damage = fanPressureDamage(meeting.center.pressure, card.statMental)
  const cards = meeting.cards.map((item) =>
    item.id === card.id ? { ...item, hp: Math.max(0, item.hp - damage) } : item,
  )
  const next: FanMeeting = {
    ...meeting,
    center: { ...meeting.center, satisfaction },
    cards,
    over: !satisfied && cardsDead(cards),
  }
  return {
    meeting: next,
    gained: strike.scoreGained,
    typeMatched,
    critical: strike.isCritical,
    damage,
    satisfied,
  }
}

export function advanceFanLine(meeting: FanMeeting, config: VipVisitConfig, grade: StationGrade): FanMeeting {
  const earned = meeting.earned + meeting.center.pay
  const satisfiedCount = meeting.satisfiedCount + 1
  const lastRewardText = meeting.center.rewardText
  if (cardsDead(meeting.cards)) {
    return { ...meeting, earned, satisfiedCount, lastRewardText, over: true }
  }
  const [nextCenter, ...rest] = meeting.waiting
  const used = [meeting.center.characterId, ...rest.map((fan) => fan.characterId)]
  const center = nextCenter ?? spawnFan(config, grade, used)
  if (!center) {
    return { ...meeting, earned, satisfiedCount, lastRewardText, over: true }
  }
  const waiting = nextCenter ? [...rest] : []
  while (waiting.length < 2) {
    const fan = spawnFan(config, grade, [center.characterId, ...waiting.map((item) => item.characterId)])
    if (!fan) break
    waiting.push(fan)
  }
  return {
    ...meeting,
    center,
    waiting,
    earned,
    satisfiedCount,
    lastRewardText,
    over: false,
  }
}

export function advanceFixedLine(meeting: FanMeeting): FanMeeting {
  const satisfiedCount = meeting.satisfiedCount + 1
  const [nextCenter, ...rest] = meeting.waiting
  if (!nextCenter) {
    return { ...meeting, satisfiedCount, over: true }
  }
  if (cardsDead(meeting.cards)) {
    return { ...meeting, satisfiedCount, over: true }
  }
  return {
    ...meeting,
    center: nextCenter,
    waiting: rest,
    satisfiedCount,
    over: false,
  }
}

function memberImages(member: AuditLineupMember): { wait: FanPortrait; center: FanPortrait; satisfied: FanPortrait } | null {
  const wait = portrait(member.imageUrl, member.blurRegions)
  const center = portrait(member.centerImageUrl, member.centerBlurRegions, wait.url ? wait : undefined)
  const satisfied = portrait(member.satisfiedImageUrl, member.satisfiedBlurRegions, center.url ? center : wait.url ? wait : undefined)
  if (!wait.url && !center.url) return null
  return { wait: wait.url ? wait : center, center: center.url ? center : wait, satisfied }
}

export function createExamMeeting(
  config: PromotionAuditConfig,
  grade: StationGrade,
  cards: FanCardState[],
): FanMeeting | null {
  if (!isVipGrade(grade)) return null
  const living = cards.filter((card) => card.hp > 0)
  if (living.length === 0) return null
  const stage = config.stageSettings[grade]
  const members = stage?.members ?? []
  if (members.length < 4) return null
  const roster: ActiveFan[] = []
  for (const member of members.slice(0, 4)) {
    const images = memberImages(member)
    if (!images) return null
    const target = Math.max(1, rollInt(Math.min(stage.satisfactionMin, stage.satisfactionMax), Math.max(stage.satisfactionMin, stage.satisfactionMax)))
    const ironWall = rollInt(Math.min(stage.ironWallMin, stage.ironWallMax), Math.max(stage.ironWallMin, stage.ironWallMax))
    const pressure = rollInt(Math.min(stage.pressureMin, stage.pressureMax), Math.max(stage.pressureMin, stage.pressureMax))
    roster.push({
      key: `${member.id}-${roster.length}`,
      characterId: member.id,
      name: member.name,
      title: '',
      ...images,
      target,
      ironWall,
      pressure,
      demand: rollDemand(),
      satisfaction: 0,
      pay: 0,
      rewardText: '',
    })
  }
  const [center, ...waiting] = roster
  if (!center) return null
  return {
    center,
    waiting,
    cards: living,
    earned: 0,
    satisfiedCount: 0,
    lastRewardText: '',
    over: false,
  }
}
