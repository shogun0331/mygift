import { useState, useEffect } from 'react'
import { saveEvents, loadEvents, saveCharacters, loadCharacters } from './events/db'
import type { GameEvent } from './events/types'
import {
  createRegisteredCharacter,
  scoutCharacter,
  type OwnedCreator,
  type RegisteredCharacter,
} from './game/characters'
import type { AddCharacterPayload } from './screens/EditorScreen'
import { BroadcastScene } from './screens/BroadcastScene'
import { EditorScreen } from './screens/EditorScreen'
import { InGame } from './screens/InGame'
import { MainMenu } from './screens/MainMenu'

type Screen = 'main' | 'game' | 'broadcast' | 'editor'

export default function App() {
  const [screen, setScreen] = useState<Screen>('main')
  /** 에디터에 등록된 캐릭터 (스카우트 풀) */
  const [registeredCharacters, setRegisteredCharacters] = useState<RegisteredCharacter[]>([])
  /** 인게임 보유 크리에이터 — 새 게임 시작 시 비움 */
  const [ownedCreators, setOwnedCreators] = useState<OwnedCreator[]>([])
  /** 에디터 등록 이벤트 상태 (App 단으로 Lift up) */
  const [events, setEvents] = useState<GameEvent[]>([])

  // 1. 최초 마운트 시 데이터 로드
  useEffect(() => {
    loadEvents()
      .then((loaded) => setEvents(loaded))
      .catch((err) => console.error('Failed to load events:', err))

    loadCharacters()
      .then((records) => {
        const chars = records.map((r) => {
          const c = r.character
          c.profileBlob = r.profileBlob || undefined
          if (r.profileBlob) {
            c.profileImageUrl = URL.createObjectURL(r.profileBlob)
          }
          return c
        })
        setRegisteredCharacters(chars)
      })
      .catch((err) => console.error('Failed to load characters:', err))
  }, [])

  // 2. 이벤트 상태 변경 시 자동 저장
  useEffect(() => {
    saveEvents(events).catch((err) => console.error('Failed to save events:', err))
  }, [events])

  // 3. 캐릭터 상태 변경 시 자동 저장
  useEffect(() => {
    const records = registeredCharacters.map((c) => ({
      id: c.id,
      character: c,
      profileBlob: c.profileBlob || null,
    }))
    saveCharacters(records).catch((err) => console.error('Failed to save characters:', err))
  }, [registeredCharacters])

  function handleRegisterCharacter(payload: AddCharacterPayload) {
    const profile =
      payload.profileImageId != null
        ? payload.images.find((image) => image.id === payload.profileImageId)
        : null
    const profileImageUrl = profile ? URL.createObjectURL(profile.file) : null
    const profileBlob = profile ? profile.file : null

    setRegisteredCharacters((prev) => [
      ...prev,
      createRegisteredCharacter({
        name: payload.name,
        age: payload.age,
        job: payload.job,
        bust: payload.bust,
        weight: payload.weight,
        eventLinks: payload.eventLinks,
        profileImageUrl,
        profileBlob,
      } as any),
    ])
  }

  function handleScout(character: RegisteredCharacter) {
    setOwnedCreators((prev) => {
      if (prev.some((c) => c.id === character.id)) return prev
      return [...prev, scoutCharacter(character)]
    })
  }

  function startNewGame() {
    setOwnedCreators([])
    setScreen('game')
  }

  if (screen === 'broadcast') {
    return <BroadcastScene onEnd={() => setScreen('game')} />
  }

  if (screen === 'editor') {
    return (
      <EditorScreen
        registeredCharacters={registeredCharacters}
        onRegisterCharacter={handleRegisterCharacter}
        events={events}
        onEventsChange={setEvents}
        onBack={() => setScreen('main')}
      />
    )
  }

  if (screen === 'game') {
    return (
      <InGame
        registeredCharacters={registeredCharacters}
        ownedCreators={ownedCreators}
        onScout={handleScout}
        onBack={() => setScreen('main')}
        onStartBroadcast={() => setScreen('broadcast')}
      />
    )
  }

  return (
    <MainMenu
      onNewGame={startNewGame}
      onOpenEditor={() => setScreen('editor')}
    />
  )
}
