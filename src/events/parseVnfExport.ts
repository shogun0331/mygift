import JSZip from 'jszip'
import {
  createGameEventId,
  type EventMediaAsset,
  type EventMediaKind,
  type GameEvent,
  type VnfCharacterDef,
  type VnfPointDef,
} from './types'
import { EVENT_LOCALES, mergeEventLocalization, normalizeEventLocale } from './eventLocales'

function createAssetId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

type ProjectJson = {
  project_id?: string
  title?: string
  default_language?: string
  supported_languages?: string[]
  chapters?: Array<{ id: number; title_key?: string; file?: string }>
  characters?: Record<
    string,
    { name_key?: string; name?: string; names?: Record<string, string> }
  >
  points?: Array<{ key: string; label: string }>
}

type ChapterJson = {
  chapter?: number
  title_key?: string
  start_node?: string
  nodes?: unknown[]
}

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp'])
const VIDEO_EXT = new Set(['mp4', 'webm'])
const SOUND_EXT = new Set(['mp3', 'wav', 'ogg'])

function normalizePath(path: string) {
  return path.replace(/\\/g, '/').replace(/^\/+/, '')
}

function isMacJunk(path: string) {
  return path.includes('__MACOSX') || path.split('/').some((part) => part.startsWith('._'))
}

function extOf(fileName: string) {
  const i = fileName.lastIndexOf('.')
  return i >= 0 ? fileName.slice(i + 1).toLowerCase() : ''
}

function kindFromExt(ext: string): EventMediaKind | null {
  if (IMAGE_EXT.has(ext)) return 'image'
  if (VIDEO_EXT.has(ext)) return 'video'
  if (SOUND_EXT.has(ext)) return 'sound'
  return null
}

function mimeFor(kind: EventMediaKind, ext: string) {
  if (kind === 'image') {
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
    if (ext === 'gif') return 'image/gif'
    if (ext === 'webp') return 'image/webp'
    return 'image/png'
  }
  if (kind === 'video') {
    if (ext === 'webm') return 'video/webm'
    return 'video/mp4'
  }
  if (ext === 'wav') return 'audio/wav'
  if (ext === 'ogg') return 'audio/ogg'
  return 'audio/mpeg'
}

function folderForKind(kind: EventMediaKind) {
  if (kind === 'image') return 'images'
  if (kind === 'video') return 'videos'
  return 'sounds'
}

function findProjectJsonPath(paths: string[]): string | null {
  const candidates = paths.filter((p) => !isMacJunk(p) && /(^|\/)project\.json$/i.test(p))
  if (candidates.length === 0) return null
  candidates.sort((a, b) => a.split('/').length - b.split('/').length || a.length - b.length)
  return candidates[0] ?? null
}

function joinRoot(root: string, relative: string) {
  const rel = relative.replace(/^\/+/, '')
  return root ? `${root}/${rel}` : rel
}

async function readJson<T>(zip: JSZip, path: string): Promise<T> {
  const entry = zip.file(path)
  if (!entry) throw new Error(`필수 파일이 없습니다: ${path}`)
  const text = await entry.async('text')
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`JSON 파싱 실패: ${path}`)
  }
}

async function tryReadJson<T>(zip: JSZip, path: string): Promise<T | null> {
  const entry = zip.file(path)
  if (!entry) return null
  const text = await entry.async('text')
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

function listMediaFileNamesReferenced(nodes: unknown[]): Set<string> {
  const names = new Set<string>()

  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    const n = node as Record<string, unknown>

    if (typeof n.image === 'string' && n.image.trim()) names.add(n.image.trim())
    if (typeof n.sound === 'string' && n.sound.trim()) names.add(n.sound.trim())
    if (typeof n.voice === 'string' && n.voice.trim()) names.add(n.voice.trim())
    if (n.voice && typeof n.voice === 'object') {
      for (const value of Object.values(n.voice as Record<string, unknown>)) {
        if (typeof value === 'string' && value.trim()) names.add(value.trim())
      }
    }

    if (n.type === 'custom' && Array.isArray(n.fields)) {
      for (const field of n.fields) {
        if (!field || typeof field !== 'object') continue
        const f = field as { value_type?: string; value?: string }
        if (f.value_type === 'image' && typeof f.value === 'string' && f.value.trim()) {
          names.add(f.value.trim())
        }
      }
    }

    if (n.type === 'event' && Array.isArray(n.nodes)) {
      for (const child of n.nodes) visit(child)
    }
  }

  for (const node of nodes) visit(node)
  return names
}

