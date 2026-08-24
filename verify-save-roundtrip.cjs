// 세이브 왕복 재현: 영입 후 저장 → 로드 → ownedCreators + scoutSystem 보존 확인
// save.ts / saveService.ts / scout.ts 로직을 그대로 재현 (localStorage 목업 포함)

// ── localStorage 목업 ──
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  get length() { return store.size },
  key: (i) => [...store.keys()][i],
  clear: () => store.clear(),
}

// ── save.ts 재현 ──
function serializeMediaUrl(url) {
  if (!url) return undefined
  if (url.startsWith('blob:')) return undefined
  return url
}
function serializeOwnedCreator(creator) {
  return {
    ...creator,
    images: (creator.images ?? []).map((img) => {
      const { file: _f, ...rest } = img
      return { ...rest, url: serializeMediaUrl(img.url) }
    }),
    videos: (creator.videos ?? []).map((vid) => {
      const { file: _f, ...rest } = vid
      return { ...rest, url: serializeMediaUrl(vid.url) ?? '' }
    }),
  }
}
function hydrateOwnedCreator(creator) {
  return {
    ...creator,
    images: (creator.images ?? []).map((img) => ({
      ...img,
      url: img.url || (img.fileName ? `media://characters/${creator.id}/images/${img.fileName}` : ''),
    })),
    videos: (creator.videos ?? []).map((vid) => ({
      ...vid,
      url: vid.url || (vid.fileName ? `media://characters/${creator.id}/videos/${vid.fileName}` : ''),
    })),
  }
}

// ── scoutSystem 직렬화 재현 (save.ts 신규 로직) ──
function serializeScoutSystem(state) {
  return {
    ...state,
    activeOffer: state.activeOffer
      ? {
          grade: state.activeOffer.grade,
          stats: state.activeOffer.stats,
          salary: state.activeOffer.salary,
          templateId: state.activeOffer.template.id,
        }
      : null,
  }
}
function hydrateScoutSystem(raw, registered) {
  const offer = raw.activeOffer
  const template = offer ? registered.find((c) => c.id === offer.templateId) ?? null : null
  return {
    ...raw,
    activeOffer: offer && template ? { template, grade: offer.grade, stats: offer.stats, salary: offer.salary } : null,
  }
}
// createInitialScoutState 재현 (scout.ts 신규 로직)
function createInitialScoutState(currentTurn, opts) {
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
// ensureOpeningScout 재현 (scout.ts) — 핵심: openingScoutPending=false면 재등장 안 함
function ensureOpeningScout(state) {
  if (!state.openingScoutPending) return state
  if (state.activeOffer) return { ...state, openingScoutPending: false }
  return { ...state, openingScoutPending: false, activeOffer: { template: { id: 'spawned' } } }
}

// ── saveService.ts 재현 ──
const PREFIX = 'broadcast-save-'
function saveGame(save) { localStorage.setItem(PREFIX + save.id, JSON.stringify(save)) }
function loadGame(id) { const raw = localStorage.getItem(PREFIX + id); return raw ? JSON.parse(raw) : null }
function listSaves() {
  const out = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k || !k.startsWith(PREFIX)) continue
    const raw = localStorage.getItem(k)
    if (!raw) continue
    try { out.push(JSON.parse(raw)) } catch {}
  }
  return out.sort((a, b) => b.savedAt - a.savedAt)
}

