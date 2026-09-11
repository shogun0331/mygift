import { findCharacterIconUrl, type CharacterImage } from './characters'
import { pickCharacterLocaleText, type CharacterLocaleText } from './characterLocales'
import { s2tw } from './s2tw'

export type AchievementCategory = 'station' | 'broadcast' | 'creator' | 'casino'

export type AchievementRarity = 'bronze' | 'silver' | 'gold' | 'platinum'

export type CharacterAchievementAction =
  | 'date1'
  | 'date2'
  | 'h'
  | 'vip'
  | 's_rank'
  | 'sns'
  | 'sns_heat3'
  | 'vacation'
  | 'first_broadcast'

export interface AchievementDef {
  id: string
  category: AchievementCategory
  titleKey: string
  descKey: string
  icon: string
  rarity: AchievementRarity
  characterId?: string
  characterAction?: CharacterAchievementAction
  characterNames?: CharacterLocaleText
  characterNameFallback?: string
  characterProfileUrl?: string | null
}

export interface UnlockedAchievementRecord {
  id: string
  unlockedAt: number // timestamp
}

export const BASE_ACHIEVEMENTS: AchievementDef[] = [
  // 🏢 방송국 등급 승급
  {
    id: 'station_grade_tiny',
    category: 'station',
    titleKey: 'achievements.stationTinyTitle',
    descKey: 'achievements.stationTinyDesc',
    icon: '🌱',
    rarity: 'bronze',
  },
  {
    id: 'station_grade_sme',
    category: 'station',
    titleKey: 'achievements.stationSmeTitle',
    descKey: 'achievements.stationSmeDesc',
    icon: '🏢',
    rarity: 'silver',
  },
  {
    id: 'station_grade_mid',
    category: 'station',
    titleKey: 'achievements.stationMidTitle',
    descKey: 'achievements.stationMidDesc',
    icon: '🏙️',
    rarity: 'gold',
  },
  {
    id: 'station_grade_large',
    category: 'station',
    titleKey: 'achievements.stationLargeTitle',
    descKey: 'achievements.stationLargeDesc',
    icon: '💎',
    rarity: 'gold',
  },
  {
    id: 'station_grade_top',
    category: 'station',
    titleKey: 'achievements.stationTopTitle',
    descKey: 'achievements.stationTopDesc',
    icon: '👑',
    rarity: 'platinum',
  },

  // 🎙️ 방송 횟수 / 턴수
  {
    id: 'broadcast_turns_1',
    category: 'broadcast',
    titleKey: 'achievements.broadcast1Title',
    descKey: 'achievements.broadcast1Desc',
    icon: '🎙️',
    rarity: 'bronze',
  },
  {
    id: 'broadcast_turns_10',
    category: 'broadcast',
    titleKey: 'achievements.broadcast10Title',
    descKey: 'achievements.broadcast10Desc',
    icon: '📻',
    rarity: 'bronze',
  },
  {
    id: 'broadcast_turns_20',
    category: 'broadcast',
    titleKey: 'achievements.broadcast20Title',
    descKey: 'achievements.broadcast20Desc',
    icon: '📺',
    rarity: 'silver',
  },
  {
    id: 'broadcast_turns_30',
    category: 'broadcast',
    titleKey: 'achievements.broadcast30Title',
    descKey: 'achievements.broadcast30Desc',
    icon: '📡',
    rarity: 'silver',
  },
  {
    id: 'broadcast_turns_40',
    category: 'broadcast',
    titleKey: 'achievements.broadcast40Title',
    descKey: 'achievements.broadcast40Desc',
    icon: '🎬',
    rarity: 'gold',
  },
  {
    id: 'broadcast_turns_50',
    category: 'broadcast',
    titleKey: 'achievements.broadcast50Title',
    descKey: 'achievements.broadcast50Desc',
    icon: '🌟',
    rarity: 'platinum',
  },

  // 🎰 카지노 (슬롯 & 하이로우)
  {
    id: 'casino_slot_777',
    category: 'casino',
    titleKey: 'achievements.casinoSlot777Title',
    descKey: 'achievements.casinoSlot777Desc',
    icon: '🎰',
    rarity: 'platinum',
  },
  {
    id: 'casino_highlow_first_loss',
    category: 'casino',
    titleKey: 'achievements.casinoHighLowLossTitle',
    descKey: 'achievements.casinoHighLowLossDesc',
    icon: '🃏',
    rarity: 'bronze',
  },
  {
    id: 'casino_highlow_win_3',
    category: 'casino',
    titleKey: 'achievements.casinoHighLow3Title',
    descKey: 'achievements.casinoHighLow3Desc',
    icon: '🔥',
    rarity: 'bronze',
  },
  {
    id: 'casino_highlow_win_6',
    category: 'casino',
    titleKey: 'achievements.casinoHighLow6Title',
    descKey: 'achievements.casinoHighLow6Desc',
    icon: '⚡',
    rarity: 'silver',
  },
  {
    id: 'casino_highlow_win_9',
    category: 'casino',
    titleKey: 'achievements.casinoHighLow9Title',
    descKey: 'achievements.casinoHighLow9Desc',
    icon: '💥',
    rarity: 'gold',
  },
  {
    id: 'casino_highlow_win_12',
    category: 'casino',
    titleKey: 'achievements.casinoHighLow12Title',
    descKey: 'achievements.casinoHighLow12Desc',
    icon: '🐉',
    rarity: 'platinum',
  },
]

