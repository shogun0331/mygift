import { useState } from 'react'
import type { RegisteredCharacter } from '../game/characters'
import { normalizeCreatorStatType } from '../game/characters'
import { STATION_TIER_LABEL, type StationTierId } from '../game/stationGradeConfig'
import { CREATOR_TYPE_LABEL } from '../game/auditEngine'
import { resolveMediaSrc } from '../game/mediaUrl'

type Props = {
  tierKey: Exclude<StationTierId, 'black' | 'tiny'>
  registeredCharacters: RegisteredCharacter[]
  onStartSimulation: (selectedCharacters: RegisteredCharacter[]) => void
  onClose?: () => void
}

/** 등급별(S, A, B, C) 프리미엄 네온 글로우 뱃지 스타일 헬퍼 */
export function getGradeBadgeStyle(grade: string = 'B') {
  const g = (grade || 'B').toUpperCase()
  switch (g) {
    case 'S':
      return 'border-amber-400 text-amber-200 bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 shadow-[0_0_15px_rgba(251,191,36,0.85)] ring-1 ring-amber-400/50'
    case 'A':
      return 'border-purple-400 text-purple-200 bg-gradient-to-r from-purple-950 via-indigo-900 to-purple-950 shadow-[0_0_15px_rgba(168,85,247,0.85)] ring-1 ring-purple-400/50'
    case 'B':
      return 'border-cyan-400 text-cyan-200 bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 shadow-[0_0_15px_rgba(6,182,212,0.8)] ring-1 ring-cyan-400/50'
    case 'C':
    default:
      return 'border-slate-400 text-slate-200 bg-slate-900 shadow-[0_0_10px_rgba(148,163,184,0.5)]'
  }
}

