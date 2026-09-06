import { resolveMediaSrc } from '../../game/mediaUrl'

export async function saveHighLowMediaFile(
  file: File,
  stagePrefix: string = 'dealer'
): Promise<{ url: string; type: 'image' | 'video' }> {
  const isVideo = file.type.startsWith('video/')
  const originalName = file.name || 'asset'
  const ext = originalName.slice(originalName.lastIndexOf('.')) || (isVideo ? '.mp4' : '.png')
  const timestamp = Date.now()
  const safeBaseName = originalName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 15)

  const fileName = `${stagePrefix}_${timestamp}_${safeBaseName}${ext}`

  if (typeof window !== 'undefined' && (window as any).electronAPI?.saveHighLowAssets) {
    try {
      const buffer = await file.arrayBuffer()
      await (window as any).electronAPI.saveHighLowAssets([
        { fileName, buffer },
      ])
      const mediaUrl = `media://chapter_assets/highlow/${fileName}`
      return { url: mediaUrl, type: isVideo ? 'video' : 'image' }
    } catch (err) {
      console.error('[HighLowAsset] Electron save error:', err)
    }
  }

  // Web Browser fallback
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })

  return { url: dataUrl, type: isVideo ? 'video' : 'image' }
}

export function resolveHighLowMediaUrl(url?: string | null): string {
  return resolveMediaSrc(url)
}
