/// <reference types="vite/client" />

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
  deleteCharacterFile?: (
    characterId: string,
    kind: 'image' | 'video',
    fileName: string
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
}

interface Window {
  electronAPI?: ElectronAPI
}
