import {
  mergeCharacterLocaleText,
  pickCharacterLocaleText,
  primaryCharacterLocaleText,
  type CharacterLocaleText,
} from './characterLocales'
import type { Locale } from '../locales/i18n'
import { resolveMediaSrc } from './mediaUrl'

export const STAFF_KINDS = ['security', 'repair', 'care', 'production'] as const
export const STAFF_GENDERS = ['male', 'female'] as const

export type StaffKind = (typeof STAFF_KINDS)[number]
export type StaffGender = (typeof STAFF_GENDERS)[number]

export type StaffImage = {
  id: string
  fileName?: string
  fileSize?: number
  url?: string
  file?: File
}

export type RegisteredStaff = {
  id: string
  name: string
  names: CharacterLocaleText
  nameKey: string | null
  gender: StaffGender
  kind: StaffKind
  iconImageId: string | null
  cardImageId: string | null
  images: StaffImage[]
  mediaRevision?: number
}

export type AddStaffPayload = {
  name: string
  names: CharacterLocaleText
  nameKey: string | null
  gender: StaffGender
  kind: StaffKind
  iconImageId: string | null
  cardImageId: string | null
  images: StaffImage[]
}

export const STAFF_KIND_LABEL_KEY: Record<StaffKind, string> = {
  security: 'staff.kindSecurity',
  repair: 'staff.kindRepair',
  care: 'staff.kindCare',
  production: 'staff.kindProduction',
}

export const STAFF_GENDER_LABEL_KEY: Record<StaffGender, string> = {
  male: 'staff.genderMale',
  female: 'staff.genderFemale',
}

export const STAFF_KIND_INITIAL: Record<StaffKind, string> = {
  security: '보',
  repair: '수',
  care: '케',
  production: '프',
}

export function isStaffKind(value: unknown): value is StaffKind {
  return STAFF_KINDS.includes(value as StaffKind)
}

export function normalizeStaffKind(value: unknown): StaffKind {
  return isStaffKind(value) ? value : 'care'
}

export function isStaffGender(value: unknown): value is StaffGender {
  return STAFF_GENDERS.includes(value as StaffGender)
}

export function normalizeStaffGender(value: unknown): StaffGender {
  return isStaffGender(value) ? value : 'female'
}

export function staffMediaUrl(staffId: string, fileName: string, cacheKey?: string | number) {
  return resolveMediaSrc(`media://staff/${staffId}/images/${fileName}`, cacheKey ?? fileName)
}

export function staffImageOf(staff: RegisteredStaff, imageId: string | null | undefined) {
  if (!imageId) return null
  return staff.images.find((image) => image.id === imageId) ?? null
}

export function staffIconUrl(staff: RegisteredStaff | null | undefined) {
  if (!staff) return null
  return staffImageOf(staff, staff.iconImageId)?.url || null
}

export function staffCardUrl(staff: RegisteredStaff | null | undefined) {
  if (!staff) return null
  return staffImageOf(staff, staff.cardImageId)?.url || staffIconUrl(staff)
}

export function staffDisplayName(
  staff: Pick<RegisteredStaff, 'name' | 'names'> | null | undefined,
  locale: Locale | string | null | undefined,
) {
  if (!staff) return ''
  return pickCharacterLocaleText(staff.names, locale, staff.name)
}

export function normalizeRegisteredStaff(raw: Partial<RegisteredStaff> & { id: string }): RegisteredStaff {
  const names = mergeCharacterLocaleText(raw.names, raw.name ?? '')
  return {
    id: String(raw.id),
    names,
    name: primaryCharacterLocaleText(names) || String(raw.name ?? '').trim() || '이름 없음',
    nameKey: typeof raw.nameKey === 'string' && raw.nameKey ? raw.nameKey : null,
    gender: normalizeStaffGender(raw.gender),
    kind: normalizeStaffKind(raw.kind),
    iconImageId: raw.iconImageId ?? null,
    cardImageId: raw.cardImageId ?? null,
    images: Array.isArray(raw.images) ? raw.images : [],
    mediaRevision: raw.mediaRevision,
  }
}

export function createRegisteredStaff(input: RegisteredStaff): RegisteredStaff {
  return normalizeRegisteredStaff(input)
}