export const DEFAULT_CHARACTERS_DATA = [
  {
    id: '1786792656193-i7isvfo',
    name: '미야자와 리나',
    names: {
      ko: '미야자와 리나',
      en: 'Rina Miyazawa',
      ja: '宮沢 里奈',
      'zh-cn': '宫泽 里奈',
      'zh-tw': s2tw('宫泽 里奈'),
      ru: 'Рина Миядзава',
      es: 'Rina Miyazawa',
      de: 'Rina Miyazawa',
    },
    profileImageUrl: 'media://characters/1786792656193-i7isvfo/images/1787982369291-euwbqyb__card.webp',
  },
  {
    id: '1786833964287-iflkqh2',
    name: '타치바나 미사키',
    names: {
      ko: '타치바나 미사키',
      en: 'Misaki Tachibana',
      ja: '橘 美咲',
      'zh-cn': '橘 美咲',
      'zh-tw': s2tw('橘 美咲'),
      ru: 'Мисаки Татибана',
      es: 'Misaki Tachibana',
      de: 'Misaki Tachibana',
    },
    profileImageUrl: 'media://characters/1786833964287-iflkqh2/images/1787982427836-0drfnc2__card.webp',
  },
  {
    id: '1786849140255-p0lxz2i',
    name: '사토 메구미',
    names: {
      ko: '사토 메구미',
      en: 'Megumi Sato',
      ja: '佐藤 恵',
      'zh-cn': '佐藤 惠',
      'zh-tw': s2tw('佐藤 惠'),
      ru: 'Мэгуми Сато',
      es: 'Megumi Sato',
      de: 'Megumi Sato',
    },
    profileImageUrl: 'media://characters/1786849140255-p0lxz2i/images/1787982469617-m9tq17b__asset.webp',
  },
  {
    id: '1786850998437-g6olmc9',
    name: '아키야마 미호',
    names: {
      ko: '아키야마 미호',
      en: 'Miho Akiyama',
      ja: '秋山 美穂',
      'zh-cn': '秋山 美穗',
      'zh-tw': s2tw('秋山 美穗'),
      ru: 'Михо Акияма',
      es: 'Miho Akiyama',
      de: 'Miho Akiyama',
    },
    profileImageUrl: 'media://characters/1786850998437-g6olmc9/images/1787982488665-no2ynqd__asset.webp',
  },
  {
    id: '1786851057540-5sup19s',
    name: '시라카와 아야',
    names: {
      ko: '시라카와 아야',
      en: 'Aya Shirakawa',
      ja: '白川 彩',
      'zh-cn': '白川 彩',
      'zh-tw': s2tw('白川 彩'),
      ru: 'Ая Сиракава',
      es: 'Aya Shirakawa',
      de: 'Aya Shirakawa',
    },
    profileImageUrl: 'media://characters/1786851057540-5sup19s/images/1787982515769-uje63zv__asset.webp',
  },
  {
    id: '1786851109772-o2n3dj3',
    name: '센노 리나',
    names: {
      ko: '센노 리나',
      en: 'Rina Senno',
      ja: '千野 里奈',
      'zh-cn': '千野 里奈',
      'zh-tw': s2tw('千野 里奈'),
      ru: 'Рина Сэнно',
      es: 'Rina Senno',
      de: 'Rina Senno',
    },
    profileImageUrl: 'media://characters/1786851109772-o2n3dj3/images/1787982543675-lh3vdtj__asset.webp',
  },
  {
    id: '1786851153987-tb6qhg5',
    name: '루이자',
    names: {
      ko: '루이자',
      en: 'Luisa',
      ja: 'ルイーザ',
      'zh-cn': '路易莎',
      'zh-tw': s2tw('路易莎'),
      ru: 'Луиза',
      es: 'Luisa',
      de: 'Luisa',
    },
    profileImageUrl: 'media://characters/1786851153987-tb6qhg5/images/1787982563132-02ifwpr__asset.webp',
  },
  {
    id: '1786851211019-59swl59',
    name: '사쿠라기 마이',
    names: {
      ko: '사쿠라기 마이',
      en: 'Mai Sakuragi',
      ja: '桜木 舞',
      'zh-cn': '樱木 舞',
      'zh-tw': s2tw('樱木 舞'),
      ru: 'Май Сакураги',
      es: 'Mai Sakuragi',
      de: 'Mai Sakuragi',
    },
    profileImageUrl: 'media://characters/1786851211019-59swl59/images/1787982585733-jxb2shc__asset.webp',
  },
  {
    id: '1786851291899-dqn64g6',
    name: '리메이',
    names: {
      ko: '리메이',
      en: 'Li Mei',
      ja: '李美',
      'zh-cn': '李美',
      'zh-tw': s2tw('李美'),
      ru: 'Ли Мэй',
      es: 'Li Mei',
      de: 'Li Mei',
    },
    profileImageUrl: 'media://characters/1786851291899-dqn64g6/images/1787982616017-xwm18tz__asset.webp',
  },
]

