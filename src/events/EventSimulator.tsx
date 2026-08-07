import { useEffect, useRef, useState, useMemo } from 'react'
import type { GameEvent, EventMediaAsset } from './types'

type EventSimulatorProps = {
  event: GameEvent
  onClose: () => void
}

type ParsedChoice = {
  text: string
  targetNodeId: string
}

// 1. 노드를 플랫하게 평탄화하여 디버그 리스트 및 순차적 진행에 사용합니다.
function flattenNodes(nodes: any[]): any[] {
  const result: any[] = []
  const visit = (list: any[]) => {
    for (const n of list) {
      if (!n) continue
      result.push(n)
      if (n.type === 'event' && Array.isArray(n.nodes)) {
        visit(n.nodes)
      }
    }
  }
  visit(nodes)
  return result
}

// 2. 노드 이미지 파일명 추출
function findNodeImage(node: any): string | null {
  if (node.image && typeof node.image === 'string' && node.image.trim()) {
    return node.image.trim()
  }
  if (node.type === 'custom' && Array.isArray(node.fields)) {
    for (const field of node.fields) {
      if (field && typeof field === 'object' && field.value_type === 'image' && typeof field.value === 'string') {
        return field.value.trim()
      }
    }
  }
  return null
}

// 3. 노드 사운드/보이스 파일명 추출
function findNodeSound(node: any, lang: string): string | null {
  if (node.voice && typeof node.voice === 'object') {
    const voiceFile = node.voice[lang] || Object.values(node.voice)[0]
    if (typeof voiceFile === 'string' && voiceFile.trim()) {
      return voiceFile.trim()
    }
  }
  if (node.sound && typeof node.sound === 'string' && node.sound.trim()) {
    return node.sound.trim()
  }
  return null
}

// 4. 다국어 매핑 및 대사 텍스트 추출
function getLocalizedText(node: any, localization: Record<string, Record<string, string>>, lang: string): string {
  const keys = [
    node.text_key,
    node.dialogue_key,
    node.key,
    node.message_key,
    node.dialogue,
    node.text,
  ]

  for (const k of keys) {
    if (typeof k === 'string' && localization[lang]?.[k]) {
      return localization[lang][k]
    }
  }

  // 매핑되지 않은 경우 직접 들어있는 텍스트 확인
  if (typeof node.text === 'string') return node.text
  if (typeof node.dialogue === 'string') return node.dialogue
  if (typeof node.message === 'string') return node.message
  if (typeof node.content === 'string') return node.content

  if (node.text && typeof node.text === 'object') {
    return node.text[lang] || Object.values(node.text)[0] || ''
  }
  if (node.dialogue && typeof node.dialogue === 'object') {
    return node.dialogue[lang] || Object.values(node.dialogue)[0] || ''
  }

  return ''
}

// 5. 캐릭터 이름 추출
function getCharacterName(node: any, event: GameEvent, lang: string): string {
  const charId = node.character || node.character_id || node.speaker || node.char
  if (charId) {
    const charDef = event.characters.find((c) => c.id === charId)
    if (charDef) {
      if (charDef.names?.[lang]) return charDef.names[lang]
      if (charDef.name) return charDef.name
      if (charDef.nameKey && event.localization[lang]?.[charDef.nameKey]) {
        return event.localization[lang][charDef.nameKey]
      }
    }
    if (event.localization[lang]?.[charId]) return event.localization[lang][charId]
    return charId
  }

  const nameKeys = [
    node.character_name,
    node.speaker_name,
    node.name,
    node.name_key,
  ]

  for (const nk of nameKeys) {
    if (typeof nk === 'string') {
      if (event.localization[lang]?.[nk]) {
        return event.localization[lang][nk]
      }
      return nk
    }
  }

  return ''
}

// 6. 선택지 파싱
function parseNodeChoices(node: any, localization: Record<string, Record<string, string>>, lang: string): ParsedChoice[] {
  const choicesField = node.choices || node.branches || node.options || node.nexts
  if (!Array.isArray(choicesField)) return []

  return choicesField.map((c: any) => {
    if (!c || typeof c !== 'object') return { text: String(c), targetNodeId: '' }

    let text = ''
    const textKeys = [c.text_key, c.label_key, c.key]
    for (const tk of textKeys) {
      if (typeof tk === 'string' && localization[lang]?.[tk]) {
        text = localization[lang][tk]
        break
      }
    }
    if (!text) {
      text = c.text || c.label || c.title || c.content || ''
      if (typeof text === 'object') {
        text = text[lang] || Object.values(text)[0] || ''
      }
    }

    const targetNodeId = String(c.next || c.next_node || c.target || c.target_node || c.node || c.nodeId || c.nextId || '')
    return { text: String(text || '선택지'), targetNodeId }
  })
}

