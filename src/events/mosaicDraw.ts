import type { MosaicCrop } from './mosaicMath'

export function fillMosaicCells(
  dest: CanvasRenderingContext2D,
  media: CanvasImageSource,
  srcRect: MosaicCrop,
  cellsW: number,
  cellsH: number,
) {
  dest.fillStyle = '#111111'
  dest.fillRect(0, 0, cellsW, cellsH)
  if (cellsW < 1 || cellsH < 1 || srcRect.w < 1 || srcRect.h < 1) return

  dest.imageSmoothingEnabled = false
  dest.drawImage(media, srcRect.x, srcRect.y, srcRect.w, srcRect.h, 0, 0, cellsW, cellsH)
}