export function createCharacterAchievements(char: {
  id: string
  name: string
  names?: CharacterLocaleText | Partial<Record<string, string>>
  profileImageUrl?: string | null
}): AchievementDef[] {
  const names = char.names as CharacterLocaleText | undefined
  const profileUrl = char.profileImageUrl ?? null
  return [
    {
      id: `char_${char.id}_date1`,
      category: 'creator',
      titleKey: 'achievements.charDate1Title',
      descKey: 'achievements.charDate1Desc',
      icon: '☕',
      rarity: 'bronze',
      characterId: char.id,
      characterAction: 'date1',
      characterNames: names,
      characterNameFallback: char.name,
      characterProfileUrl: profileUrl,
    },
    {
      id: `char_${char.id}_date2`,
      category: 'creator',
      titleKey: 'achievements.charDate2Title',
      descKey: 'achievements.charDate2Desc',
      icon: '🍷',
      rarity: 'silver',
      characterId: char.id,
      characterAction: 'date2',
      characterNames: names,
      characterNameFallback: char.name,
      characterProfileUrl: profileUrl,
    },
    {
      id: `char_${char.id}_h`,
      category: 'creator',
      titleKey: 'achievements.charHTitle',
      descKey: 'achievements.charHDesc',
      icon: '💋',
      rarity: 'gold',
      characterId: char.id,
      characterAction: 'h',
      characterNames: names,
      characterNameFallback: char.name,
      characterProfileUrl: profileUrl,
    },
    {
      id: `char_${char.id}_vip`,
      category: 'creator',
      titleKey: 'achievements.charVipTitle',
      descKey: 'achievements.charVipDesc',
      icon: '🥂',
      rarity: 'gold',
      characterId: char.id,
      characterAction: 'vip',
      characterNames: names,
      characterNameFallback: char.name,
      characterProfileUrl: profileUrl,
    },
    {
      id: `char_${char.id}_s_rank`,
      category: 'creator',
      titleKey: 'achievements.charSRankTitle',
      descKey: 'achievements.charSRankDesc',
      icon: '⭐',
      rarity: 'platinum',
      characterId: char.id,
      characterAction: 's_rank',
      characterNames: names,
      characterNameFallback: char.name,
      characterProfileUrl: profileUrl,
    },
    {
      id: `char_${char.id}_sns`,
      category: 'creator',
      titleKey: 'achievements.charSnsTitle',
      descKey: 'achievements.charSnsDesc',
      icon: '📱',
      rarity: 'bronze',
      characterId: char.id,
      characterAction: 'sns',
      characterNames: names,
      characterNameFallback: char.name,
      characterProfileUrl: profileUrl,
    },
    {
      id: `char_${char.id}_sns_heat3`,
      category: 'creator',
      titleKey: 'achievements.charSnsHeat3Title',
      descKey: 'achievements.charSnsHeat3Desc',
      icon: '🔥',
      rarity: 'gold',
      characterId: char.id,
      characterAction: 'sns_heat3',
      characterNames: names,
      characterNameFallback: char.name,
      characterProfileUrl: profileUrl,
    },
    {
      id: `char_${char.id}_vacation`,
      category: 'creator',
      titleKey: 'achievements.charVacationTitle',
      descKey: 'achievements.charVacationDesc',
      icon: '🌴',
      rarity: 'silver',
      characterId: char.id,
      characterAction: 'vacation',
      characterNames: names,
      characterNameFallback: char.name,
      characterProfileUrl: profileUrl,
    },
    {
      id: `char_${char.id}_first_broadcast`,
      category: 'creator',
      titleKey: 'achievements.charFirstBroadcastTitle',
      descKey: 'achievements.charFirstBroadcastDesc',
      icon: '🎙️',
      rarity: 'bronze',
      characterId: char.id,
      characterAction: 'first_broadcast',
      characterNames: names,
      characterNameFallback: char.name,
      characterProfileUrl: profileUrl,
    },
  ]
}

