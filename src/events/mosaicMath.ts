export type MosaicNormRect = {
  x: number
  y: number
  w: number
  h: number
}

export type MosaicFit = 'cover' | 'fill' | 'contain'

export type MosaicCrop = { x: number; y: number; w: number; h: number }

/** DLsite: 셀 최소 4px, 긴 변 400px 이상이면 긴 변 × 1/100 */
export const MOSAIC_MIN_BLOCK_PX = 4
export const MOSAIC_LONG_SIDE_THRESHOLD = 400
export const MOSAIC_LONG_SIDE_DIVISOR = 100
/** 정규화 좌표: 짧은 변의 12% */
export const MOSAIC_INFLATE_SHORT_RATIO = 0.12
/** 정규화 좌표: 이미지 한 변의 1.5% 상한 */
export const MOSAIC_INFLATE_IMAGE_CAP = 0.015
/** 검수 ZIP·VN 스테이지와 맞출 때 쓰는 표시 비율 */
export const MOSAIC_COVER_ASPECT = { w: 16, h: 9 }

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

/** 파일/프레임 원본 해상도의 긴 변으로 DLsite 셀 크기를 계산한다. */
export function dlsiteBlockPx(mediaW: number, mediaH: number): number {
  const longSide = Math.max(mediaW, mediaH)
  if (!(longSide > 0)) return MOSAIC_MIN_BLOCK_PX
  if (longSide < MOSAIC_LONG_SIDE_THRESHOLD) return MOSAIC_MIN_BLOCK_PX
  return Math.max(MOSAIC_MIN_BLOCK_PX, Math.round(longSide / MOSAIC_LONG_SIDE_DIVISOR))
}

export function adaptiveBlockPx(mediaW: number, mediaH: number): number {
  return dlsiteBlockPx(mediaW, mediaH)
}

/** 플레이·굽기는 항상 이미지 긴 변 기준. stored 고정 px는 쓰지 않는다. */
export function resolveMosaicBlockPx(_stored: number, mediaW: number, mediaH: number): number {
  return dlsiteBlockPx(mediaW, mediaH)
}

export function inflateMosaicRegion<T extends MosaicNormRect>(region: T): T {
  const pad = Math.min(
    Math.min(region.w, region.h) * MOSAIC_INFLATE_SHORT_RATIO,
    MOSAIC_INFLATE_IMAGE_CAP,
  )
  const x = clamp(region.x - pad, 0, 1)
  const y = clamp(region.y - pad, 0, 1)
  const right = clamp(region.x + region.w + pad, 0, 1)
  const bottom = clamp(region.y + region.h + pad, 0, 1)
  return {
    ...region,
    x,
    y,
    w: Math.max(0, right - x),
    h: Math.max(0, bottom - y),
  }
}

export function inflateMosaicRegions<T extends MosaicNormRect>(regions: T[]): T[] {
  return regions.map((region) => inflateMosaicRegion(region))
}

export function computeMediaCrop(
  nw: number,
  nh: number,
  dw: number,
  dh: number,
  fit: MosaicFit,
): MosaicCrop | null {
  if (!nw || !nh || !dw || !dh) return null
  if (fit === 'fill') return { x: 0, y: 0, w: nw, h: nh }

  const mediaAR = nw / nh
  const dispAR = dw / dh

  if (fit === 'cover') {
    if (mediaAR > dispAR) {
      const sh = nh
      const sw = nh * dispAR
      return { x: (nw - sw) / 2, y: 0, w: sw, h: sh }
    }
    const sw = nw
    const sh = nw / dispAR
    return { x: 0, y: (nh - sh) / 2, w: sw, h: sh }
  }

  return { x: 0, y: 0, w: nw, h: nh }
}

export function mosaicCellCount(sourceW: number, sourceH: number, blockPx: number): { w: number; h: number } {
  const block = Math.max(1, blockPx)
  return {
    w: Math.max(1, Math.round(sourceW / block)),
    h: Math.max(1, Math.round(sourceH / block)),
  }
}

export function mediaContentBox(
  elW: number,
  elH: number,
  natW: number,
  natH: number,
  fit: MosaicFit,
): MosaicCrop {
  if (elW <= 0 || elH <= 0) return { x: 0, y: 0, w: 0, h: 0 }
  if (fit === 'fill' || natW <= 0 || natH <= 0) {
    return { x: 0, y: 0, w: elW, h: elH }
  }
  const scale = fit === 'contain' ? Math.min(elW / natW, elH / natH) : Math.max(elW / natW, elH / natH)
  const w = natW * scale
  const h = natH * scale
  return { x: (elW - w) / 2, y: (elH - h) / 2, w, h }
}

/** cover: VN 에디터 16:9 크롭 기준. media/fill/contain: 원본 전체 기준. */
export function regionToSourcePixels(
  region: MosaicNormRect,
  mediaW: number,
  mediaH: number,
  space: 'media' | 'cover',
): MosaicCrop {
  const crop =
    space === 'cover'
      ? computeMediaCrop(mediaW, mediaH, MOSAIC_COVER_ASPECT.w, MOSAIC_COVER_ASPECT.h, 'cover')
      : { x: 0, y: 0, w: mediaW, h: mediaH }
  if (!crop) return { x: 0, y: 0, w: 0, h: 0 }
  return {
    x: crop.x + region.x * crop.w,
    y: crop.y + region.y * crop.h,
    w: region.w * crop.w,
    h: region.h * crop.h,
  }
}

export function expandSourceRect(rect: MosaicCrop, padPx: number, mediaW: number, mediaH: number): MosaicCrop {
  const pad = Math.max(0, padPx)
  const x = Math.max(0, rect.x - pad)
  const y = Math.max(0, rect.y - pad)
  const right = Math.min(mediaW, rect.x + rect.w + pad)
  const bottom = Math.min(mediaH, rect.y + rect.h + pad)
  return { x, y, w: Math.max(0, right - x), h: Math.max(0, bottom - y) }
}

export function sourceRectToDisplay(
  src: MosaicCrop,
  mediaW: number,
  mediaH: number,
  content: MosaicCrop,
): MosaicCrop {
  if (mediaW <= 0 || mediaH <= 0) return { x: 0, y: 0, w: 0, h: 0 }
  return {
    x: content.x + (src.x / mediaW) * content.w,
    y: content.y + (src.y / mediaH) * content.h,
    w: (src.w / mediaW) * content.w,
    h: (src.h / mediaH) * content.h,
  }
}
