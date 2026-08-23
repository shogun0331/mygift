import {
  mergeCharacterLocaleText,
  primaryCharacterLocaleText,
  type CharacterLocaleText,
} from './characterLocales'
import {
  createRegisteredStaff,
  type RegisteredStaff,
  type StaffGender,
  type StaffKind,
} from './staff'

export type StaffNamePack = {
  key: string
  gender: StaffGender
  names: CharacterLocaleText
}

function namePack(
  key: string,
  gender: StaffGender,
  ja: string,
  ko: string,
  en: string,
  zh: string,
  ru: string,
): StaffNamePack {
  const names = mergeCharacterLocaleText({
    ja,
    ko,
    en,
    'zh-cn': zh,
    ru,
    es: en,
    de: en,
  })
  return { key, gender, names }
}

/** 남 12 · 여 12 — 성별을 고르면 이 풀에서 이름을 고른다 */
export const STAFF_NAME_BANK: StaffNamePack[] = [
  namePack('tanaka-haruto', 'male', '田中 陽翔', '타나카 하루토', 'Haruto Tanaka', '田中 阳翔', 'Харуто Танака'),
  namePack('inoue-ren', 'male', '井上 蓮', '이노우에 렌', 'Ren Inoue', '井上 莲', 'Рен Иноуэ'),
  namePack('kimura-sota', 'male', '木村 颯太', '키무라 소타', 'Sota Kimura', '木村 飒太', 'Сота Кимура'),
  namePack('hayashi-kaito', 'male', '林 海斗', '하야시 카이토', 'Kaito Hayashi', '林 海斗', 'Кайто Хаяси'),
  namePack('shimizu-yuto', 'male', '清水 悠人', '시미즈 유토', 'Yuto Shimizu', '清水 悠人', 'Юто Симидзу'),
  namePack('yamaguchi-hiroto', 'male', '山口 大翔', '야마구치 히로토', 'Hiroto Yamaguchi', '山口 大翔', 'Хирото Ямагути'),
  namePack('matsumoto-renya', 'male', '松本 蓮也', '마츠모토 렌야', 'Renya Matsumoto', '松本 莲也', 'Реня Мацумото'),
  namePack('abe-kento', 'male', '阿部 健人', '아베 켄토', 'Kento Abe', '阿部 健人', 'Кенто Абэ'),
  namePack('ishida-ryo', 'male', '石田 涼', '이시다 료', 'Ryo Ishida', '石田 凉', 'Рё Исида'),
  namePack('mori-daichi', 'male', '森 大地', '모리 다이치', 'Daichi Mori', '森 大地', 'Дайти Мори'),
  namePack('ikeda-shota', 'male', '池田 翔太', '이케다 쇼타', 'Shota Ikeda', '池田 翔太', 'Сёта Икэда'),
  namePack('fujita-makoto', 'male', '藤田 誠', '후지타 마코토', 'Makoto Fujita', '藤田 诚', 'Макото Фудзита'),
  namePack('takahashi-aya', 'female', '高橋 彩', '타카하시 아야', 'Aya Takahashi', '高桥 彩', 'Ая Такахаси'),
  namePack('suzuki-hana', 'female', '鈴木 花', '스즈키 하나', 'Hana Suzuki', '铃木 花', 'Хана Судзуки'),
  namePack('watanabe-rin', 'female', '渡辺 凛', '와타나베 린', 'Rin Watanabe', '渡边 凛', 'Рин Ватанабэ'),
  namePack('ito-saki', 'female', '伊藤 咲', '이토 사키', 'Saki Ito', '伊藤 咲', 'Саки Ито'),
  namePack('yamamoto-yui', 'female', '山本 結衣', '야마모토 유이', 'Yui Yamamoto', '山本 结衣', 'Юи Ямамото'),
  namePack('nakamura-mei', 'female', '中村 芽衣', '나카무라 메이', 'Mei Nakamura', '中村 芽衣', 'Мэй Накамура'),
  namePack('kobayashi-nao', 'female', '小林 奈央', '코바야시 나오', 'Nao Kobayashi', '小林 奈央', 'Нао Кобаяси'),
  namePack('kato-rika', 'female', '加藤 梨花', '카토 리카', 'Rika Kato', '加藤 梨花', 'Рика Като'),
  namePack('yoshida-hina', 'female', '吉田 陽菜', '요시다 히나', 'Hina Yoshida', '吉田 阳菜', 'Хина Ёсида'),
  namePack('yamada-mio', 'female', '山田 澪', '야마다 미오', 'Mio Yamada', '山田 澪', 'Мио Ямада'),
  namePack('sasaki-kotone', 'female', '佐々木 琴音', '사사키 코토네', 'Kotone Sasaki', '佐佐木 琴音', 'Котонэ Сасаки'),
  namePack('sato-miyu', 'female', '佐藤 美優', '사토 미유', 'Miyu Sato', '佐藤 美优', 'Мию Сато'),
]

type SeedDef = {
  id: string
  kind: StaffKind
  nameKey: string
}