// Map for dynamic character achievements
const dynamicCharacterMap = new Map<string, AchievementDef>()

// Initialize default characters
DEFAULT_CHARACTERS_DATA.forEach((char) => {
  const defs = createCharacterAchievements(char)
  defs.forEach((d) => dynamicCharacterMap.set(d.id, d))
})

export function registerCharacterAchievements(
  characters: Array<{
    id: string
    name: string
    names?: CharacterLocaleText | Partial<Record<string, string>>
    profileImageUrl?: string | null
    characterIconId?: string | null
    profileImageId?: string | null
    images?: CharacterImage[] | null
  }>,
) {
  characters.forEach((char) => {
    const iconUrl = findCharacterIconUrl(char) ?? char.profileImageUrl ?? null
    const defs = createCharacterAchievements({ ...char, profileImageUrl: iconUrl })
    defs.forEach((d) => dynamicCharacterMap.set(d.id, d))
  })
}

export function getAllAchievements(): AchievementDef[] {
  return [...BASE_ACHIEVEMENTS, ...Array.from(dynamicCharacterMap.values())]
}

export function getAchievementDef(id: string): AchievementDef | undefined {
  const foundBase = BASE_ACHIEVEMENTS.find((a) => a.id === id)
  if (foundBase) return foundBase
  return dynamicCharacterMap.get(id)
}

const CHAR_ACTION_I18N: Record<
  CharacterAchievementAction,
  { titleKey: string; descKey: string; titleFb: string; descFb: string }
> = {
  date1: {
    titleKey: 'achievements.charDate1Title',
    descKey: 'achievements.charDate1Desc',
    titleFb: '{name} 데이트 1',
    descFb: '{name}과의 첫 번째 데이트 완료',
  },
  date2: {
    titleKey: 'achievements.charDate2Title',
    descKey: 'achievements.charDate2Desc',
    titleFb: '{name} 데이트 2',
    descFb: '{name}과의 두 번째 데이트 완료',
  },
  h: {
    titleKey: 'achievements.charHTitle',
    descKey: 'achievements.charHDesc',
    titleFb: '{name} 비밀 밀회 H',
    descFb: '{name}과의 특별한 비밀 밀회 완료',
  },
  vip: {
    titleKey: 'achievements.charVipTitle',
    descKey: 'achievements.charVipDesc',
    titleFb: '{name} VIP 시크릿',
    descFb: '{name}의 VIP 프라이빗 이벤트 완료',
  },
  s_rank: {
    titleKey: 'achievements.charSRankTitle',
    descKey: 'achievements.charSRankDesc',
    titleFb: '{name} S등급 달성',
    descFb: '{name}을(를) 최고 등급(S등급)으로 승급 완료',
  },
  sns: {
    titleKey: 'achievements.charSnsTitle',
    descKey: 'achievements.charSnsDesc',
    titleFb: '{name} 첫 SNS 게시',
    descFb: '{name}의 첫 SNS 게시물을 올렸습니다',
  },
  sns_heat3: {
    titleKey: 'achievements.charSnsHeat3Title',
    descKey: 'achievements.charSnsHeat3Desc',
    titleFb: '{name} 첫 파격적인 화보',
    descFb: '{name}의 첫 파격적인 화보를 게시했습니다',
  },
  vacation: {
    titleKey: 'achievements.charVacationTitle',
    descKey: 'achievements.charVacationDesc',
    titleFb: '{name} 첫 특별휴가',
    descFb: '{name}에게 첫 특별휴가를 보냈습니다',
  },
  first_broadcast: {
    titleKey: 'achievements.charFirstBroadcastTitle',
    descKey: 'achievements.charFirstBroadcastDesc',
    titleFb: '{name} 첫 방송',
    descFb: '{name}의 첫 방송을 진행했습니다',
  },
}

function characterAchievementName(ach: AchievementDef, locale: string) {
  return ach.characterNames
    ? pickCharacterLocaleText(ach.characterNames, locale, ach.characterNameFallback || '')
    : ach.characterNameFallback || ''
}