export function AuditSimulatorDeckModal({
  tierKey,
  registeredCharacters,
  onStartSimulation,
}: Props) {
  // 시뮬레이터 전용: 모든 캐릭터를 S등급 및 최고 스탯으로 마운트
  const boostedCharacters: RegisteredCharacter[] = registeredCharacters.map((c) => ({
    ...c,
    grade: 'S',
  }))

  // 4인 덱 고정 슬롯 위치 상태 (크기 4 배열: [slot0, slot1, slot2, slot3])
  const [deckSlots, setDeckSlots] = useState<(string | null)[]>(() => {
    const initial: (string | null)[] = [null, null, null, null]
    boostedCharacters.slice(0, 4).forEach((c, idx) => {
      initial[idx] = c.id
    })
    return initial
  })

  const [draggedId, setDraggedId] = useState<string | null>(null)

  // 현재 배치된 캐릭터 ID 리스트
  const activeSelectedIds = deckSlots.filter(Boolean) as string[]

  // 하단 카드 클릭 시 덱 장착 / 해제 (빈 슬롯 탐색)
  const toggleSelect = (id: string) => {
    setDeckSlots((prev) => {
      const next = [...prev]
      const existingIdx = next.indexOf(id)
      if (existingIdx !== -1) {
        // 이미 덱에 배치되어 있다면 해제
        next[existingIdx] = null
      } else {
        // 비어있는 가장 첫 번째 슬롯 찾기
        const emptyIdx = next.indexOf(null)
        if (emptyIdx === -1) {
          return prev
        }
        next[emptyIdx] = id
      }
      return next
    })
  }

  // 특정 슬롯 위치에 캐릭터 장착
  const assignToSlot = (slotIdx: number, charId: string) => {
    setDeckSlots((prev) => {
      const next = [...prev]
      // 만약 다른 슬롯에 이미 위치해 있다면 이전 위치를 null로 비움
      const existingIdx = next.indexOf(charId)
      if (existingIdx !== -1) {
        next[existingIdx] = null
      }
      next[slotIdx] = charId
      return next
    })
  }

  // 특정 슬롯 비우기
  const clearSlot = (slotIdx: number) => {
    setDeckSlots((prev) => {
      const next = [...prev]
      next[slotIdx] = null
      return next
    })
  }

  const handleStart = () => {
    const selected = boostedCharacters.filter((c) => activeSelectedIds.includes(c.id))
    if (selected.length === 0) {
      alert('최소 1명 이상의 출전 캐릭터를 선택해 주세요.')
      return
    }
    onStartSimulation(selected)
  }

  // 상단 4칸 슬롯 배열 객체 매핑
  const slots: (RegisteredCharacter | null)[] = [0, 1, 2, 3].map((slotIdx) => {
    const id = deckSlots[slotIdx]
    return id ? boostedCharacters.find((c) => c.id === id) || null : null
  })

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-2 sm:p-4 backdrop-blur-lg"
      role="dialog"
      aria-modal="true"
    >
      <div className="game-panel relative flex flex-col w-[98vw] max-w-7xl max-h-[96vh] h-[93vh] overflow-hidden rounded-3xl border border-cyan-500/50 bg-slate-950/95 p-4 sm:p-6 shadow-[0_0_100px_rgba(6,182,212,0.45)]">
        {/* 헤더 */}
        <div className="flex shrink-0 items-center justify-between border-b border-cyan-500/20 pb-3">
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-cyan-400/40 bg-cyan-950/80 px-3 py-1 text-xs font-black text-cyan-200 uppercase tracking-wider">
              🎮 {STATION_TIER_LABEL[tierKey]} 승급심사 덱 세팅
            </span>
            <h3 className="text-base sm:text-xl font-black text-slate-100">
              출전 캐릭터 덱(Deck) 4칸 구성
            </h3>
          </div>
        </div>

        {/* 메인 덱 구성 컨텐츠 영역 */}
        <div className="flex flex-1 flex-col overflow-hidden space-y-4 my-3 min-h-0">
          {/* 1. 상단 덱 빈 공간 4칸 슬롯 (대형 3:4 프리미엄 트레이딩 카드 스타일 - 하단 카드보다 훨씬 거대함) */}
          <div className="shrink-0 rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-cyan-950/40 to-slate-950/60 p-4 backdrop-blur-md shadow-lg">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs sm:text-sm font-black text-cyan-300">
                📥 4인 출전 덱 슬롯 ({activeSelectedIds.length} / 4)
              </span>
              <span className="text-[11px] sm:text-xs text-slate-400">
                (카드를 클릭하면 덱 해제 / 원하는 슬롯으로 카드를 끌어다 드래그 배치)
              </span>
            </div>

            <div className="grid grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
              {slots.map((char, slotIdx) => {
                return (
                  <div
                    key={slotIdx}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedId) {
                        assignToSlot(slotIdx, draggedId) // 지정한 슬롯 위치에 정확히 장착!
                        setDraggedId(null)
                      }
                    }}
                    onClick={() => {
                      if (char) {
                        clearSlot(slotIdx) // 해당 슬롯 클릭 시 즉시 비우기!
                      }
                    }}
                    className={`relative aspect-[3/4] h-[210px] sm:h-[250px] flex flex-col justify-between overflow-hidden rounded-2xl border transition-all ${
                      char
                        ? 'cursor-pointer border-cyan-300 ring-4 ring-cyan-400/40 shadow-[0_0_35px_rgba(6,182,212,0.45)] bg-slate-900 hover:scale-[1.03] hover:border-rose-400'
                        : 'border-2 border-dashed border-cyan-500/40 bg-cyan-950/20 hover:border-cyan-300/70 hover:bg-cyan-950/40'
                    }`}
                  >
                    {char ? (
                      <>
                        {/* 대형 3:4 카드 배경 이미지 */}
                        {char.profileImageUrl ? (
                          <img
                            src={resolveMediaSrc(char.profileImageUrl)}
                            alt={char.name}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-cyan-950 via-slate-900 to-indigo-950 text-2xl font-bold text-cyan-300">
                            <span>👤</span>
                            <span className="text-xs mt-1">{char.name.slice(0, 2)}</span>
                          </div>
                        )}

                        {/* 상단 뱃지 (S, A, B, C 단 한글자 프리미엄 네온 뱃지 연출) */}
                        <div className="relative z-10 flex items-center justify-between p-2 bg-gradient-to-b from-black/85 to-transparent">
                          <span className={`rounded-lg border px-2.5 py-0.5 text-xs sm:text-sm font-black italic tracking-widest ${getGradeBadgeStyle(char.grade || 'S')}`}>
                            {char.grade || 'S'}
                          </span>
                        </div>

                        {/* 하단 프로필 및 타입 아이콘 & 스테미나 바 */}
                        <div className="relative z-10 p-2.5 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pt-4 space-y-1.5">
                          {(() => {
                            const rawType = char.statType || (char as any).type || (char as any).primaryStat || 'elegance'
                            const cType = normalizeCreatorStatType(rawType)
                            const typeInfo = CREATOR_TYPE_LABEL[cType]
                            const stamina = (char as any).stamina ?? 100
                            return (
                              <>
                                <div className="flex items-center justify-between gap-1">
                                  <span className="truncate text-sm sm:text-base font-black text-white drop-shadow">
                                    {char.name}
                                  </span>
                                  <span className={`rounded-md border px-2 py-0.5 text-xs font-black ${typeInfo.tone}`}>
                                    {typeInfo.icon}
                                  </span>
                                </div>

                                {/* 스테미나 게이지 바 */}
                                <div className="flex flex-col space-y-0.5 border-t border-white/15 pt-1">
                                  <div className="flex items-center justify-between text-[9px] font-black text-amber-300">
                                    <span>⚡ STAMINA</span>
                                    <span className="tabular-nums font-bold text-slate-100">{stamina}</span>
                                  </div>
                                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900 border border-white/20">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400"
                                      style={{ width: `${Math.min(100, Math.max(0, stamina))}%` }}
                                    />
                                  </div>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </>
                    ) : (
                      /* 대형 빈 슬롯 뷰어 */
                      <div className="flex h-full w-full flex-col items-center justify-center text-slate-500 p-2 text-center">
                        <span className="text-3xl sm:text-4xl font-light text-cyan-400/70">+</span>
                        <span className="mt-1.5 text-xs font-black text-cyan-200">슬롯 {slotIdx + 1}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">비어있음</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 2. 하단 미배치 보유 캐릭터 카드 나열 덱 풀 리스트 (flex-1 2줄 뷰어) */}
          <div className="flex-1 min-h-0 shrink-0 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 p-3.5">
            {(() => {
              const availableCharacters = boostedCharacters.filter(
                (c) => !activeSelectedIds.includes(c.id)
              )
              return (
                <>
                  <div className="mb-2 flex items-center justify-between shrink-0">
                    <span className="text-xs sm:text-sm font-bold text-slate-300">
                      🎴 미배치 보유 캐릭터 ({availableCharacters.length}명)
                    </span>
                    <span className="text-[11px] sm:text-xs text-slate-400">
                      클릭 또는 슬롯으로 드래그하여 배치
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1">
                    {availableCharacters.length > 0 ? (
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-1 sm:gap-1.5">
                        {availableCharacters.map((character) => {
                          const rawType = character.statType || (character as any).type || (character as any).primaryStat || 'elegance'
                          const cType = normalizeCreatorStatType(rawType)
                          const typeInfo = CREATOR_TYPE_LABEL[cType]
                          const isBeingDragged = draggedId === character.id
                          const stamina = (character as any).stamina ?? 100

                          return (
                            <div
                              key={character.id}
                              draggable
                              onDragStart={(e) => {
                                setDraggedId(character.id)
                                e.dataTransfer.effectAllowed = 'move'
                              }}
                              onDragEnd={() => setDraggedId(null)}
                              onClick={() => toggleSelect(character.id)}
                              className={`group relative aspect-[3/4] h-[175px] sm:h-[205px] flex flex-col justify-between overflow-hidden rounded-2xl border transition-all cursor-pointer ${
                                isBeingDragged
                                  ? 'opacity-30 border-cyan-400 border-dashed scale-95'
                                  : 'border-purple-500/40 bg-slate-950 hover:border-cyan-400 hover:scale-[1.04] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]'
                              }`}
                            >
                              {/* 배경 이미지 */}
                              {character.profileImageUrl ? (
                                <img
                                  src={resolveMediaSrc(character.profileImageUrl)}
                                  alt={character.name}
                                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                              ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 text-lg font-bold text-purple-300">
                                  <span>👤</span>
                                  <span className="text-[9px]">{character.name.slice(0, 2)}</span>
                                </div>
                              )}

                              {/* 상단 오버레이 (등급 단 1글자 프리미엄 네온 & 타입) */}
                              <div className="relative z-10 flex items-center justify-between p-1 bg-gradient-to-b from-black/80 to-transparent">
                                <span className={`rounded-md border px-1.5 py-0.2 text-[10px] sm:text-xs font-black italic tracking-wider ${getGradeBadgeStyle(character.grade || 'S')}`}>
                                  {character.grade || 'S'}
                                </span>
                                <span className={`rounded border px-1 py-0.2 text-[10px] font-black ${typeInfo.tone}`}>
                                  {typeInfo.icon}
                                </span>
                              </div>

                              {/* 하단 프로필 이름 & 스테미나 게이지 바 */}
                              <div className="relative z-10 p-1.5 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pt-2.5 space-y-0.5">
                                <h5 className="truncate text-[11px] font-black text-white text-center drop-shadow">
                                  {character.name}
                                </h5>
                                <div className="flex flex-col space-y-0.5 border-t border-white/10 pt-0.5">
                                  <div className="flex items-center justify-between text-[7.5px] font-black text-amber-300 px-0.5">
                                    <span>⚡ STAMINA</span>
                                    <span className="tabular-nums font-bold text-slate-200">{stamina}</span>
                                  </div>
                                  <div className="h-1 w-full overflow-hidden rounded-full bg-slate-900 border border-white/15">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400"
                                      style={{ width: `${Math.min(100, Math.max(0, stamina))}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-slate-500 p-6">
                        🎉 모든 캐릭터가 4칸 덱에 배치되었습니다!
                      </div>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </div>

        {/* 푸터 버튼 (취소/닫기 제거 및 승급심사 시작 텍스트 적용) */}
        <div className="shrink-0 flex items-center justify-end border-t border-cyan-500/20 pt-3">
          <button
            type="button"
            onClick={handleStart}
            className="w-full sm:w-auto rounded-xl border border-cyan-400/50 bg-gradient-to-r from-cyan-600 to-teal-500 px-8 py-3 text-sm font-black text-white shadow-[0_0_25px_rgba(6,182,212,0.45)] hover:brightness-110"
          >
            🚀 승급심사 시작 ({activeSelectedIds.length} / 4)
          </button>
        </div>
      </div>
    </div>
  )
}

