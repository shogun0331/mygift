import { useEffect, useState } from 'react'
import { EventSimulator } from './EventSimulator'
import {
  COMMON_EVENT_SLOTS,
  type CommonEventLinks,
  type CommonEventSlotKey,
} from './commonEventLinks'
import { isCommonEvent, type GameEvent } from './types'
import type { RegisteredCharacter } from '../game/characters'

type CommonEventPanelProps = {
  events: GameEvent[]
  links: CommonEventLinks
  onLinksChange: (links: CommonEventLinks) => void
  registeredCharacters: RegisteredCharacter[]
}

const fieldClassName =
  'mt-1.5 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400/50'

export function CommonEventPanel({
  events,
  links,
  onLinksChange,
  registeredCharacters,
}: CommonEventPanelProps) {
  const [simulatorEvent, setSimulatorEvent] = useState<GameEvent | null>(null)
  const [simulatorMode, setSimulatorMode] = useState<'debug' | 'game'>('debug')

  const commonEvents = events.filter(isCommonEvent)
  const commonEventIdsKey = commonEvents
    .map((event) => event.id)
    .sort()
    .join(',')

  useEffect(() => {
    const validIds = new Set(commonEventIdsKey ? commonEventIdsKey.split(',') : [])
    let changed = false
    const next = { ...links }
    for (const slot of COMMON_EVENT_SLOTS) {
      const id = next[slot.key]
      if (id && !validIds.has(id)) {
        next[slot.key] = null
        changed = true
      }
    }
    if (changed) onLinksChange(next)
  }, [commonEventIdsKey])

  function setLink(key: CommonEventSlotKey, eventId: string | null) {
    onLinksChange({ ...links, [key]: eventId })
  }

  function openSimulator(event: GameEvent, mode: 'debug' | 'game') {
    setSimulatorEvent(event)
    setSimulatorMode(mode)
  }

  return (
    <div className="game-panel rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="game-kicker">COMMON EVENT</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-100">공통이벤트</h2>
          <p className="mt-2 text-sm text-slate-400">
            기업 승급심사에 이벤트 관리의 공용 이벤트를 연결합니다. 캐릭터 전용 이벤트는 목록에
            나오지 않습니다.
          </p>
        </div>
      </div>

      {commonEvents.length === 0 ? (
        <p className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
          공용 이벤트가 없습니다. 왼쪽 메뉴의 <span className="font-semibold">이벤트 관리</span>에서
          소유 캐릭터 없이 이벤트를 등록하세요.
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {COMMON_EVENT_SLOTS.map((slot) => {
          const linkedId = links[slot.key]
          const linked = linkedId ? commonEvents.find((event) => event.id === linkedId) : null
          return (
            <label key={slot.key} className="block rounded-2xl border border-white/8 bg-black/20 p-4">
              <span className="game-stat-label">{slot.label}</span>
              <p className="mt-1 text-[11px] text-slate-500">{slot.hint}</p>
              <select
                value={linkedId ?? ''}
                disabled={commonEvents.length === 0}
                onChange={(e) => setLink(slot.key, e.target.value || null)}
                className={`${fieldClassName} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <option value="">연결 안 함</option>
                {commonEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title} (미디어 {event.media.length})
                  </option>
                ))}
              </select>
              {linked ? (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/30 px-2.5 py-1.5">
                  <p className="truncate text-xs text-slate-400">
                    {linked.projectTitle} · ch{linked.chapterId} · 노드 {linked.nodes.length}개
                  </p>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openSimulator(linked, 'debug')}
                      className="cursor-pointer rounded border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-300 transition hover:bg-indigo-500/20"
                    >
                      디버그
                    </button>
                    <button
                      type="button"
                      onClick={() => openSimulator(linked, 'game')}
                      className="cursor-pointer rounded border border-pink-500/25 bg-pink-500/10 px-2 py-0.5 text-[10px] font-medium text-pink-300 transition hover:bg-pink-500/20"
                    >
                      인게임
                    </button>
                  </div>
                </div>
              ) : null}
            </label>
          )
        })}
      </div>

      {simulatorEvent ? (
        <EventSimulator
          key={simulatorEvent.id}
          event={simulatorEvent}
          mode={simulatorMode}
          returnLabel="공통이벤트로 돌아가기"
          onClose={() => setSimulatorEvent(null)}
          registeredCharacters={registeredCharacters}
        />
      ) : null}
    </div>
  )
}