export function getAchievementTitle(
  ach: AchievementDef,
  t: (key: string) => string,
  locale: string,
): string {
  if (ach.characterAction) {
    const spec = CHAR_ACTION_I18N[ach.characterAction]
    const charName = characterAchievementName(ach, locale)
    if (!spec) return `${charName}`.trim() || ach.titleKey
    return (t(spec.titleKey) || spec.titleFb).replace('{name}', charName)
  }
  return t(ach.titleKey) || ach.titleKey
}

export function getAchievementDesc(
  ach: AchievementDef,
  t: (key: string) => string,
  locale: string,
): string {
  if (ach.characterAction) {
    const spec = CHAR_ACTION_I18N[ach.characterAction]
    const charName = characterAchievementName(ach, locale)
    if (!spec) return ach.descKey
    return (t(spec.descKey) || spec.descFb).replace('{name}', charName)
  }
  return t(ach.descKey) || ach.descKey
}

export function unlockCharacterAchievement(
  characterId: string,
  action: CharacterAchievementAction,
): boolean {
  return unlockAchievement(`char_${characterId}_${action}`)
}

const STORAGE_KEY = 'broadcast_game_achievements'

export const ACHIEVEMENT_UNLOCK_EVENT = 'broadcast-achievement-unlocked'

type UnlockListener = (achievement: AchievementDef) => void
const unlockListeners = new Set<UnlockListener>()
const pendingUnlockToasts: AchievementDef[] = []

function enqueueUnlockToast(achievement: AchievementDef) {
  if (!pendingUnlockToasts.some((row) => row.id === achievement.id)) {
    pendingUnlockToasts.push(achievement)
  }
  unlockListeners.forEach((listener) => {
    try {
      listener(achievement)
    } catch (e) {
      console.error('Error in achievement unlock listener:', e)
    }
  })
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ACHIEVEMENT_UNLOCK_EVENT, { detail: achievement }))
  }
}

export function ackAchievementToasts(ids: string[]) {
  if (ids.length === 0) return
  const drop = new Set(ids)
  for (let i = pendingUnlockToasts.length - 1; i >= 0; i -= 1) {
    const row = pendingUnlockToasts[i]
    if (row && drop.has(row.id)) pendingUnlockToasts.splice(i, 1)
  }
}

export function subscribeAchievementUnlock(listener: UnlockListener): () => void {
  unlockListeners.add(listener)
  pendingUnlockToasts.forEach((achievement) => {
    try {
      listener(achievement)
    } catch (e) {
      console.error('Error in achievement unlock listener:', e)
    }
  })
  return () => {
    unlockListeners.delete(listener)
  }
}

export function loadUnlockedAchievements(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, number>
    }
    return {}
  } catch (e) {
    console.error('Failed to load achievements from storage:', e)
    return {}
  }
}

export function isAchievementUnlocked(id: string): boolean {
  const map = loadUnlockedAchievements()
  return Boolean(map[id])
}

export function unlockAchievement(id: string): boolean {
  if (typeof window === 'undefined') return false
  const achDef = getAchievementDef(id)
  if (!achDef) return false

  const map = loadUnlockedAchievements()
  if (map[id]) {
    // Already unlocked previously
    return false
  }

  const now = Date.now()
  map[id] = now

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch (e) {
    console.error('Failed to save achievement unlock:', e)
  }

  enqueueUnlockToast(achDef)

  const unlockName = achDef.characterAction
    ? `${achDef.characterNameFallback || achDef.characterId || 'character'} ${achDef.characterAction}`
    : achDef.titleKey
  void window.electronAPI?.trackAchievementUnlock?.({
    id,
    name: unlockName,
  })

  return true
}

export function revokeAchievement(id: string): boolean {
  if (typeof window === 'undefined') return false
  const map = loadUnlockedAchievements()
  if (!map[id]) return false
  delete map[id]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch (e) {
    console.error('Failed to revoke achievement:', e)
    return false
  }
  const pendingIdx = pendingUnlockToasts.findIndex((row) => row.id === id)
  if (pendingIdx >= 0) pendingUnlockToasts.splice(pendingIdx, 1)
  window.dispatchEvent(new CustomEvent('achievements-reset'))
  return true
}

export function resetAchievements(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
    pendingUnlockToasts.splice(0, pendingUnlockToasts.length)
    window.dispatchEvent(new CustomEvent('achievements-reset'))
  } catch (e) {
    console.error('Failed to reset achievements:', e)
  }
}

export function getAchievementStats() {
  const map = loadUnlockedAchievements()
  const all = getAllAchievements()
  const total = all.length
  const unlocked = all.filter((a) => Boolean(map[a.id])).length
  const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0
  return {
    total,
    unlocked,
    percentage,
  }
}

