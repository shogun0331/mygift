/// <reference types="vite/client" />

interface ElectronAPI {
  platform: string
  saveEventAssets?: (
    chapterId: number,
    assets: Array<{ fileName: string; kind: string; buffer: ArrayBuffer }>
  ) => Promise<{ success: boolean; path?: string; error?: string }>
}

interface Window {
  electronAPI?: ElectronAPI
}