async function loadMediaForChapter(
  zip: JSZip,
  root: string,
  chapterId: number,
  referenced: Set<string>,
): Promise<EventMediaAsset[]> {
  const byFileName = new Map<string, EventMediaAsset>()

  const tryAdd = async (path: string, fileName: string, kind: EventMediaKind) => {
    if (byFileName.has(fileName)) return
    const entry = zip.file(path)
    if (!entry) return
    const ext = extOf(fileName)
    const data = await entry.async('blob')
    const blob = data.type ? data : new Blob([data], { type: mimeFor(kind, ext) })
    const url = URL.createObjectURL(blob)
    byFileName.set(fileName, {
      id: createAssetId(),
      fileName,
      kind,
      sourcePath: path,
      blob,
      url,
      size: blob.size,
    })
  }

  const prefixes = [
    joinRoot(root, `chapter_assets/${chapterId}`),
    joinRoot(root, 'assets'),
  ]

  for (const prefix of prefixes) {
    for (const kind of ['image', 'video', 'sound'] as EventMediaKind[]) {
      const folder = `${prefix}/${folderForKind(kind)}/`
      const folderLower = folder.toLowerCase()
      for (const [path, entry] of Object.entries(zip.files)) {
        if (entry.dir || isMacJunk(path)) continue
        const normalized = normalizePath(path)
        if (!normalized.toLowerCase().startsWith(folderLower)) continue
        const fileName = normalized.slice(normalized.lastIndexOf('/') + 1)
        if (!fileName) continue
        const detected = kindFromExt(extOf(fileName))
        if (detected !== kind) continue
        await tryAdd(normalized, fileName, kind)
      }
    }
  }

  for (const fileName of referenced) {
    if (byFileName.has(fileName)) continue
    const kind = kindFromExt(extOf(fileName))
    if (!kind) continue
    const candidates = [
      joinRoot(root, `chapter_assets/${chapterId}/${folderForKind(kind)}/${fileName}`),
      joinRoot(root, `assets/${folderForKind(kind)}/${fileName}`),
    ]
    for (const path of candidates) {
      if (zip.file(path)) {
        await tryAdd(path, fileName, kind)
        break
      }
    }
  }

  return [...byFileName.values()].sort((a, b) => a.fileName.localeCompare(b.fileName))
}

function flattenNodeVoice(nodes: unknown[]): unknown[] {
  const flattenVoice = (value: unknown): string => {
    if (typeof value === 'string') return value
    if (value && typeof value === 'object') {
      const first = Object.values(value as Record<string, unknown>).find(
        (v) => typeof v === 'string' && v.trim(),
      )
      return typeof first === 'string' ? first : ''
    }
    return ''
  }

  const visit = (list: unknown[]): unknown[] =>
    list.map((node) => {
      if (!node || typeof node !== 'object') return node
      const n = { ...(node as Record<string, unknown>) }
      if (n.type !== 'sound' && n.voice != null) {
        n.voice = flattenVoice(n.voice)
      }
      if (n.type === 'event' && Array.isArray(n.nodes)) {
        n.nodes = visit(n.nodes)
      }
      return n
    })

  return visit(nodes)
}

function resolveTitle(
  titleKey: string,
  localization: Record<string, Record<string, string>>,
  defaultLanguage: string,
  fallback: string,
) {
  const primary = localization[defaultLanguage]?.[titleKey]
  if (primary) return primary
  for (const map of Object.values(localization)) {
    if (map[titleKey]) return map[titleKey]
  }
  return fallback || titleKey
}

