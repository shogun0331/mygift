import { IS_MOSAIC_DISABLED } from '../game/mosaicBuild'
import { readBlurRegions } from './BlurRegionEditor'
import {
  dlsiteBlockPx,
  expandSourceRect,
  inflateMosaicRegions,
  mosaicCellCount,
  regionToSourcePixels,
  type MosaicFit,
} from './mosaicMath'
import { fillMosaicCells } from './mosaicDraw'
import type { BlurRegion } from './types'
import { resolveMediaSrc } from '../game/mediaUrl'

export function isVideoFileName(value: string): boolean {
  return /\.(mp4|webm|ogv|ogg|mov|m4v)(\?|$)/i.test(String(value || ''))
}

export function extFromName(value: string, fallback: string): string {
  const clean = String(value || '').split('?')[0]
  const match = clean.match(/(\.[a-z0-9]+)$/i)
  return match ? match[1].toLowerCase() : fallback
}

export function applyMosaicToContext(
  ctx: CanvasRenderingContext2D,
  media: CanvasImageSource,
  mediaW: number,
  mediaH: number,
  regions: BlurRegion[],
  _blockPx: number,
  options?: { fit?: MosaicFit },
) {
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(media, 0, 0, mediaW, mediaH)
  if (IS_MOSAIC_DISABLED || regions.length === 0 || mediaW <= 0 || mediaH <= 0) return

  const fit: MosaicFit = options?.fit ?? 'fill'
  const space = fit === 'cover' ? 'cover' : 'media'
  const tmp = document.createElement('canvas')
  const tctx = tmp.getContext('2d', { alpha: false })
  if (!tctx) return

  const block = dlsiteBlockPx(mediaW, mediaH)
  for (const region of inflateMosaicRegions(regions)) {
    const srcRect = expandSourceRect(
      regionToSourcePixels(region, mediaW, mediaH, space),
      block,
      mediaW,
      mediaH,
    )
    if (srcRect.w < 1 || srcRect.h < 1) continue
    const cells = mosaicCellCount(srcRect.w, srcRect.h, block)
    tmp.width = cells.w
    tmp.height = cells.h
    fillMosaicCells(tctx, media, srcRect, cells.w, cells.h)
    ctx.globalCompositeOperation = 'source-over'
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(tmp, 0, 0, cells.w, cells.h, srcRect.x, srcRect.y, srcRect.w, srcRect.h)
  }
}

export async function fetchMediaBlob(url: string): Promise<Blob> {
  const src = resolveMediaSrc(url)
  const res = await fetch(src)
  if (!res.ok) throw new Error(`미디어를 읽지 못했습니다 (${res.status})`)
  return res.blob()
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다'))
    img.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('캔버스를 파일로 만들지 못했습니다'))
      },
      type,
      quality,
    )
  })
}

function waitEvent(target: EventTarget, event: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      target.removeEventListener(event, onEvent)
      reject(new Error(`${event} 대기 시간 초과`))
    }, timeoutMs)
    const onEvent = () => {
      window.clearTimeout(timer)
      target.removeEventListener(event, onEvent)
      resolve()
    }
    target.addEventListener(event, onEvent)
  })
}

function pickWebmMime(): string {
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return ''
  }
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

export type BakedMedia = {
  blob: Blob
  fileName: string
  baked: boolean
}

function shouldBake(regions: BlurRegion[]) {
  if (IS_MOSAIC_DISABLED) return false
  return readBlurRegions({ blurRegions: regions }).length > 0
}

function sanitizeFileToken(value: string, fallback = 'media'): string {
  const cleaned = Array.from(String(value || ''))
    .map((ch) => {
      const code = ch.charCodeAt(0)
      if (code < 32 || '<>:"/\\|?*'.includes(ch)) return '_'
      return ch
    })
    .join('')
    .replace(/\s+/g, '_')
    .slice(0, 120)
  return cleaned || fallback
}

function stemAndHint(nameHint: string, fallbackExt: string) {
  const safe = sanitizeFileToken(nameHint)
  const ext = extFromName(safe, fallbackExt)
  const stem = ext && safe.toLowerCase().endsWith(ext) ? safe.slice(0, -ext.length) : safe
  return { stem: stem || 'media', ext }
}

export async function bakeReviewMedia(options: {
  url: string
  kind: 'image' | 'video'
  regions: BlurRegion[]
  blockPx: number
  nameHint: string
  fit?: MosaicFit
}): Promise<BakedMedia> {
  const regions = readBlurRegions({ blurRegions: options.regions })
  const bake = shouldBake(regions)
  const fit = options.fit ?? 'fill'
  if (!bake) {
    const blob = await fetchMediaBlob(options.url)
    const { stem, ext } = stemAndHint(
      options.nameHint,
      options.kind === 'video' ? extFromName(options.url, '.mp4') : extFromName(options.url, '.png'),
    )
    return { blob, fileName: `${stem}${ext}`, baked: false }
  }

  if (options.kind === 'video') {
    const blob = await bakeMosaicedVideo(options.url, regions, options.blockPx, fit)
    const { stem } = stemAndHint(options.nameHint, '.webm')
    return { blob, fileName: `${stem}.webm`, baked: true }
  }

  const src = resolveMediaSrc(options.url)
  const img = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  if (canvas.width <= 0 || canvas.height <= 0) throw new Error('이미지 해상도가 없습니다')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('캔버스를 만들 수 없습니다')
  applyMosaicToContext(ctx, img, canvas.width, canvas.height, regions, options.blockPx, { fit })
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92)
  const { stem } = stemAndHint(options.nameHint, '.jpg')
  return { blob, fileName: `${stem}.jpg`, baked: true }
}

async function bakeMosaicedVideo(
  url: string,
  regions: BlurRegion[],
  blockPx: number,
  fit: MosaicFit,
): Promise<Blob> {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('이 환경에서는 영상 모자이크 인코딩을 지원하지 않습니다')
  }
  const src = resolveMediaSrc(url)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.crossOrigin = 'anonymous'
  video.src = src
  if (video.readyState < 2) {
    await waitEvent(video, 'loadeddata', 30_000)
  }
  const w = video.videoWidth
  const h = video.videoHeight
  if (!w || !h) throw new Error('영상 해상도가 없습니다')

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('캔버스를 만들 수 없습니다')

  const fps = 30
  const stream = canvas.captureStream(fps)
  const mime = pickWebmMime()
  const recorder = mime
    ? new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 })
    : new MediaRecorder(stream)
  const chunks: Blob[] = []
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data)
  }

  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error('영상 녹화가 실패했습니다'))
    recorder.onstop = () => {
      const type = recorder.mimeType || 'video/webm'
      resolve(new Blob(chunks, { type }))
    }
  })

  const paint = () => applyMosaicToContext(ctx, video, w, h, regions, blockPx, { fit })
  paint()
  recorder.start(250)
  video.currentTime = 0
  await video.play()

  let raf = 0
  const loop = () => {
    paint()
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  const durationMs = Number.isFinite(video.duration) && video.duration > 0 ? video.duration * 1000 : 8_000
  try {
    await Promise.race([
      waitEvent(video, 'ended', durationMs + 8_000),
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, durationMs + 1_500)
      }),
    ])
  } finally {
    cancelAnimationFrame(raf)
    paint()
    video.pause()
    if (recorder.state !== 'inactive') recorder.stop()
    stream.getTracks().forEach((track) => track.stop())
    video.removeAttribute('src')
    video.load()
  }

  const blob = await stopped
  if (blob.size <= 0) throw new Error('모자이크 영상이 비어 있습니다')
  return blob
}