let failed = false
const check = (cond, label) => { if (!cond) failed = true; console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`) }

// 영입한 크리에이터 (blob URL 포함한 실제 모양)
const creator = {
  id: 'c-123',
  name: 'Rina',
  names: { ko: 'Rina' },
  grade: 'C',
  salary: 500,
  images: [{ id: 'i1', fileName: 'a.png', fileSize: 10, url: 'blob:http://x/abc', keys: ['idle'] }],
  videos: [{ id: 'v1', fileName: 'v.mp4', fileSize: 20, url: 'blob:http://x/def', level: 1, stage: 1, keys: ['idle'] }],
}

// 1) 영입 직후 상태를 저장 (App의 handleScout → ownedCreators + schedule/flush)
const owned = [creator]
// 영입 후 스카우트 상태: 오프닝 완료(first hire done), 대기 오퍼 있음
const scoutStateBefore = {
  nextCheckTurn: 2,
  failStreak: 0,
  lastAppearTurn: 1,
  permanentExcludeIds: [],
  activeOffer: {
    template: { id: 'c-456' },
    grade: 'D',
    stats: { trust: 50, statSexy: 30, statElegance: 40, statCommunication: 45, statPerformance: 35, revenueMult: 1.0 },
    salary: 400,
  },
  offerAppearedTurn: 1,
  hasUnread: true,
  openingScoutPending: false, // 첫 영입 완료 → false
  firstHireGuaranteed: false,
  appearCount: 1,
  premiumScout: false,
}
const savePayload = {
  schemaVersion: 1,
  id: 'company-1',
  companyName: 'STAR',
  createdAt: 1,
  savedAt: Date.now(),
  playtimeMs: 1000,
  gameMonth: 0,
  broadcastMonthNumber: 1,
  monthWeekIndex: 0,
  assets: 100000,
  league: { viewers: 150, currentRank: 285 },
  stationGrade: 'black',
  rankRefreshTurnsLeft: 3,
  ownedCreators: owned.map(serializeOwnedCreator),
  studioSlots: [],
  managerState: {},
  slotGearById: {},
  hiredStaffSalaries: {},
  hiredStaffStartMonths: {},
  weekAccum: { monthNumber: 1, byCreator: [], highlights: [], totalRevenueWon: 0, careExpenses: [] },
  prevWeekRevenue: null,
  socialSpawn: {},
  annualRevenueByYear: {},
  watchedEventIds: [],
  scout: { staffScoutAvailable: false, creatorScoutAvailable: false, creatorScoutFirstDone: true },
  scoutSystem: serializeScoutSystem(scoutStateBefore),
}
saveGame(savePayload)

// 2) 목록/로드 확인
const list = listSaves()
check(list.length === 1, `세이브 1개 저장됨 (${list.length})`)
const loaded = loadGame('company-1')
check(loaded != null, '로드 성공')

// 3) 로드된 ownedCreators 확인 (App loadSaveGame: hydrateOwnedCreator 적용)
const restored = (loaded.ownedCreators ?? []).map(hydrateOwnedCreator)
check(restored.length === 1, `로드 후 크리에이터 수 = ${restored.length}`)
check(restored[0].id === 'c-123', `크리에이터 id 보존: ${restored[0].id}`)
check(restored[0].name === 'Rina', `크리에이터 이름 보존`)
check(restored[0].images[0].url.includes('media://'), `이미지 URL 복원(media://): ${restored[0].images[0].url}`)

// 4) JSON 직렬화 중 blob URL이 사라졌는지 (저장본 기준)
const rawJson = localStorage.getItem(PREFIX + 'company-1')
check(!rawJson.includes('blob:'), '저장 JSON에 blob: URL 없음')
check(rawJson.includes('Rina'), '저장 JSON에 크리에이터 이름 포함')

// 5) scoutSystem 왕복 — 오퍼는 templateId만 저장되고 로드 시 등록 풀에서 재구성
check(loaded.scoutSystem.openingScoutPending === false, `scoutSystem.openingScoutPending 보존(false)`)
check(loaded.scoutSystem.firstHireGuaranteed === false, `scoutSystem.firstHireGuaranteed 보존(false)`)
check(loaded.scoutSystem.activeOffer.templateId === 'c-456', `오퍼 templateId 보존: ${loaded.scoutSystem.activeOffer.templateId}`)
check(rawJson.includes('templateId'), '오퍼는 templateId로 저장 (미디어 제외)')
check(!/"grade":\{/.test(rawJson), '오퍼 템플릿 전체가 JSON에 없음')

// 6) 로드 시 하이드레이션 + ensureOpeningScout 재실행 → 재등장 여부
const registeredPool = [
  { id: 'c-123', name: 'Rina' },
  { id: 'c-456', name: 'Mia' },
]
const hydratedScout = hydrateScoutSystem(loaded.scoutSystem, registeredPool)
check(hydratedScout.activeOffer != null, '로드 후 대기 오퍼 복원')
check(hydratedScout.activeOffer.template.id === 'c-456', `오퍼 템플릿 재구성: ${hydratedScout.activeOffer.template.id}`)
check(hydratedScout.activeOffer.salary === 400, '오퍼 salary 보존')
const afterEnsure = ensureOpeningScout(hydratedScout)
check(afterEnsure.activeOffer.template.id === 'c-456', '오프닝 재등장 없음(기존 오퍼 유지)')

// 7) 구버전 세이브(no scoutSystem) fallback: ownedCreators 있으면 오프닝 재등장 금지
const oldSave = { ...savePayload }
delete oldSave.scoutSystem
const fallbackScout = createInitialScoutState(oldSave.broadcastMonthNumber ?? 1, {
  openingDone: (oldSave.ownedCreators?.length ?? 0) > 0,
})
check(fallbackScout.openingScoutPending === false, '구버전 fallback: 오프닝 재등장 금지')
const oldEnsure = ensureOpeningScout(fallbackScout)
check(oldEnsure.activeOffer == null, '구버전 fallback: 새 오퍼 미생성')

process.exit(failed ? 1 : 0)