function mapCharacters(characters: ProjectJson['characters']): VnfCharacterDef[] {
  if (!characters) return []
  return Object.entries(characters).map(([id, character]) => ({
    id,
    nameKey: character.name_key,
    name: character.name,
    names: character.names,
  }))
}

function mapPoints(points: ProjectJson['points']): VnfPointDef[] {
  if (!points) return []
  return points.map((point) => ({ key: point.key, label: point.label }))
}

export type ParseVnfResult = {
  events: GameEvent[]
  warnings: string[]
}

/**
 * Parse a VNF export ZIP. Each chapter becomes one GameEvent,
 * with image/video/sound assets bound to that event.
 */
export async function parseVnfExportZip(file: File): Promise<ParseVnfResult> {
  const warnings: string[] = []
  const zip = await JSZip.loadAsync(file)
  const paths = Object.keys(zip.files).map(normalizePath)
  const projectPath = findProjectJsonPath(paths)
  if (!projectPath) {
    throw new Error('project.json 을 찾을 수 없습니다. VNF Export ZIP 인지 확인하세요.')
  }

  const root = projectPath.includes('/')
    ? projectPath.slice(0, projectPath.lastIndexOf('/'))
    : ''

  const project = await readJson<ProjectJson>(zip, projectPath)
  const projectId = project.project_id ?? 'unknown'
  const projectTitle = project.title ?? projectId
  const defaultLanguage = normalizeEventLocale(project.default_language)
  const chapterMetas = project.chapters ?? []

  if (chapterMetas.length === 0) {
    throw new Error('project.json 에 chapters 가 없습니다.')
  }

  const characters = mapCharacters(project.characters)
  const points = mapPoints(project.points)
  const events: GameEvent[] = []

  for (const meta of chapterMetas) {
    const chapterFile = meta.file ?? `chapter_${meta.id}.json`
    const chapterPath = joinRoot(root, `chapters/${chapterFile}`)
    const chapter = await readJson<ChapterJson>(zip, chapterPath)
    const chapterId = chapter.chapter ?? meta.id
    const titleKey = chapter.title_key ?? meta.title_key ?? `ch${chapterId}_title`
    const nodes = flattenNodeVoice(Array.isArray(chapter.nodes) ? chapter.nodes : [])
    const startNode = chapter.start_node ?? ''

    if (!startNode) {
      warnings.push(`챕터 ${chapterId}: start_node 가 없습니다.`)
    }

    const localizationRaw: Record<string, Record<string, string>> = {}
    const langs = new Set<string>([
      ...(project.supported_languages ?? []),
      defaultLanguage,
      ...EVENT_LOCALES,
    ])

    for (const lang of langs) {
      const locPath = joinRoot(root, `localization/${lang}/${chapterFile}`)
      const map = await tryReadJson<Record<string, string>>(zip, locPath)
      if (map) localizationRaw[lang] = map
    }

    const localization = mergeEventLocalization(localizationRaw)

    if (Object.values(localization).every((map) => Object.keys(map).length === 0)) {
      warnings.push(`챕터 ${chapterId}: localization 파일을 찾지 못했습니다.`)
    }

    const referenced = listMediaFileNamesReferenced(nodes)
    const media = await loadMediaForChapter(zip, root, chapterId, referenced)

    const missing = [...referenced].filter((name) => !media.some((m) => m.fileName === name))
    if (missing.length > 0) {
      warnings.push(
        `챕터 ${chapterId}: 참조 미디어를 ZIP에서 못 찾음 — ${missing.slice(0, 5).join(', ')}${
          missing.length > 5 ? ` 외 ${missing.length - 5}개` : ''
        }`,
      )
    }

    events.push({
      id: createGameEventId(),
      projectId,
      projectTitle,
      chapterId,
      titleKey,
      title: resolveTitle(titleKey, localization, defaultLanguage, `이벤트 ${chapterId}`),
      startNode,
      nodes,
      localization,
      defaultLanguage,
      characters,
      points,
      media,
      sourceZipName: file.name,
      createdAt: new Date().toISOString(),
      ownerCharacterId: null,
    })
  }

  return { events, warnings }
}
