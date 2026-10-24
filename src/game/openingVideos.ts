export const OPENING_VIDEO_SLOTS = 1

export type OpeningVideoConfig = {
  videos: Array<string | null>
}

export function emptyOpeningVideoConfig(): OpeningVideoConfig {
  return { videos: Array.from({ length: OPENING_VIDEO_SLOTS }, () => null) }
}

export function normalizeOpeningVideoConfig(raw: unknown): OpeningVideoConfig {
  const next = emptyOpeningVideoConfig()
  const videos = raw && typeof raw === 'object' ? (raw as { videos?: unknown }).videos : null
  if (!Array.isArray(videos)) return next
  for (let i = 0; i < OPENING_VIDEO_SLOTS; i += 1) {
    const name = String(videos[i] ?? '').trim()
    next.videos[i] = name || null
  }
  return next
}

export function openingVideoMediaPath(fileName: string) {
  return `media://chapter_assets/opening/${fileName}`
}

export function openingVideoFileNames(config: OpeningVideoConfig) {
  return config.videos.filter((name): name is string => Boolean(name))
}
