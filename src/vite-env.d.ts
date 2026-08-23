/// <reference types="vite/client" />

declare module '*.txt?raw' {
  const content: string
  export default content
}

interface ElectronAPI {
  platform: string
  saveEventAssets?: (
    eventId: string,
    assets: Array<{ fileName: string; kind: string; buffer: ArrayBuffer }>
  ) => Promise<{ success: boolean; path?: string; error?: string }>
  saveCharacterAssets?: (
    characterId: string,
    assets: Array<{ id: string; fileName: string; kind: string; buffer: ArrayBuffer }>
  ) => Promise<{ success: boolean; path?: string; error?: string }>
  saveCharactersJson?: (
    characters: any[]
  ) => Promise<{ success: boolean; error?: string }>
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
  deleteEventFile?: (
    eventId: string,
    kind: 'image' | 'video' | 'sound',
    fileName: string
  ) => Promise<{ success: boolean; error?: string }>
  deleteEventFolder?: (
    eventId: string
  ) => Promise<{ success: boolean; error?: string }>
  deleteCharacterFile?: (
    characterId: string,
    kind: 'image' | 'video',
    fileName: string
  ) => Promise<{ success: boolean; error?: string }>
  pruneCharacterFiles?: (
    characterId: string,
    keep: { image: string[]; video: string[] }
  ) => Promise<{ success: boolean; error?: string }>
  deleteCharacterFolder?: (
    characterId: string
  ) => Promise<{ success: boolean; error?: string }>
  cloneCharacterFile?: (
    characterId: string,
    kind: 'image' | 'video',
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
}

interface Window {
  electronAPI?: ElectronAPI
}
