import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { BlurRegion, EventMediaAsset } from './types'

export const BLUR_MIN = 0
export const BLUR_MAX = 40
export const BLUR_DEFAULT = 4

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

/** 0은 블러 없음. `||` 로 0을 기본값으로 바꾸지 않는다. */
export function clampBlur(n: number) {
  const v = Number(n)
  if (!Number.isFinite(v)) return BLUR_DEFAULT
  return clamp(Math.round(v * 2) / 2, BLUR_MIN, BLUR_MAX)
}

function blurFilterCss(px: number) {
  const v = clampBlur(px)
  if (v <= 0) return 'none'
  return `blur(${v}px)`
}

function blurTint(px: number) {
  const v = clampBlur(px)
  if (v <= 0) return 'transparent'
  return `rgba(0,0,0,${Math.min(0.1, (v / BLUR_MAX) * 0.1)})`
}

function makeRegionId() {
  return `blur_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

export function readBlurRegions(node: any): BlurRegion[] {
  if (!node || !Array.isArray(node.blurRegions)) return []
  return node.blurRegions
    .filter((r: any) => r && typeof r === 'object')
    .map((r: any) => ({
      id: String(r.id || makeRegionId()),
      x: clamp(Number(r.x) || 0, 0, 1),
      y: clamp(Number(r.y) || 0, 0, 1),
      w: clamp(Number(r.w) || 0, 0, 1),
      h: clamp(Number(r.h) || 0, 0, 1),
      blur: clampBlur(r.blur),
    }))
    .filter((r: BlurRegion) => r.w >= 0.01 && r.h >= 0.01)
}

function normRect(x0: number, y0: number, x1: number, y1: number): Pick<BlurRegion, 'x' | 'y' | 'w' | 'h'> {
  const left = clamp(Math.min(x0, x1), 0, 1)
  const top = clamp(Math.min(y0, y1), 0, 1)
  const right = clamp(Math.max(x0, x1), 0, 1)
  const bottom = clamp(Math.max(y0, y1), 0, 1)
  return {
    x: left,
    y: top,
    w: Math.max(0.03, right - left),
    h: Math.max(0.03, bottom - top),
  }
}

export function BlurRegionOverlay({
  regions,
  selectedId,
  showHandles,
  draft,
}: {
  regions: BlurRegion[]
  selectedId?: string | null
  showHandles?: boolean
  draft?: { x: number; y: number; w: number; h: number } | null
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      {regions.map((region) => (
        <div
          key={region.id}
          className="absolute"
          style={{
            left: `${region.x * 100}%`,
            top: `${region.y * 100}%`,
            width: `${region.w * 100}%`,
            height: `${region.h * 100}%`,
            backdropFilter: blurFilterCss(region.blur),
            WebkitBackdropFilter: blurFilterCss(region.blur),
            background: blurTint(region.blur),
            outline:
              selectedId === region.id
                ? '2px solid rgba(165, 180, 252, 0.95)'
                : showHandles
                  ? '1px solid rgba(255,255,255,0.25)'
                  : 'none',
          }}
        />
      ))}
      {draft ? (
        <div
          className="absolute border border-dashed border-indigo-300 bg-indigo-400/10"
          style={{
            left: `${draft.x * 100}%`,
            top: `${draft.y * 100}%`,
            width: `${draft.w * 100}%`,
            height: `${draft.h * 100}%`,
          }}
        />
      ) : null}
      {showHandles && selectedId
        ? regions
            .filter((r) => r.id === selectedId)
            .map((region) => (
              <div key={`h-${region.id}`} className="contents">
                {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
                  <div
                    key={corner}
                    data-handle={corner}
                    className="pointer-events-auto absolute z-[6] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-white bg-indigo-400"
                    style={{
                      left: `${(region.x + (corner.includes('e') ? region.w : 0)) * 100}%`,
                      top: `${(region.y + (corner.includes('s') ? region.h : 0)) * 100}%`,
                      cursor:
                        corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize',
                    }}
                  />
                ))}
              </div>
            ))
        : null}
    </div>
  )
}

type DragMode =
  | { kind: 'draw'; x0: number; y0: number }
  | { kind: 'move'; id: string; ox: number; oy: number; startX: number; startY: number }
  | { kind: 'resize'; id: string; corner: 'nw' | 'ne' | 'sw' | 'se'; orig: BlurRegion }

type BlurMediaAsset = Pick<EventMediaAsset, 'kind' | 'url'>

type BlurRegionEditorProps = {
  asset: BlurMediaAsset | null
  regions: BlurRegion[]
  blurDefault: number
  onChange: (next: { blurRegions: BlurRegion[]; blurDefault: number }) => void
  onClose: () => void
  /** cover: 이벤트 그래픽(16:9 크롭). fit: SNS처럼 원본 비율 유지 */
  layout?: 'cover' | 'fit'
}

export function BlurRegionEditor({
  asset,
  regions,
  blurDefault,
  onChange,
  onClose,
  layout = 'cover',
}: BlurRegionEditorProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<'draw' | 'select'>('draw')
  const [selectedId, setSelectedId] = useState<string | null>(regions[0]?.id ?? null)
  const [drag, setDrag] = useState<DragMode | null>(null)
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const defaultBlur = clampBlur(blurDefault)

  const selected = regions.find((r) => r.id === selectedId) ?? null

  const toNorm = (clientX: number, clientY: number) => {
    const el = stageRef.current
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    return {
      x: clamp((clientX - rect.left) / rect.width, 0, 1),
      y: clamp((clientY - rect.top) / rect.height, 0, 1),
    }
  }

  const updateRegions = (next: BlurRegion[]) => {
    onChange({ blurRegions: next, blurDefault: defaultBlur })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const target = e.target as HTMLElement | null
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
        e.preventDefault()
        const next = regions.filter((r) => r.id !== selectedId)
        updateRegions(next)
        setSelectedId(next[0]?.id ?? null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, regions, selectedId])

  const onPointerDown = (e: React.PointerEvent) => {
    if (!asset) return
    const handle = (e.target as HTMLElement).closest('[data-handle]') as HTMLElement | null
    const p = toNorm(e.clientX, e.clientY)

    if (mode === 'select' && handle && selected) {
      e.preventDefault()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      setDrag({
        kind: 'resize',
        id: selected.id,
        corner: handle.dataset.handle as 'nw' | 'ne' | 'sw' | 'se',
        orig: { ...selected },
      })
      return
    }

    if (mode === 'select') {
      const hit = [...regions].reverse().find(
        (r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h,
      )
      if (hit) {
        e.preventDefault()
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        setSelectedId(hit.id)
        setDrag({ kind: 'move', id: hit.id, ox: p.x - hit.x, oy: p.y - hit.y, startX: hit.x, startY: hit.y })
        return
      }
      setSelectedId(null)
      return
    }

    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setDrag({ kind: 'draw', x0: p.x, y0: p.y })
    setDraft({ x: p.x, y: p.y, w: 0, h: 0 })
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return
    const p = toNorm(e.clientX, e.clientY)

    if (drag.kind === 'draw') {
      setDraft(normRect(drag.x0, drag.y0, p.x, p.y))
      return
    }

    if (drag.kind === 'move') {
      updateRegions(
        regions.map((r) => {
          if (r.id !== drag.id) return r
          return {
            ...r,
            x: clamp(p.x - drag.ox, 0, 1 - r.w),
            y: clamp(p.y - drag.oy, 0, 1 - r.h),
          }
        }),
      )
      return
    }

    const o = drag.orig
    let x0 = o.x
    let y0 = o.y
    let x1 = o.x + o.w
    let y1 = o.y + o.h
    if (drag.corner.includes('w')) x0 = p.x
    if (drag.corner.includes('e')) x1 = p.x
    if (drag.corner.includes('n')) y0 = p.y
    if (drag.corner.includes('s')) y1 = p.y
    const next = normRect(x0, y0, x1, y1)
    updateRegions(regions.map((r) => (r.id === drag.id ? { ...r, ...next } : r)))
  }

  const onPointerUp = () => {
    if (drag?.kind === 'draw' && draft && draft.w >= 0.03 && draft.h >= 0.03) {
      const created: BlurRegion = {
        id: makeRegionId(),
        ...draft,
        blur: defaultBlur,
      }
      updateRegions([...regions, created])
      setSelectedId(created.id)
      setMode('select')
    }
    setDraft(null)
    setDrag(null)
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-indigo-500/25 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold tracking-wide text-indigo-300">BLUR REGION</p>
            <h3 className="mt-1 text-base font-semibold text-slate-100">블러 영역 편집</h3>
            <p className="mt-1 text-xs text-slate-500">
              원본 파일은 수정하지 않습니다. 네모를 그려 가릴 위치를 정합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
          >
            닫기
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('draw')}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                mode === 'draw'
                  ? 'border-indigo-400/40 bg-indigo-500/20 text-indigo-200'
                  : 'border-white/10 text-slate-400'
              }`}
            >
              그리기
            </button>
            <button
              type="button"
              onClick={() => setMode('select')}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                mode === 'select'
                  ? 'border-indigo-400/40 bg-indigo-500/20 text-indigo-200'
                  : 'border-white/10 text-slate-400'
              }`}
            >
              선택 / 수정
            </button>
            <span className="text-[11px] text-slate-500">
              {mode === 'draw' ? '드래그해서 네모를 그립니다.' : '네모를 옮기거나 모서리를 잡아 크기를 바꿉니다.'}
            </span>
          </div>

          <div className={layout === 'fit' ? 'flex justify-center' : undefined}>
            <div
              ref={stageRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className={`${
                layout === 'fit'
                  ? 'relative inline-block max-h-[70vh] max-w-full overflow-hidden rounded-xl border border-white/10 bg-black'
                  : 'relative mx-auto aspect-video w-full max-w-3xl overflow-hidden rounded-xl border border-white/10 bg-black'
              } ${!asset ? 'cursor-not-allowed' : mode === 'draw' ? 'cursor-crosshair' : 'cursor-default'}`}
            >
              {asset ? (
                asset.kind === 'video' ? (
                  <video
                    src={asset.url}
                    muted
                    loop
                    playsInline
                    autoPlay
                    className={layout === 'fit' ? 'block max-h-[70vh] max-w-full' : 'h-full w-full object-cover'}
                  />
                ) : (
                  <img
                    src={asset.url}
                    alt=""
                    className={layout === 'fit' ? 'block max-h-[70vh] max-w-full' : 'h-full w-full object-cover'}
                  />
                )
              ) : (
                <div className="flex h-48 w-full items-center justify-center text-sm text-slate-500">
                  미디어를 먼저 연결하세요
                </div>
              )}
              <BlurRegionOverlay
                regions={regions}
                selectedId={selectedId}
                showHandles={mode === 'select'}
                draft={draft}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-slate-400">새 네모 기본 강도</p>
              <input
                type="range"
                min={BLUR_MIN}
                max={BLUR_MAX}
                step={0.5}
                value={defaultBlur}
                onChange={(e) => onChange({ blurRegions: regions, blurDefault: clampBlur(Number(e.target.value)) })}
                className="w-full accent-indigo-400"
              />
              <div className="flex gap-1.5">
                {[
                  { label: '없음', value: 0 },
                  { label: '약함', value: 2 },
                  { label: '보통', value: 5 },
                  { label: '강함', value: 12 },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => onChange({ blurRegions: regions, blurDefault: preset.value })}
                    className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200"
                  >
                    {preset.label}
                  </button>
                ))}
                <span className="ml-auto text-[11px] text-slate-400">{defaultBlur}px</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-slate-400">선택한 영역 강도</p>
              {selected ? (
                <>
                  <input
                    type="range"
                    min={BLUR_MIN}
                    max={BLUR_MAX}
                    step={0.5}
                    value={clampBlur(selected.blur)}
                    onChange={(e) => {
                      const blur = clampBlur(Number(e.target.value))
                      updateRegions(regions.map((r) => (r.id === selected.id ? { ...r, blur } : r)))
                    }}
                    className="w-full accent-indigo-400"
                  />
                  <div className="flex items-center gap-1.5">
                    {[
                      { label: '없음', value: 0 },
                      { label: '약함', value: 2 },
                      { label: '보통', value: 5 },
                      { label: '강함', value: 12 },
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() =>
                          updateRegions(regions.map((r) => (r.id === selected.id ? { ...r, blur: preset.value } : r)))
                        }
                        className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200"
                      >
                        {preset.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const next = regions.filter((r) => r.id !== selected.id)
                        updateRegions(next)
                        setSelectedId(next[0]?.id ?? null)
                      }}
                      className="ml-auto rounded-lg border border-rose-500/20 px-2 py-1 text-[10px] text-rose-300 hover:bg-rose-500/10"
                    >
                      영역 삭제
                    </button>
                    <span className="text-[11px] text-slate-400">{clampBlur(selected.blur)}px</span>
                  </div>
                </>
              ) : (
                <p className="text-[11px] text-slate-500">선택 모드에서 네모를 고르면 강도를 바꿀 수 있습니다.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
