import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { CommonEventLinks } from '../events/commonEventLinks'
import type { GameEvent } from '../events/types'
import type { RegisteredCharacter } from '../game/characters'
import type { StationGradeConfig } from '../game/stationGradeConfig'
import { getPlaybackMosaicBlockPx, useMosaicBlockPx } from '../game/visualFx'
import {
  buildReviewMosaicZip,
  collectReviewMosaicItems,
  downloadBlob,
  reviewZipFileName,
  type ReviewExportProgress,
} from './reviewMosaicExport'

type Props = {
  events: GameEvent[]
  characters: RegisteredCharacter[]
  commonEventLinks: CommonEventLinks
  stationGradeConfig: StationGradeConfig
}

export function ReviewMosaicExportButton({
  events,
  characters,
  commonEventLinks,
  stationGradeConfig,
}: Props) {
  const block = useMosaicBlockPx()
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<ReviewExportProgress | null>(null)

  async function handleExport() {
    if (busy) return
    setBusy(true)
    setProgress({ current: 0, total: 1, label: '미디어 목록 수집 중…' })
    try {
      const blockPx = getPlaybackMosaicBlockPx()
      const items = await collectReviewMosaicItems({
        events,
        characters,
        commonEventLinks,
        stationGradeConfig,
      })
      if (items.length === 0) {
        window.alert('내보낼 이미지/영상이 없습니다.')
        return
      }
      const result = await buildReviewMosaicZip(items, blockPx, setProgress)
      downloadBlob(result.blob, reviewZipFileName(blockPx))
      if (result.failures.length > 0) {
        const preview = result.failures.slice(0, 12).join('\n')
        const extra = result.failures.length > 12 ? `\n… 외 ${result.failures.length - 12}건` : ''
        window.alert(
          `ZIP을 저장했습니다 (${result.fileCount}개 파일).\n실패한 항목 ${result.failures.length}건:\n${preview}${extra}`,
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      window.alert(`심사용 ZIP 내보내기에 실패했습니다.\n${message}`)
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <>
      <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 px-3 py-3">
        <p className="text-[10px] font-bold tracking-wide text-amber-200/80">심사용 ZIP</p>
        <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
          플레이·ZIP은 같은 칸(긴 변÷50, DLsite 최소보다 큼), 윤곽 여백
          {block === 0 ? ' (에디터 없음은 무시)' : ''}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleExport()}
          className="mt-2 w-full rounded-lg border border-amber-400/40 bg-amber-500/15 px-2 py-1.5 text-[11px] font-semibold text-amber-100 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? '내보내는 중…' : '모자이크 적용 ZIP'}
        </button>
      </div>
      {busy && progress
        ? createPortal(
            <div className="fixed inset-0 z-[200000] flex items-center justify-center bg-black/70 p-4">
              <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-950 px-5 py-4 text-slate-100 shadow-2xl">
                <p className="text-sm font-semibold">심사용 ZIP 생성 중</p>
                <p className="mt-2 text-xs text-slate-400">
                  {progress.current} / {Math.max(progress.total, 1)}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-amber-400 transition-[width]"
                    style={{
                      width: `${Math.min(100, (progress.current / Math.max(progress.total, 1)) * 100)}%`,
                    }}
                  />
                </div>
                <p className="mt-3 truncate text-[11px] text-slate-300" title={progress.label}>
                  {progress.label}
                </p>
                <p className="mt-2 text-[10px] text-slate-500">
                  모자이크가 있는 영상은 무음 WebM으로 다시 인코딩됩니다. 시간이 걸릴 수 있습니다.
                </p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
