import { useEffect, useRef, useState, useMemo } from 'react'
import type { GameEvent, EventMediaAsset } from './types'
import { BlurRegionOverlay, readBlurRegions } from './BlurRegionEditor'
import {
  EVENT_DEFAULT_LOCALE,
  EVENT_LOCALES,
  lookupLocalizedString,
  normalizeEventLocale,
} from './eventLocales'

type EventSimulatorProps = {
  event: GameEvent
  mode?: 'debug' | 'game'
  onClose: () => void
  registeredCharacters?: any[]
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
function resolveVoiceFileName(node: any): string | null {
  if (!node || node.type === 'sound') return null
  if (typeof node.voice === 'string' && node.voice.trim()) {
    return node.voice.trim()
  }
  if (node.voice && typeof node.voice === 'object') {
    const first = Object.values(node.voice).find((v) => typeof v === 'string' && v.trim())
    if (typeof first === 'string') return first.trim()
  }
  if (typeof node.sound === 'string' && node.sound.trim()) {
    return node.sound.trim()
  }
  return null
}

function findNodeSound(node: any): string | null {
  if (node?.type === 'sound' && typeof node.sound === 'string' && node.sound.trim()) {
    return node.sound.trim()
  }
  return resolveVoiceFileName(node)
}

// 4. 다국어 매핑 및 대사 텍스트 추출
function getLocalizedText(node: any, localization: Record<string, Record<string, string>>, lang: string): string {
  const keys = [
    node.text_key,
    node.dialogue_key,
    node.key,
    node.id,
    node.message_key,
    node.dialogue,
    node.text,
  ]
  const mapped = lookupLocalizedString(localization, lang, keys)
  if (mapped) return mapped

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
  const locale = normalizeEventLocale(lang)
  const charId = node.character || node.character_id || node.speaker || node.char
  if (charId) {
    if (charId === 'player') {
      return locale === 'ko' ? '플레이어' : 'Player'
    }
    const charDef = event.characters.find((c) => c.id === charId)
    if (charDef) {
      if (charDef.names?.[locale]) return charDef.names[locale]
      if (charDef.names?.[lang]) return charDef.names[lang]
      if (charDef.name) return charDef.name
      const named = lookupLocalizedString(event.localization, locale, [charDef.nameKey, charId])
      if (named) return named
    }
    const fromLoc = lookupLocalizedString(event.localization, locale, [charId])
    if (fromLoc) return fromLoc
    return charId
  }

  const nameKeys = [node.character_name, node.speaker_name, node.name, node.name_key]
  const mapped = lookupLocalizedString(event.localization, locale, nameKeys)
  if (mapped) return mapped
  for (const nk of nameKeys) {
    if (typeof nk === 'string' && nk) return nk
  }

  return ''
}

// 6. 선택지 파싱
function parseNodeChoices(node: any, localization: Record<string, Record<string, string>>, lang: string): ParsedChoice[] {
  const choicesField = node.choices || node.branches || node.options || node.nexts
  if (!Array.isArray(choicesField)) return []

  return choicesField.map((c: any) => {
    if (!c || typeof c !== 'object') return { text: String(c), targetNodeId: '' }

    let text = lookupLocalizedString(localization, lang, [c.text_key, c.label_key, c.key])
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

export function EventSimulator({ event, mode = 'debug', onClose, registeredCharacters = [] }: EventSimulatorProps) {
  // 모든 노드 추출 및 평탄화
  const flatNodes = useMemo(() => flattenNodes(event.nodes), [event.nodes])

  // 언어 설정 (기본값 설정)
  const availableLangs = EVENT_LOCALES

  const [lang, setLang] = useState<string>(() => {
    return normalizeEventLocale(event.defaultLanguage || EVENT_DEFAULT_LOCALE)
  })

  // 플레이어 및 내비게이션 상태
  const [currentNodeId, setCurrentNodeId] = useState<string>(() => {
    return event.startNode || flatNodes[0]?.id || flatNodes[0]?.key || ''
  })
  const [history, setHistory] = useState<string[]>([])
  const [isPlaying, setIsPlaying] = useState(true)
  const [playbackFinished, setPlaybackFinished] = useState(false)

  const [fadeOpacity, setFadeOpacity] = useState(1)
  const [isClosing, setIsClosing] = useState(false)
  const [sceneFadeOpacity, setSceneFadeOpacity] = useState(0)
  const [overlayColor, setOverlayColor] = useState('#000000')
  const [overlayMs, setOverlayMs] = useState(1200)
  const FADE_MS = 1200
  const handleNextRef = useRef<() => void>(() => {})

  // 시작: 첫 노드가 페이드가 아니면 전체를 잠깐 유지한 뒤 부드럽게 밝아짐
  useEffect(() => {
    const first = flattenNodes(event.nodes || [])[0]
    if (first?.type === 'fade') return
    const timer = window.setTimeout(() => {
      setFadeOpacity(0)
    }, 320)
    return () => window.clearTimeout(timer)
  }, [])

  const triggerClose = () => {
    if (isClosing) return
    setIsClosing(true)
    setOverlayColor('#000000')
    setOverlayMs(FADE_MS)
    setFadeOpacity(1)
    for (const channel of ['voice', 'bgm', 'sfx'] as const) {
      const audio = channelsRef.current[channel]
      if (audio) {
        audio.pause()
        audio.src = ''
        channelsRef.current[channel] = null
      }
    }
    window.setTimeout(() => {
      onClose()
    }, FADE_MS)
  }

  // 디버거 UI 상태
  const [debugTab, setDebugTab] = useState<'nodes' | 'json'>('nodes')
  const [searchQuery, setSearchQuery] = useState('')
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const typingTimerRef = useRef<any>(null)

  type AudioChannel = 'voice' | 'bgm' | 'sfx'
  const channelsRef = useRef<Record<AudioChannel, HTMLAudioElement | null>>({
    voice: null,
    bgm: null,
    sfx: null,
  })
  const isPlayingRef = useRef(isPlaying)
  isPlayingRef.current = isPlaying
  const [audioVolume, setAudioVolume] = useState(0.8)
  const volumeRef = useRef(audioVolume)
  volumeRef.current = audioVolume
  const [channelNames, setChannelNames] = useState<Record<AudioChannel, string | null>>({
    voice: null,
    bgm: null,
    sfx: null,
  })

  const stopChannel = (channel: AudioChannel) => {
    const audio = channelsRef.current[channel]
    if (audio) {
      audio.pause()
      audio.src = ''
      channelsRef.current[channel] = null
    }
    setChannelNames((prev) => (prev[channel] ? { ...prev, [channel]: null } : prev))
  }

  const playChannel = (channel: AudioChannel, asset: EventMediaAsset, loop: boolean) => {
    stopChannel(channel)
    const audio = new Audio(asset.url)
    audio.loop = loop
    audio.volume = volumeRef.current
    channelsRef.current[channel] = audio
    setChannelNames((prev) => ({ ...prev, [channel]: asset.fileName }))
    if (isPlayingRef.current) {
      audio.play().catch((err) => console.log('Audio autoplay blocked or failed:', err))
    }
  }

  // 컴포넌트 언마운트 시 오디오 리소스 강제 해제
  useEffect(() => {
    return () => {
      for (const channel of Object.values(channelsRef.current)) {
        if (!channel) continue
        try {
          channel.pause()
          channel.src = ''
        } catch (e) {
          console.error('Audio cleanup error on unmount:', e)
        }
      }
    }
  }, [])

  // 현재 노드 객체 가져오기
  const currentNode = useMemo(() => {
    return flatNodes.find((n) => n.id === currentNodeId || n.key === currentNodeId) || null
  }, [flatNodes, currentNodeId])

  // 현재 노드 파싱 정보
  const characterName = currentNode ? getCharacterName(currentNode, event, lang) : ''
  const dialogueText = currentNode ? getLocalizedText(currentNode, event.localization, lang) : ''
  const choices = currentNode ? parseNodeChoices(currentNode, event.localization, lang) : []
  const isImageNode = currentNode?.type === 'graphic'
  const isFadeNode = currentNode?.type === 'fade'
  const isSoundNode = currentNode?.type === 'sound'

  useEffect(() => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current)
      typingTimerRef.current = null
    }

    if (!dialogueText) {
      setDisplayedText('')
      setIsTyping(false)
      return
    }

    setDisplayedText('')
    setIsTyping(true)
    
    let currentIndex = 0
    const textLength = dialogueText.length
    const speedMs = 25

    typingTimerRef.current = setInterval(() => {
      currentIndex++
      if (currentIndex <= textLength) {
        setDisplayedText(dialogueText.slice(0, currentIndex))
      } else {
        setIsTyping(false)
        if (typingTimerRef.current) {
          clearInterval(typingTimerRef.current)
          typingTimerRef.current = null
        }
      }
    }, speedMs)

    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current)
      }
    }
  }, [currentNodeId, dialogueText])

  // 현재 화자 캐릭터의 이미지 구하기
  const speakerCharacter = useMemo(() => {
    if (!currentNode || !registeredCharacters) return null
    if (currentNode.speakerType !== 'character') return null
    return registeredCharacters.find(c => c.id === currentNode.speaker) || null
  }, [currentNode, registeredCharacters])

  // 프로필 이미지 URL 확인
  const speakerProfileUrl = useMemo(() => {
    if (!speakerCharacter) return null
    
    // 1. profileImageUrl이 직접 셋업되어 있다면 리턴
    if (speakerCharacter.profileImageUrl) return speakerCharacter.profileImageUrl
    
    // 2. 이미지가 등록되어 있다면 첫 번째 이미지 파일 주소를 미디어 링크 형식으로 복구해서 리턴
    if (speakerCharacter.images && speakerCharacter.images.length > 0) {
      const firstImg = speakerCharacter.images[0]
      if (firstImg.url) return firstImg.url
      if (firstImg.fileName) {
        return `media://characters/${speakerCharacter.id}/images/${firstImg.fileName}`
      }
    }
    
    return null
  }, [speakerCharacter])

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

  const blurSourceNode = useMemo(() => {
    if (!currentNode) return null
    if (currentNode.type === 'graphic') return currentNode
    const currentIndex = flatNodes.findIndex((n) => n.id === currentNodeId || n.key === currentNodeId)
    if (currentIndex < 0) return null
    for (let i = currentIndex; i >= 0; i--) {
      if (flatNodes[i]?.type === 'graphic') return flatNodes[i]
    }
    return null
  }, [flatNodes, currentNode, currentNodeId])

  const activeBlurRegions = useMemo(
    () => (activeMedia ? readBlurRegions(blurSourceNode) : []),
    [activeMedia, blurSourceNode],
  )

  // 3채널 오디오: 보이스는 텍스트 노드, BGM/SFX는 사운드 노드가 담당. 그래픽/페이드는 건드리지 않음.
  useEffect(() => {
    if (!currentNode) return

    if (currentNode.type === 'sound') {
      const role: AudioChannel = currentNode.role === 'sfx' ? 'sfx' : 'bgm'
      if (currentNode.stop) {
        stopChannel(role)
        return
      }
      const fileName = typeof currentNode.sound === 'string' ? currentNode.sound.trim() : ''
      if (!fileName) return
      const asset = findMediaAsset(fileName, event.media)
      if (asset) playChannel(role, asset, Boolean(currentNode.loop))
      return
    }

    if (currentNode.type === 'graphic' || currentNode.type === 'fade') return

    if (currentNode.stopVoice !== false) {
      stopChannel('voice')
    }
    if (currentNode.stopBgm === true) {
      stopChannel('bgm')
    }

    const voiceName = resolveVoiceFileName(currentNode)
    if (voiceName) {
      const asset = findMediaAsset(voiceName, event.media)
      if (asset) playChannel('voice', asset, false)
    }
    // 노드 ID·오디오 필드가 바뀔 때만 채널을 다시 건다 (에디터 리렌더로 BGM이 끊기지 않게)
  }, [
    currentNodeId,
    lang,
    currentNode?.type,
    currentNode?.role,
    currentNode?.stop,
    currentNode?.loop,
    currentNode?.sound,
    typeof currentNode?.voice === 'string' ? currentNode.voice : JSON.stringify(currentNode?.voice ?? null),
    currentNode?.stopVoice,
    currentNode?.stopBgm,
    event.media,
  ])

  useEffect(() => {
    for (const channel of Object.values(channelsRef.current)) {
      if (!channel) continue
      if (isPlaying) {
        channel.play().catch(() => {})
      } else {
        channel.pause()
      }
    }
  }, [isPlaying])

  useEffect(() => {
    for (const channel of Object.values(channelsRef.current)) {
      if (channel) channel.volume = audioVolume
    }
  }, [audioVolume])

  // ESC 키로 시뮬레이터 종료, Space/Enter 키로 대사 타이핑 스킵/진행 지원
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        triggerClose()
        return
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        handleBoxClick()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isClosing, isTyping, dialogueText, choices.length])



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

    // 다음으로 진행할 노드가 정말로 실질적인 데이터를 담고 있는지 체크하는 헬퍼
    const hasRealisticContent = (node: any) => {
      if (!node) return false
      if (node.type === 'fade' || node.type === 'graphic' || node.type === 'sound') return true
      // 1. 대사 또는 화자가 있는지 확인
      const text = getLocalizedText(node, event.localization, lang)
      if (text && text.trim()) return true
      
      // 2. 선택지가 있는지 확인
      const nodeChoices = parseNodeChoices(node, event.localization, lang)
      if (nodeChoices && nodeChoices.length > 0) return true
      
      // 3. 새로 지정된 미디어가 있는지 확인
      const img = findNodeImage(node)
      const snd = findNodeSound(node)
      if (img || snd) return true
      
      return false
    }

    // 2. 명시된 포인터가 없으면 플랫 노드 배열 상의 다음 인덱스로 진행
    const currentIndex = flatNodes.findIndex((n) => n.id === currentNodeId || n.key === currentNodeId)
    if (currentIndex >= 0 && currentIndex < flatNodes.length - 1) {
      // 현재 노드 뒤에 남아있는 모든 노드들을 탐색하여 실질적인 콘텐츠가 있는 노드가 남아있는지 검사
      const remainingNodes = flatNodes.slice(currentIndex + 1)
      const hasMoreContent = remainingNodes.some(n => hasRealisticContent(n))

      if (hasMoreContent) {
        const nextNode = flatNodes[currentIndex + 1]
        const nextId = nextNode.id || nextNode.key || ''
        if (nextId) {
          jumpToNode(nextId)
          return
        }
      }
    }

    // 진행할 다음 유의미한 노드가 없음 -> 바로 종료 및 부모 전달
    triggerClose()
  }

  const handleBoxClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (choices.length > 0) return

    if (isTyping) {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current)
        typingTimerRef.current = null
      }
      setDisplayedText(dialogueText)
      setIsTyping(false)
    } else {
      handleNext()
    }
  }

  handleNextRef.current = handleNext

  // 페이드 노드: 오버레이를 재생한 뒤 다음으로 진행
  useEffect(() => {
    if (!isPlaying || playbackFinished || isClosing) return
    if (!currentNode || currentNode.type !== 'fade') return
    if (choices.length > 0) return

    const durationMs = Math.max(80, (Number(currentNode.duration) || 1.2) * 1000)
    const color = typeof currentNode.color === 'string' && currentNode.color ? currentNode.color : '#000000'
    const dir = currentNode.fade === 'in' ? 'in' : 'out'

    setOverlayColor(color)
    setOverlayMs(0)
    setSceneFadeOpacity(dir === 'in' ? 1 : 0)

    const frame = window.requestAnimationFrame(() => {
      setOverlayMs(durationMs)
      setSceneFadeOpacity(dir === 'in' ? 0 : 1)
    })

    const timer = window.setTimeout(() => {
      handleNextRef.current()
    }, durationMs + 40)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [currentNodeId, isPlaying, playbackFinished, isClosing, currentNode, choices.length])

  // 사운드 노드: 채널만 바꾸고 바로 다음으로
  useEffect(() => {
    if (!isPlaying || playbackFinished || isClosing) return
    if (!currentNode || currentNode.type !== 'sound') return
    if (choices.length > 0) return
    const timer = window.setTimeout(() => {
      handleNextRef.current()
    }, 80)
    return () => window.clearTimeout(timer)
  }, [currentNodeId, isPlaying, playbackFinished, isClosing, currentNode, choices.length])

  // 자동 진행 딜레이 타이머
  useEffect(() => {
    if (!isPlaying || playbackFinished) return
    if (!currentNode) return
    if (currentNode.type === 'fade' || currentNode.type === 'sound') return
    if (choices.length > 0) return
    if (isTyping) return

    const delaySec = Number(currentNode.delay)
    if (isNaN(delaySec) || delaySec <= 0) return

    const timer = setTimeout(() => {
      handleBoxClick()
    }, delaySec * 1000)

    return () => clearTimeout(timer)
  }, [currentNodeId, isPlaying, playbackFinished, choices.length, currentNode?.delay, isTyping])

  // 처음부터 다시 시작
  const handleRestart = () => {
    setHistory([])
    const startId = event.startNode || flatNodes[0]?.id || flatNodes[0]?.key || ''
    setCurrentNodeId(startId)
    setPlaybackFinished(false)
    setSceneFadeOpacity(0)
    setOverlayMs(0)
    stopChannel('voice')
    stopChannel('bgm')
    stopChannel('sfx')
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
    <div className={`fixed inset-0 z-50 flex flex-col text-slate-100 font-sans ${
      mode === 'game' ? 'bg-black' : 'bg-slate-950'
    }`}>
      {/* 전체 화면 페이드 (시작: 검정→투명 / 종료: 투명→검정) */}
      <div
        aria-hidden
        className={`fixed inset-0 z-[70] bg-black transition-opacity ease-out ${
          fadeOpacity > 0.02 || isClosing ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        style={{
          opacity: fadeOpacity,
          transitionDuration: `${FADE_MS}ms`,
        }}
      />

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
            onClick={(e) => {
              e.stopPropagation()
              triggerClose()
            }}
            className="rounded-lg bg-indigo-600/15 hover:bg-indigo-600/35 border border-indigo-500/30 px-4 py-1.5 text-sm font-semibold text-indigo-200 transition"
          >
            뒤로가기 [ESC]
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className={`grid min-h-0 flex-1 grid-cols-1 ${
        mode === 'game' ? '' : 'lg:grid-cols-[1fr_380px]'
      }`}>
        {/* Left: Visual Novel Player */}
        <div className="flex flex-col items-center justify-center bg-black/40 p-4 min-h-0 overflow-auto relative">
          <div
            className="relative aspect-video w-full bg-black rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col justify-end"
            style={{ maxWidth: 'min(100%, 94vw, calc(82vh * 16 / 9))' }}
          >
            {/* 1. 미디어 화면 (배경) */}
            <div
              className={`absolute inset-0 z-0 bg-black flex items-center justify-center ${
                isImageNode && !playbackFinished && choices.length === 0
                  ? 'cursor-pointer'
                  : ''
              }`}
              onClick={
                isImageNode && !playbackFinished && choices.length === 0
                  ? () => handleNext()
                  : undefined
              }
            >
              {activeMedia ? (
                activeMedia.kind === 'video' ? (
                  <video
                    src={activeMedia.url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full object-cover pointer-events-none"
                  />
                ) : (
                  <img
                    src={activeMedia.url}
                    alt="Event Background"
                    className="h-full w-full object-cover pointer-events-none"
                  />
                )
              ) : null}
              {activeBlurRegions.length > 0 ? (
                <BlurRegionOverlay regions={activeBlurRegions} />
              ) : null}
            </div>

            {/* 장면 페이드 (페이드 노드) */}
            <div
              aria-hidden
              className="absolute inset-0 z-20 pointer-events-none transition-opacity ease-linear"
              style={{
                opacity: sceneFadeOpacity,
                backgroundColor: overlayColor,
                transitionDuration: `${overlayMs}ms`,
              }}
            />

            {/* LIVE Badge (인게임 방송 연출 느낌용) */}
            <div className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-indigo-400/40 bg-indigo-500/20 px-2.5 py-1 text-[10px] font-bold tracking-wider text-indigo-200">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              EVENT PREVIEW
            </div>

            {/* 현재 재생중인 사운드 뱃지 */}
            {(channelNames.voice || channelNames.bgm || channelNames.sfx) && (
              <div className="absolute top-4 right-4 z-10 flex max-w-[220px] flex-col gap-1 rounded bg-black/60 border border-white/10 px-2 py-1 text-[10px] text-slate-300">
                {channelNames.voice ? <span className="truncate font-mono">VO {channelNames.voice}</span> : null}
                {channelNames.bgm ? <span className="truncate font-mono">BGM {channelNames.bgm}</span> : null}
                {channelNames.sfx ? <span className="truncate font-mono">SFX {channelNames.sfx}</span> : null}
              </div>
            )}

            {/* 2. 대사/선택지 오버레이 영역 — 이미지·페이드 노드는 대화창 숨김 */}
            {(!isImageNode && !isFadeNode && !isSoundNode) || choices.length > 0 || playbackFinished ? (
            <div
              className={`relative z-10 w-full p-4 flex flex-col gap-3 ${
                isImageNode
                  ? ''
                  : 'bg-gradient-to-t from-black via-black/80 to-transparent'
              }`}
            >
              
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

              {!playbackFinished && !isImageNode && !isFadeNode && !isSoundNode && (
                <div
                  onClick={handleBoxClick}
                  className={`w-full bg-slate-950/80 border border-white/10 rounded-2xl p-5 md:p-6 text-left transition select-none flex gap-5 md:gap-6 items-center ${
                    choices.length === 0 ? 'cursor-pointer hover:border-indigo-400/50' : ''
                  }`}
                >
                  {/* 캐릭터 프로필 이미지 (존재할 때만 표시, 플레이어는 자동 스킵) */}
                  {speakerProfileUrl ? (
                    <img
                      src={speakerProfileUrl}
                      alt={characterName}
                      className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border border-white/15 object-cover bg-slate-900 shadow-md shrink-0 transition-transform duration-300 hover:scale-105"
                    />
                  ) : null}

                  {/* 텍스트 내용 및 이름표 (중앙 정렬) */}
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[72px] md:min-h-[96px] text-center">
                    <div className="space-y-2 flex flex-col items-center w-full">
                      {characterName && (
                        <div className="inline-block bg-indigo-600 text-white text-xs md:text-sm font-extrabold px-3 py-1 rounded-lg shadow-md tracking-wide">
                          {characterName}
                        </div>
                      )}
                      <p className="text-[17px] md:text-[20px] leading-relaxed font-bold text-slate-100 break-all text-center w-full px-4">
                        {displayedText || (dialogueText ? '' : <span className="text-slate-500 italic font-normal">(대사 없음 / 연출 노드)</span>)}
                      </p>
                    </div>

                    {/* 마우스 클릭 지시 아이콘 (선택지가 없을 때만 노출) */}
                    {choices.length === 0 && (
                      <div className="self-center text-[10px] md:text-xs font-semibold text-slate-500 animate-pulse flex items-center gap-1.5 mt-3">
                        {isTyping ? (
                          <>클릭하여 전체 보기 <span>▶</span></>
                        ) : (
                          <>클릭하여 다음 노드로 <span>▼</span></>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
            ) : null}
          </div>

          {/* Player controls */}
          {mode !== 'game' && (
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
          )}
        </div>

        {/* Right: Debug Console Panel */}
        {mode !== 'game' && (
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
                      const nodeSnd = findNodeSound(n)

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
                          ) : n.type === 'sound' ? (
                            <p className="mt-1 text-[10px] text-slate-400">
                              {n.stop
                                ? `${n.role === 'sfx' ? '이펙트' : '배경음'} 정지`
                                : `${n.role === 'sfx' ? '이펙트' : '배경음'}${n.loop ? ' 루프' : ''} · ${n.sound || '파일 없음'}`}
                            </p>
                          ) : n.type === 'fade' ? (
                            <p className="mt-1 text-[10px] text-slate-400">
                              페이드 {n.fade === 'in' ? '인' : '아웃'} · {Number(n.duration) || 1.2}초
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
        )}
      </div>
    </div>
  )
}
