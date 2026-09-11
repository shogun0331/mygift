/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REVIEW_BUILD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.txt?raw' {
  const content: string
  export default content
}

declare module '*.json' {
  const value: any
  export default value
}

interface ElectronAPI {
  platform: string
  saveEventAssets?: (
    eventId: string,
    assets: Array<{ fileName: string; kind: string; buffer: ArrayBuffer | number[] }>
  ) => Promise<{ success: boolean; path?: string; error?: string }>
  saveCharacterAssets?: (
    characterId: string,
    assets: Array<{ id: string; fileName: string; kind: string; buffer: ArrayBuffer }>
  ) => Promise<{ success: boolean; path?: string; error?: string }>
  saveCharactersJson?: (
    characters: any[]
  ) => Promise<{ success: boolean; characters?: any[]; error?: string }>
  loadCharactersJson?: (
  ) => Promise<{ success: boolean; characters?: any[]; error?: string }>
  saveEventsJson?: (
    events: any[]
  ) => Promise<{ success: boolean; error?: string }>
  loadEventsJson?: (
  ) => Promise<{ success: boolean; events?: any[]; error?: string }>
  saveCommonEventLinksJson?: (
    links: Record<string, string | null>
  ) => Promise<{ success: boolean; error?: string }>
  loadCommonEventLinksJson?: (
  ) => Promise<{ success: boolean; links?: Record<string, string | null>; error?: string }>
  saveCommonSoundAssets?: (
    assets: Array<{ fileName: string; buffer: ArrayBuffer | number[] }>
  ) => Promise<{ success: boolean; path?: string; error?: string }>
  saveCommonSoundsJson?: (
    sounds: any[]
  ) => Promise<{ success: boolean; error?: string }>
  loadCommonSoundsJson?: (
  ) => Promise<{ success: boolean; sounds?: any[]; error?: string }>
  deleteCommonSoundFile?: (
    fileName: string
  ) => Promise<{ success: boolean; error?: string }>
  saveHighLowAssets?: (
    assets: Array<{ fileName: string; buffer: ArrayBuffer | number[] }>
  ) => Promise<{ success: boolean; path?: string; error?: string }>
  saveHighLowConfigJson?: (
    config: Record<string, unknown>
  ) => Promise<{ success: boolean; config?: any; error?: string }>
  loadHighLowConfigJson?: (
  ) => Promise<{ success: boolean; config?: Record<string, unknown>; error?: string }>
  saveBgmAssets?: (
    assets: Array<{ fileName: string; buffer: ArrayBuffer | number[] }>
  ) => Promise<{ success: boolean; path?: string; error?: string }>
  saveBgmConfigJson?: (
    config: Record<string, unknown>
  ) => Promise<{ success: boolean; error?: string }>
  loadBgmConfigJson?: (
  ) => Promise<{ success: boolean; config?: Record<string, unknown>; error?: string }>
  deleteBgmFile?: (
    fileName: string
  ) => Promise<{ success: boolean; error?: string }>
  pruneBgmFiles?: (
    keep: string[]
  ) => Promise<{ success: boolean; error?: string }>
  openBgmFolder?: (
    fileName?: string
  ) => Promise<{ success: boolean; error?: string }>
  saveStationGradeConfigJson?: (
    config: Record<string, unknown>
  ) => Promise<{ success: boolean; config?: any; error?: string }>
  loadStationGradeConfigJson?: (
  ) => Promise<{ success: boolean; config?: Record<string, unknown>; error?: string }>
  deleteEventFile?: (
    eventId: string,
    kind: 'image' | 'video' | 'sound',
    fileName: string
  ) => Promise<{ success: boolean; error?: string }>
  deleteEventFolder?: (
    eventId: string
  ) => Promise<{ success: boolean; error?: string }>
  openEventFolder?: (
    eventId?: string
  ) => Promise<{ success: boolean; error?: string }>
  deleteCharacterFile?: (
    characterId: string,
    kind: 'image' | 'video' | 'sound',
    fileName: string
  ) => Promise<{ success: boolean; error?: string }>
  pruneCharacterFiles?: (
    characterId: string,
    keep: { image: string[]; video: string[]; sound?: string[] }
  ) => Promise<{ success: boolean; error?: string }>
  deleteCharacterFolder?: (
    characterId: string
  ) => Promise<{ success: boolean; error?: string }>
  cloneCharacterFile?: (
    characterId: string,
    kind: 'image' | 'video' | 'sound',
    sourceFileName: string,
    targetFileName: string
  ) => Promise<{ success: boolean; error?: string }>
  saveStaffAssets?: (
    staffId: string,
    assets: Array<{ id: string; fileName: string; kind: string; buffer: ArrayBuffer }>
  ) => Promise<{ success: boolean; path?: string; error?: string }>
  saveStaffJson?: (
    staff: any[]
  ) => Promise<{ success: boolean; error?: string }>
  loadStaffJson?: (
  ) => Promise<{ success: boolean; staff?: any[]; error?: string }>
  deleteStaffFile?: (
    staffId: string,
    fileName: string
  ) => Promise<{ success: boolean; error?: string }>
  deleteStaffFolder?: (
    staffId: string
  ) => Promise<{ success: boolean; error?: string }>
  getDeviceLockStatus?: () => Promise<{ ok: boolean; reason?: string }>
  trackAchievementUnlock?: (payload: { id: string; name: string }) => Promise<{ success: boolean }>
  quitApp?: () => Promise<void>
  onWindowLifecycle?: (cb: (state: 'suspended' | 'resumed') => void) => void
}

interface DeviceLangHints {
  systemLocale: string
  preferredLanguages: string[]
}

interface Window {
  electronAPI?: ElectronAPI
  deviceLangHints?: DeviceLangHints
}
