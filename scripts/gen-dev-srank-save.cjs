/**
 * 데브용 세이브: 전원 S랭크, 시청자 100만, 일등기업 1위.
 * 엔딩 VN을 제외한 모든 이벤트를 시청 완료로 표시.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const CHAR_PATH = path.join(ROOT, 'public', 'characters', 'characters.json')
const EVENTS_JSON = path.join(ROOT, 'public', 'chapter_assets', 'events.json')
const COMMON_LINKS = path.join(ROOT, 'public', 'chapter_assets', 'common_event_links.json')
const OUT_DIR = path.join(ROOT, 'src', 'generated')
const OUT_FILE = path.join(OUT_DIR, 'devSRankTopSave.json')

const SAVE_ID = 'dev-s-rank-top-1'
const VIEWERS = 1_000_000
const LEAGUE_SIZE = 300

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (err) {
    console.warn(`[gen-dev-srank-save] failed to read ${file}:`, err.message)
    return fallback
  }
}

function loadCharacters() {
  const raw = readJson(CHAR_PATH, [])
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw.characters)) return raw.characters
  return []
}

function isEndingTitle(ev) {
  const title = String(ev?.title ?? '').trim()
  const titleKey = String(ev?.titleKey ?? '').trim().toLowerCase()
  if (title === '엔딩' || title.endsWith(' 엔딩')) return true
  if (titleKey === 'ending' || titleKey.endsWith('_ending') || titleKey.includes('endingvn')) return true
  return false
}

function collectEndingIds(characters, eventsJson) {
  const ids = new Set()
  for (const c of characters) {
    const endingId = c?.eventLinks?.endingVn
    if (typeof endingId === 'string' && endingId.trim()) ids.add(endingId.trim())
  }
  const list = Array.isArray(eventsJson)
    ? eventsJson
    : eventsJson && typeof eventsJson === 'object'
      ? Object.values(eventsJson)
      : []
  for (const ev of list) {
    if (ev && typeof ev.id === 'string' && isEndingTitle(ev)) ids.add(ev.id)
  }
  return ids
}

function collectEventIds(characters, endingIds) {
  const ids = new Set()
  const add = (value) => {
    if (typeof value !== 'string') return
    const id = value.trim()
    if (!id || endingIds.has(id)) return
    ids.add(id)
  }

  for (const c of characters) {
    const links = c.eventLinks || {}
    for (const [key, value] of Object.entries(links)) {
      if (key === 'endingVn') continue
      add(value)
    }
  }

  const eventsJson = readJson(EVENTS_JSON, null)
  if (Array.isArray(eventsJson)) {
    for (const ev of eventsJson) {
      if (ev && typeof ev.id === 'string' && !isEndingTitle(ev)) add(ev.id)
    }
  } else if (eventsJson && typeof eventsJson === 'object') {
    for (const [key, ev] of Object.entries(eventsJson)) {
      if (ev && typeof ev.id === 'string') {
        if (!isEndingTitle(ev)) add(ev.id)
      } else if (typeof key === 'string' && key && !key.includes('.')) add(key)
    }
  }

  const common = readJson(COMMON_LINKS, {})
  if (common && typeof common === 'object') {
    for (const value of Object.values(common)) add(value)
  }

  const eventsDir = path.join(ROOT, 'public', 'chapter_assets', 'events')
  if (fs.existsSync(eventsDir)) {
    for (const name of fs.readdirSync(eventsDir)) {
      const full = path.join(eventsDir, name)
      try {
        if (fs.statSync(full).isDirectory()) add(name)
        else if (name.endsWith('.json') && !name.includes('_loc_')) add(name.replace(/\.json$/i, ''))
      } catch {
        // ignore
      }
    }
  }

  return [...ids]
}

function stripRuntimeFields(character) {
  const { profileBlob: _blob, images = [], videos = [], ...rest } = character
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
    proposalState: null,
    dateArcStep: 3,
    snsPublishedIds,
    snsFeed,
    snsPending: null,
    snsHeat3Pity: 0,
    trainingTurns: 40,
    vipUsed: true,
    snsSubscribers: Math.max(80_000, Number(base.snsSubscribers) || 0),
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
        label: `SLOT ${String(index).padStart(2, '0')}`,
        status: 'empty',
        assignment: null,
      }
    }
    return {
      id: `slot-${index}`,
      index,
      label: `SLOT ${String(index).padStart(2, '0')}`,
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

const VIEWER_BANDS = [
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

function viewersForRank(rank) {
  const r = Math.max(1, Math.min(LEAGUE_SIZE, Math.round(rank)))
  const band = VIEWER_BANDS.find((b) => r >= b.bestRank && r <= b.worstRank)
  if (!band) return 30
  if (band.bestRank === band.worstRank) return band.maxViewers
  const t = (band.worstRank - r) / (band.worstRank - band.bestRank)
  return Math.round(band.minViewers + t * (band.maxViewers - band.minViewers))
}

function aceGradeForRank(rank) {
  if (rank <= 3) return 'S'
  if (rank <= 10) return 'A'
  if (rank <= 20) return 'A'
  if (rank <= 30) return 'B'
  if (rank <= 50) return 'B'
  return 'C'
}

function buildLeague(aceName) {
  const npcStations = []
  for (let rank = 2; rank <= LEAGUE_SIZE; rank += 1) {
    npcStations.push({
      id: `npc-${rank}`,
      stationName: `라이벌 방송 ${String(rank).padStart(3, '0')}`,
      aceCreatorName: `NPC 에이스 ${rank}`,
      aceCreatorGrade: aceGradeForRank(rank),
      viewers: Math.max(30, viewersForRank(rank)),
      lastRank: rank,
    })
  }

  const playerEntry = {
    rank: 1,
    stationName: 'DEV S랭크 1등',
    aceCreatorName: aceName,
    aceCreatorGrade: 'S',
    viewers: VIEWERS,
    rankChange: 1,
    isPlayer: true,
  }

  const entries = [
    playerEntry,
    ...npcStations.map((npc, index) => ({
      rank: index + 2,
      stationName: npc.stationName,
      aceCreatorName: npc.aceCreatorName,
      aceCreatorGrade: npc.aceCreatorGrade,
      viewers: npc.viewers,
      rankChange: 0,
      isPlayer: false,
    })),
  ]

  return {
    currentRank: 1,
    previousRank: 2,
    viewers: VIEWERS,
    subscribers: 200_000,
    revenueBonusPercent: 15,
    claimedMilestones: [50, 30, 20, 10, 5, 1],
    npcStations,
    entries,
    scoutRateUp: true,
    hiddenEventUnlocked: true,
    gameCleared: false,
  }
}

function buildSave(characters, watchedEventIds) {
  const ownedCreators = characters.map(toOwnedCreator)
  const now = Date.now()
  const charIds = ownedCreators.map((c) => c.id)
  const aceName = ownedCreators[0]?.name || '—'
  return {
    schemaVersion: 1,
    id: SAVE_ID,
    companyName: 'DEV S랭크 1등',
    createdAt: now,
    savedAt: now,
    playtimeMs: 1000 * 60 * 60 * 20,
    gameMonth: 60,
    broadcastMonthNumber: 60,
    monthWeekIndex: 0,
    assets: 5_000_000,
    league: buildLeague(aceName),
    stationGrade: 'top',
    rankRefreshTurnsLeft: 3,
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

function main() {
  const characters = loadCharacters()
  if (characters.length === 0) {
    console.error('[gen-dev-srank-save] characters.json is empty')
    process.exit(1)
  }
  const eventsJson = readJson(EVENTS_JSON, [])
  const endingIds = collectEndingIds(characters, eventsJson)
  const watchedEventIds = collectEventIds(characters, endingIds)
  const save = buildSave(characters, watchedEventIds)
  const bundle = {
    version: 1,
    generatedAt: new Date().toISOString(),
    saveId: SAVE_ID,
    characterCount: characters.length,
    sRankCount: save.ownedCreators.filter((c) => c.grade === 'S').length,
    watchedEventCount: watchedEventIds.length,
    excludedEndingCount: endingIds.size,
    excludedEndingIds: [...endingIds],
    save,
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_FILE, JSON.stringify(bundle, null, 2), 'utf8')
  console.log(
    `[gen-dev-srank-save] wrote ${OUT_FILE} (chars=${characters.length}, watched=${watchedEventIds.length}, endingsExcluded=${endingIds.size})`,
  )
}

main()