// 7. 파일명으로 미디어 자산 조회
function findMediaAsset(fileName: string, media: EventMediaAsset[]): EventMediaAsset | null {
  if (!fileName) return null
  const fn = fileName.toLowerCase().trim()
  return media.find((m) => m.fileName.toLowerCase().trim() === fn) || null
}

export function EventSimulator({ event, onClose }: EventSimulatorProps) {
  // 모든 노드 추출 및 평탄화
  const flatNodes = useMemo(() => flattenNodes(event.nodes), [event.nodes])

  // 언어 설정 (기본값 설정)
  const availableLangs = useMemo(() => {
    const keys = Object.keys(event.localization)
    return keys.length > 0 ? keys : [event.defaultLanguage || 'ko']
  }, [event.localization, event.defaultLanguage])

  const [lang, setLang] = useState<string>(() => {
    return event.defaultLanguage && event.localization[event.defaultLanguage]
      ? event.defaultLanguage
      : availableLangs[0] || 'ko'
  })

  // 플레이어 및 내비게이션 상태
  const [currentNodeId, setCurrentNodeId] = useState<string>(() => {
    return event.startNode || flatNodes[0]?.id || flatNodes[0]?.key || ''
  })
  const [history, setHistory] = useState<string[]>([])
  const [isPlaying, setIsPlaying] = useState(true)
  const [playbackFinished, setPlaybackFinished] = useState(false)

  // 디버거 UI 상태
  const [debugTab, setDebugTab] = useState<'nodes' | 'json'>('nodes')
  const [searchQuery, setSearchQuery] = useState('')

  // 오디오 관리
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioVolume, setAudioVolume] = useState(0.8)
  const volumeRef = useRef(audioVolume)
  volumeRef.current = audioVolume
  const [currentSoundName, setCurrentSoundName] = useState<string | null>(null)

  // 현재 노드 객체 가져오기
  const currentNode = useMemo(() => {
    return flatNodes.find((n) => n.id === currentNodeId || n.key === currentNodeId) || null
  }, [flatNodes, currentNodeId])

  // 현재 노드 및 이전 노드들에서 가장 최근에 설정된 미디어 탐색 (미디어가 없는 노드는 이전 미디어를 유지)
  const activeMedia = useMemo(() => {
    if (!currentNode) return null

    // 1. 현재 노드에 미디어가 있는지 확인
    const currentImgName = findNodeImage(currentNode)
    if (currentImgName) {
      return findMediaAsset(currentImgName, event.media)
    }

    // 2. 현재 노드에 없다면, flatNodes 상의 이전 노드들을 역순으로 탐색하여 가장 최근 미디어를 상속
    const currentIndex = flatNodes.findIndex((n) => n.id === currentNodeId || n.key === currentNodeId)
    if (currentIndex > 0) {
      for (let i = currentIndex - 1; i >= 0; i--) {
        const prevNode = flatNodes[i]
        const imgName = findNodeImage(prevNode)
        if (imgName) {
          return findMediaAsset(imgName, event.media)
        }
      }
    }

    return null
  }, [flatNodes, currentNodeId, currentNode, event.media])

  // 현재 노드의 사운드 확인 및 재생
  const activeSound = useMemo(() => {
    if (!currentNode) return null
    const soundName = findNodeSound(currentNode, lang)
    if (!soundName) return null
    return findMediaAsset(soundName, event.media)
  }, [currentNode, lang, event.media])

  // 사운드 파일 재생 처리
  useEffect(() => {
    if (!isPlaying) {
      if (audioRef.current) audioRef.current.pause()
      return
    }

    if (activeSound) {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      const audio = new Audio(activeSound.url)
      audio.volume = volumeRef.current
      audio.play().catch((err) => console.log('Audio autoplay blocked or failed:', err))
      audioRef.current = audio
      setCurrentSoundName(activeSound.fileName)

      return () => {
        audio.pause()
      }
    } else {
      // 새로운 노드에 사운드가 없다면, 이전 보이스는 정지 (단, 일반 sound가 루프 재생 중이 아닐 때)
      if (audioRef.current && currentNode?.voice) {
        audioRef.current.pause()
        setCurrentSoundName(null)
      }
    }
  }, [activeSound, isPlaying, currentNode])

  // 볼륨 실시간 반영
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = audioVolume
    }
  }, [audioVolume])

  // ESC 키로 시뮬레이터 종료 지원
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // 현재 노드 파싱 정보
  const characterName = currentNode ? getCharacterName(currentNode, event, lang) : ''
  const dialogueText = currentNode ? getLocalizedText(currentNode, event.localization, lang) : ''
  const choices = currentNode ? parseNodeChoices(currentNode, event.localization, lang) : []

  // 특정 노드로 강제 점프
  const jumpToNode = (nodeId: string) => {
    if (!nodeId) return
    const targetExists = flatNodes.some((n) => n.id === nodeId || n.key === nodeId)
    if (!targetExists) {
      alert(`노드를 찾을 수 없습니다: ${nodeId}`)
      return
    }
    setHistory((prev) => [...prev, currentNodeId])
    setCurrentNodeId(nodeId)
    setPlaybackFinished(false)
  }

  // 이전 노드로 되돌아가기
  const handleBack = () => {
    if (history.length === 0) return
    const prevNodeId = history[history.length - 1]
    setHistory((prev) => prev.slice(0, -1))
    setCurrentNodeId(prevNodeId)
    setPlaybackFinished(false)
  }

  // 다음 노드로 진행
  const handleNext = () => {
    if (!currentNode) return

    // 선택지가 켜져있다면 강제 선택해야 함 (시뮬레이터 진행 불가)
    if (choices.length > 0) return

    // 1. 노드 자체에 명시된 next 포인터 확인
    const nextPointer = currentNode.next || currentNode.next_node || currentNode.target || currentNode.target_node
    if (nextPointer) {
      jumpToNode(String(nextPointer))
      return
    }

    // 2. 명시된 포인터가 없으면 플랫 노드 배열 상의 다음 인덱스로 진행
    const currentIndex = flatNodes.findIndex((n) => n.id === currentNodeId || n.key === currentNodeId)
    if (currentIndex >= 0 && currentIndex < flatNodes.length - 1) {
      const nextNode = flatNodes[currentIndex + 1]
      const nextId = nextNode.id || nextNode.key || ''
      if (nextId) {
        jumpToNode(nextId)
        return
      }
    }

    // 진행할 다음 노드가 없음
    setPlaybackFinished(true)
  }

  // 처음부터 다시 시작
  const handleRestart = () => {
    setHistory([])
    const startId = event.startNode || flatNodes[0]?.id || flatNodes[0]?.key || ''
    setCurrentNodeId(startId)
    setPlaybackFinished(false)
  }

  // 검색 필터링된 노드 목록
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return flatNodes
    const q = searchQuery.toLowerCase()
    return flatNodes.filter((n) => {
      const id = String(n.id || n.key || '').toLowerCase()
      const text = getLocalizedText(n, event.localization, lang).toLowerCase()
      const charName = getCharacterName(n, event, lang).toLowerCase()
      return id.includes(q) || text.includes(q) || charName.includes(q)
    })
  }, [flatNodes, searchQuery, lang, event])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/98 text-slate-100 font-sans backdrop-blur-sm animate-fade-in">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-indigo-500/15 bg-slate-900/60 px-6 py-4">
        <div className="flex items-center gap-4">
          <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300">
            SIMULATOR
          </span>
          <div>
            <h2 className="text-base font-semibold">{event.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {event.projectTitle} · ch{event.chapterId} · 노드 총 {flatNodes.length}개
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 다국어 언어 변경 */}
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-2 py-1">
            <span className="text-xs text-slate-500 font-medium uppercase">LANG:</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="bg-transparent text-xs font-semibold text-indigo-300 outline-none cursor-pointer"
            >
              {availableLangs.map((l) => (
                <option key={l} value={l} className="bg-slate-900 text-slate-100">
                  {l.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* 볼륨 컨트롤 */}
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-1">
            <span className="text-xs text-slate-400 font-medium">🔈</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={audioVolume}
              onChange={(e) => setAudioVolume(Number(e.target.value))}
              className="w-16 h-1 rounded bg-slate-700 accent-indigo-400 cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-indigo-600/15 hover:bg-indigo-600/35 border border-indigo-500/30 px-4 py-1.5 text-sm font-semibold text-indigo-200 transition"
          >
            뒤로가기 [ESC]
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_380px]">
        {/* Left: Visual Novel Player */}
        <div className="flex flex-col items-center justify-center bg-black/40 p-4 min-h-0 overflow-auto relative">
          <div className="relative aspect-video w-full max-w-4xl bg-black rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col justify-end">
            
            {/* 1. 미디어 화면 (배경) */}
            <div className="absolute inset-0 z-0 bg-slate-900 flex items-center justify-center">
              {activeMedia ? (
                activeMedia.kind === 'video' ? (
                  <video
                    src={activeMedia.url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <img
                    src={activeMedia.url}
                    alt="Event Background"
                    className="h-full w-full object-contain"
                  />
                )
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-600">
                  <span className="text-4xl">🎬</span>
                  <p className="text-xs">배경 미디어가 없습니다</p>
                </div>
              )}
            </div>

            {/* LIVE Badge (인게임 방송 연출 느낌용) */}
            <div className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-indigo-400/40 bg-indigo-500/20 px-2.5 py-1 text-[10px] font-bold tracking-wider text-indigo-200">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              EVENT PREVIEW
            </div>

            {/* 현재 재생중인 사운드 뱃지 */}
            {currentSoundName && (
              <div className="absolute top-4 right-4 z-10 inline-flex items-center gap-1 rounded bg-black/60 border border-white/10 px-2 py-1 text-[10px] text-slate-300">
                <span>🔊</span>
                <span className="truncate max-w-[120px] font-mono">{currentSoundName}</span>
              </div>
            )}

            {/* 2. 대사/선택지 오버레이 영역 */}
            <div className="relative z-10 w-full p-4 flex flex-col gap-3 bg-gradient-to-t from-black via-black/80 to-transparent">
              
              {/* 분기 선택지 (Choices) */}
              {choices.length > 0 && (
                <div className="flex flex-col gap-2 w-full max-w-lg mx-auto pb-2">
                  {choices.map((choice, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => jumpToNode(choice.targetNodeId)}
                      className="w-full text-left bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 hover:border-indigo-400 rounded-xl px-4 py-3 text-sm font-semibold transition shadow-lg flex justify-between items-center group"
                    >
                      <span className="text-slate-100 group-hover:text-white">{choice.text}</span>
                      <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950 border border-indigo-500/25 px-1.5 py-0.5 rounded opacity-80 group-hover:opacity-100">
                        ☞ {choice.targetNodeId || 'NEXT'}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* 플레이 종료 안내 */}
              {playbackFinished && (
                <div className="flex flex-col items-center justify-center p-6 bg-black/50 border border-amber-500/20 rounded-xl text-center">
                  <span className="text-2xl mb-1">🏁</span>
                  <h4 className="text-sm font-semibold text-amber-300">이벤트 재생이 끝났습니다</h4>
                  <p className="text-xs text-slate-400 mt-1">다음 연결 대상 노드가 없습니다.</p>
                  <button
                    type="button"
                    onClick={handleRestart}
                    className="mt-3 bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-amber-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                  >
                    처음부터 다시하기
                  </button>
                </div>
              )}

              {/* 대사 상자 */}
              {!playbackFinished && (
                <div
                  onClick={() => choices.length === 0 && handleNext()}
                  className={`w-full min-h-[96px] bg-slate-950/70 border border-white/10 rounded-xl p-4 text-left transition select-none flex flex-col justify-between ${
                    choices.length === 0 ? 'cursor-pointer hover:border-indigo-400/40' : ''
                  }`}
                >
                  <div className="space-y-1.5">
                    {characterName && (
                      <div className="inline-block bg-indigo-600/90 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow">
                        {characterName}
                      </div>
                    )}
                    <p className="text-[14px] leading-relaxed font-medium text-slate-100 pr-6 break-all">
                      {dialogueText || <span className="text-slate-500 italic">(대사 없음 / 연출 노드)</span>}
                    </p>
                  </div>

                  {/* 마우스 클릭 지시 아이콘 (선택지가 없을 때만 노출) */}
                  {choices.length === 0 && (
                    <div className="self-end text-[10px] font-semibold text-slate-500 animate-pulse flex items-center gap-1">
                      클릭하여 다음 노드로 <span>▼</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Player controls */}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleRestart}
              className="game-btn px-4 py-2 text-xs"
              title="첫 번째 노드로 리셋"
            >
              🔄 처음부터
            </button>
            <button
              type="button"
              disabled={history.length === 0}
              onClick={handleBack}
              className="game-btn px-4 py-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              title="이전 단계로 되돌리기"
            >
              ◀ 이전으로
            </button>
            <button
              type="button"
              disabled={choices.length > 0 || playbackFinished}
              onClick={handleNext}
              className="game-btn px-4 py-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              title="다음 단계로 진행"
            >
              다음으로 ▶
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`game-btn px-4 py-2 text-xs ${!isPlaying ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : ''}`}
            >
              {isPlaying ? '⏸ 일시정지' : '▶ 재생'}
            </button>
          </div>
        </div>

        {/* Right: Debug Console Panel */}
        <aside className="border-l border-indigo-500/15 bg-slate-900/40 flex flex-col min-h-0">
          
          {/* Debug Console Header/Tabs */}
          <div className="flex shrink-0 border-b border-white/10">
            <button
              type="button"
              onClick={() => setDebugTab('nodes')}
              className={`flex-1 py-3 text-xs font-semibold border-b-2 text-center transition ${
                debugTab === 'nodes'
                  ? 'border-indigo-500 text-indigo-300 bg-white/2'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              노드 리스트 ({flatNodes.length})
            </button>
            <button
              type="button"
              onClick={() => setDebugTab('json')}
              className={`flex-1 py-3 text-xs font-semibold border-b-2 text-center transition ${
                debugTab === 'json'
                  ? 'border-indigo-500 text-indigo-300 bg-white/2'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Raw JSON
            </button>
          </div>

          {/* Debug Console Body */}
          <div className="flex-1 min-h-0 flex flex-col p-4">
            {debugTab === 'nodes' ? (
              <>
                {/* 검색 바 */}
                <input
                  type="text"
                  placeholder="ID, 대사, 이름 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500/50 mb-3"
                />

                {/* 노드 리스트 */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {filteredNodes.map((n, index) => {
                    const nid = n.id || n.key || ''
                    const isActive = nid === currentNodeId
                    const nodeChar = getCharacterName(n, event, lang)
                    const nodeText = getLocalizedText(n, event.localization, lang)
                    const nodeImg = findNodeImage(n)
                    const nodeSnd = findNodeSound(n, lang)

                    return (
                      <button
                        key={nid || index}
                        type="button"
                        onClick={() => jumpToNode(nid)}
                        className={`w-full text-left rounded-lg p-2 text-xs border transition ${
                          isActive
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500/30'
                            : 'bg-black/20 border-white/5 text-slate-300 hover:bg-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] text-slate-500 truncate max-w-[140px]">
                            {nid || `node_${index}`}
                          </span>
                          <div className="flex gap-1">
                            {n.type && (
                              <span className="px-1 py-0.2 rounded bg-slate-800 text-[8px] text-slate-400">
                                {n.type}
                              </span>
                            )}
                            {nodeImg && <span title={`이미지: ${nodeImg}`} className="text-[9px]">🖼️</span>}
                            {nodeSnd && <span title={`사운드: ${nodeSnd}`} className="text-[9px]">🔊</span>}
                          </div>
                        </div>

                        {/* 대사 및 화자 */}
                        {(nodeChar || nodeText) ? (
                          <p className="mt-1 font-medium truncate text-slate-200">
                            {nodeChar ? `[${nodeChar}] ` : ''}
                            {nodeText}
                          </p>
                        ) : (
                          <p className="mt-1 text-[10px] text-slate-500 italic">
                            (연출 또는 분기 노드)
                          </p>
                        )}

                        {/* 분기가 있을 때 표시 */}
                        {parseNodeChoices(n, event.localization, lang).length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {parseNodeChoices(n, event.localization, lang).map((choice, ci) => (
                              <span
                                key={ci}
                                className="px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/20 text-[9px] text-indigo-300 font-mono"
                              >
                                ⌥ {choice.text} ➔ {choice.targetNodeId || 'NEXT'}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    )
                  })}

                  {filteredNodes.length === 0 && (
                    <p className="text-center text-xs text-slate-500 py-6">
                      일치하는 노드가 없습니다
                    </p>
                  )}
                </div>
              </>
            ) : (
              // JSON View
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-slate-500">
                    ID: {currentNodeId}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(currentNode, null, 2))
                      alert('JSON이 클립보드에 복사되었습니다.')
                    }}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    📋 복사하기
                  </button>
                </div>
                
                <pre className="flex-1 overflow-auto text-[11px] leading-relaxed text-emerald-400 font-mono bg-black/40 border border-white/10 p-3 rounded-lg">
                  {currentNode
                    ? JSON.stringify(currentNode, null, 2)
                    : '// 현재 활성화된 노드가 없습니다'}
                </pre>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
