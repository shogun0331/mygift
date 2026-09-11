/**
 * 심사용(올오픈) 세이브·업적 번들 생성.
 * characters.json / 이벤트 링크를 읽어 src/generated/reviewBundle.json 작성.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const CHAR_PATH = path.join(ROOT, 'public', 'characters', 'characters.json')
const EVENTS_JSON = path.join(ROOT, 'public', 'chapter_assets', 'events.json')
const COMMON_LINKS = path.join(ROOT, 'public', 'chapter_assets', 'common_event_links.json')
const OUT_DIR = path.join(ROOT, 'src', 'generated')
const OUT_FILE = path.join(OUT_DIR, 'reviewBundle.json')

const REVIEW_SAVE_ID = 'review-all-clear-save'
const CHAR_ACTIONS = [
  'date1',
  'date2',
  'h',
  'vip',
  's_rank',
  'sns',
  'sns_heat3',
  'vacation',
  'first_broadcast',
]
const BASE_ACHIEVEMENT_IDS = [
  'station_grade_tiny',
  'station_grade_sme',
  'station_grade_mid',
  'station_grade_large',
  'station_grade_top',
  'broadcast_turns_1',
  'broadcast_turns_10',
  'broadcast_turns_20',
  'broadcast_turns_30',
  'broadcast_turns_40',
  'broadcast_turns_50',
  'casino_slot_777',
  'casino_highlow_first_loss',
  'casino_highlow_win_3',
  'casino_highlow_win_6',
  'casino_highlow_win_9',
  'casino_highlow_win_12',
]

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (err) {
    console.warn(`[gen-review-bundle] failed to read ${file}:`, err.message)
    return fallback
  }
}

function loadCharacters() {
  const raw = readJson(CHAR_PATH, [])
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw.characters)) return raw.characters
  return []
}

function collectEventIds(characters) {
  const ids = new Set()
  for (const c of characters) {
    const links = c.eventLinks || {}
    for (const value of Object.values(links)) {
      if (typeof value === 'string' && value.trim()) ids.add(value.trim())
    }
  }
  const eventsJson = readJson(EVENTS_JSON, null)
  if (Array.isArray(eventsJson)) {
    for (const ev of eventsJson) {
      if (ev && typeof ev.id === 'string') ids.add(ev.id)
    }
  } else if (eventsJson && typeof eventsJson === 'object') {
    for (const [key, ev] of Object.entries(eventsJson)) {
      if (ev && typeof ev.id === 'string') ids.add(ev.id)
      else if (typeof key === 'string' && key && !key.includes('.')) ids.add(key)
    }
  }
  const common = readJson(COMMON_LINKS, {})
  if (common && typeof common === 'object') {
    for (const value of Object.values(common)) {
      if (typeof value === 'string' && value.trim()) ids.add(value.trim())
    }
  }
  // 폴더명 기반 이벤트 id도 포함
  const eventsDir = path.join(ROOT, 'public', 'chapter_assets', 'events')
  if (fs.existsSync(eventsDir)) {
    for (const name of fs.readdirSync(eventsDir)) {
      const full = path.join(eventsDir, name)
      try {
        if (fs.statSync(full).isDirectory()) ids.add(name)
        else if (name.endsWith('.json') && !name.includes('_loc_')) ids.add(name.replace(/\.json$/i, ''))
      } catch {
        // ignore
      }
    }
  }
  return [...ids]
}

function stripRuntimeFields(character) {
  const {
    profileBlob: _blob,
    images = [],
    videos = [],
    ...rest
  } = character
  return {
    ...rest,
    images: (images || []).map(({ file, ...img }) => img),
    videos: (videos || []).map(({ file, ...vid }) => ({ ...vid, level: vid.level ?? 1 })),
  }
}

function toOwnedCreator(character) {
  const base = stripRuntimeFields(character)
  const snsPosts = Array.isArray(base.snsPosts) ? base.snsPosts : []
  const snsPublishedIds = snsPosts.map((p) => p && p.id).filter(Boolean)
  const now = Date.now()
  const snsFeed = snsPublishedIds.map((postId, index) => ({
    postId,
    heat: 3,
    likes: 20_000 + index * 100,
    comments: [],
    publishedMonth: 50 + (index % 10),
  }))
  return {
    ...base,
    grade: 'S',
    salary: 48_000,
    contractWeeks: 99,
    nextPayTurns: 4,
    heat: 2,
    trust: 100,
    stamina: 100,
    staminaMax: 100,
    revenueMult: 1.7,
    statSexy: 100,
    statElegance: 100,
    statCommunication: 100,
    statPerformance: 100,
    condition: 'best',
    conditionScore: 100,
    restStreak: 0,
    lastVacationMonth: null,
    proposalState: 'accepted',
    dateArcStep: 3,
    snsPublishedIds,
    snsFeed,
    snsPending: null,
    snsHeat3Pity: 0,
    trainingTurns: 0,
    vipUsed: true,
    snsSubscribers: Math.max(50_000, Number(base.snsSubscribers) || 0),
  }
}

function buildStudioSlots(owned) {
  return Array.from({ length: 6 }, (_, i) => {
    const index = i + 1
    const creator = owned[i] || null
    if (!creator) {
      return {
        id: `slot-${index}`,
        index,
        label: `CH ${String(index).padStart(2, '0')}`,
        status: 'empty',
        assignment: null,
      }
    }
    return {
      id: `slot-${index}`,
      index,
      label: `CH ${String(index).padStart(2, '0')}`,
      status: 'assigned',
      assignment: {
        creatorId: creator.id,
        creatorName: creator.name,
        names: creator.names || null,
        grade: creator.grade,
        statType: creator.statType,
        profileImageUrl: creator.profileImageUrl || null,
        idleVideoUrl: null,
        mediaRevision: creator.mediaRevision,
      },
    }
  })
}

function buildSave(characters, watchedEventIds) {
  const ownedCreators = characters.map(toOwnedCreator)
  const now = Date.now()
  const charIds = ownedCreators.map((c) => c.id)
  return {
    schemaVersion: 1,
    id: REVIEW_SAVE_ID,
    companyName: 'REVIEW CLEAR',
    createdAt: now,
    savedAt: now,
    playtimeMs: 1000 * 60 * 60 * 40,
    gameMonth: 60,
    broadcastMonthNumber: 60,
    monthWeekIndex: 0,
    assets: 5_000_000,
    league: {
      currentRank: 1,
      previousRank: 2,
      viewers: 500_000,
      subscribers: 180_000,
      revenueBonusPercent: 25,
      claimedMilestones: [],
      npcStations: [],
      entries: [],
      scoutRateUp: true,
      hiddenEventUnlocked: true,
      gameCleared: true,
    },
    stationGrade: 'top',
    rankRefreshTurnsLeft: 0,
    ownedCreators,
    studioSlots: buildStudioSlots(ownedCreators),
    managerState: { hiredStaffIds: [], equippedBySlotId: {} },
    slotGearById: {},
    hiredStaffSalaries: {},
    hiredStaffStartMonths: {},
    hiredStaffLastRaiseMonths: {},
    weekAccum: {
      monthNumber: 60,
      byCreator: [],
      highlights: [],
      totalRevenueWon: 0,
      careExpenses: [],
    },
    prevWeekRevenue: null,
    socialSpawn: {
      date: { wait: 0, ready: true },
      vip: { wait: 0, ready: true },
      h: { wait: 0, ready: true },
    },
    annualRevenueByYear: { 2028: 2_500_000 },
    watchedEventIds,
    scout: {
      staffScoutAvailable: true,
      creatorScoutAvailable: true,
      creatorScoutFirstDone: true,
      scoutedStaffCandidate: null,
      staffScoutCooldown: 0,
    },
    scoutSystem: {
      nextCheckTurn: 61,
      failStreak: 0,
      lastAppearTurn: 60,
      permanentExcludeIds: charIds,
      activeOffer: null,
      offerAppearedTurn: null,
      hasUnread: false,
      openingScoutPending: false,
      firstHireGuaranteed: false,
      appearCount: 20,
      premiumScout: true,
    },
    pendingStationReview: false,
    stationAuditTarget: null,
    liveRevenueByCreator: {},
    casinoTurnCount: 0,
    showCasinoModal: false,
    notifiedPromotionExams: [],
    notifiedStationReviewKey: null,
    lastHActionMonth: 0,
    lastVipActionMonth: {},
    tutorialDone: true,
  }
}

function buildAchievements(characters) {
  const now = Date.now()
  const map = {}
  for (const id of BASE_ACHIEVEMENT_IDS) map[id] = now
  for (const c of characters) {
    for (const action of CHAR_ACTIONS) {
      map[`char_${c.id}_${action}`] = now
    }
  }
  return map
}

function main() {
  const characters = loadCharacters()
  if (characters.length === 0) {
    console.error('[gen-review-bundle] characters.json is empty')
    process.exit(1)
  }
  const watchedEventIds = collectEventIds(characters)
  const save = buildSave(characters, watchedEventIds)
  const achievements = buildAchievements(characters)
  const bundle = {
    version: 1,
    generatedAt: new Date().toISOString(),
    saveId: REVIEW_SAVE_ID,
    characterCount: characters.length,
    watchedEventCount: watchedEventIds.length,
    achievementCount: Object.keys(achievements).length,
    save,
    achievements,
    flags: {
      'broadcast-top-grade-cleared': 'true',
      'broadcast-game-cleared': 'true',
    },
    watchedEventsKey: 'broadcast-watched-events',
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_FILE, JSON.stringify(bundle, null, 2), 'utf8')
  console.log(
    `[gen-review-bundle] wrote ${OUT_FILE} (chars=${characters.length}, events=${watchedEventIds.length}, achievements=${Object.keys(achievements).length})`,
  )
}

main()