/** 역할 4종 × 슬롯 6칸 = 24명. 역할마다 남 3 · 여 3 */
const SEED_DEFS: SeedDef[] = [
  { id: 'staff-security-01', kind: 'security', nameKey: 'takahashi-aya' },
  { id: 'staff-security-02', kind: 'security', nameKey: 'tanaka-haruto' },
  { id: 'staff-security-03', kind: 'security', nameKey: 'suzuki-hana' },
  { id: 'staff-security-04', kind: 'security', nameKey: 'inoue-ren' },
  { id: 'staff-security-05', kind: 'security', nameKey: 'watanabe-rin' },
  { id: 'staff-security-06', kind: 'security', nameKey: 'kimura-sota' },
  { id: 'staff-repair-01', kind: 'repair', nameKey: 'hayashi-kaito' },
  { id: 'staff-repair-02', kind: 'repair', nameKey: 'ito-saki' },
  { id: 'staff-repair-03', kind: 'repair', nameKey: 'shimizu-yuto' },
  { id: 'staff-repair-04', kind: 'repair', nameKey: 'yamamoto-yui' },
  { id: 'staff-repair-05', kind: 'repair', nameKey: 'yamaguchi-hiroto' },
  { id: 'staff-repair-06', kind: 'repair', nameKey: 'nakamura-mei' },
  { id: 'staff-care-01', kind: 'care', nameKey: 'kobayashi-nao' },
  { id: 'staff-care-02', kind: 'care', nameKey: 'matsumoto-renya' },
  { id: 'staff-care-03', kind: 'care', nameKey: 'kato-rika' },
  { id: 'staff-care-04', kind: 'care', nameKey: 'abe-kento' },
  { id: 'staff-care-05', kind: 'care', nameKey: 'yoshida-hina' },
  { id: 'staff-care-06', kind: 'care', nameKey: 'ishida-ryo' },
  { id: 'staff-production-01', kind: 'production', nameKey: 'mori-daichi' },
  { id: 'staff-production-02', kind: 'production', nameKey: 'yamada-mio' },
  { id: 'staff-production-03', kind: 'production', nameKey: 'ikeda-shota' },
  { id: 'staff-production-04', kind: 'production', nameKey: 'sasaki-kotone' },
  { id: 'staff-production-05', kind: 'production', nameKey: 'fujita-makoto' },
  { id: 'staff-production-06', kind: 'production', nameKey: 'sato-miyu' },
]

export function staffNamePackByKey(key: string | null | undefined) {
  if (!key) return null
  return STAFF_NAME_BANK.find((pack) => pack.key === key) ?? null
}

export function pickStaffNamePack(
  gender: StaffGender,
  usedKeys: ReadonlySet<string>,
  preferKey?: string | null,
): StaffNamePack {
  const ofGender = STAFF_NAME_BANK.filter((pack) => pack.gender === gender)
  if (preferKey) {
    const preferred = ofGender.find((pack) => pack.key === preferKey)
    if (preferred) return preferred
  }
  const unused = ofGender.find((pack) => !usedKeys.has(pack.key))
  return unused ?? ofGender[0] ?? STAFF_NAME_BANK[0]
}

function staffFromPack(id: string, kind: StaffKind, pack: StaffNamePack): RegisteredStaff {
  return createRegisteredStaff({
    id,
    name: primaryCharacterLocaleText(pack.names),
    names: pack.names,
    nameKey: pack.key,
    gender: pack.gender,
    kind,
    iconImageId: null,
    cardImageId: null,
    images: [],
  })
}

export function createSeededStaffRoster(): RegisteredStaff[] {
  return SEED_DEFS.map((def) => {
    const pack = staffNamePackByKey(def.nameKey) ?? STAFF_NAME_BANK[0]
    return staffFromPack(def.id, def.kind, pack)
  })
}

export function seededStaffToJson() {
  return createSeededStaffRoster().map((row) => ({
    id: row.id,
    name: row.name,
    names: row.names,
    nameKey: row.nameKey,
    gender: row.gender,
    kind: row.kind,
    iconImageId: row.iconImageId,
    cardImageId: row.cardImageId,
    images: row.images,
  }))
}

/** 시드 24명이 없으면 채운다. 이미 있는 칸의 이미지·역할·성별 수정은 유지한다. */
export function mergeSeededStaff(loaded: RegisteredStaff[]): RegisteredStaff[] {
  const seeds = createSeededStaffRoster()
  const byId = new Map(loaded.map((row) => [row.id, row]))
  const merged = seeds.map((seed) => {
    const existing = byId.get(seed.id)
    if (!existing) return seed
    return createRegisteredStaff({
      ...seed,
      ...existing,
      id: seed.id,
      names: existing.names,
      name: existing.name || seed.name,
      nameKey: existing.nameKey || seed.nameKey,
      gender: existing.gender || seed.gender,
      kind: existing.kind || seed.kind,
      iconImageId: existing.iconImageId,
      cardImageId: existing.cardImageId,
      images: existing.images,
      mediaRevision: existing.mediaRevision,
    })
  })
  const seedIds = new Set(seeds.map((row) => row.id))
  for (const row of loaded) {
    if (!seedIds.has(row.id)) merged.push(row)
  }
  return merged
}
