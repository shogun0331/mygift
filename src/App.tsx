import { useState } from 'react'
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

  function handleRegisterCharacter(payload: AddCharacterPayload) {
    const profile =
      payload.profileImageId != null
        ? payload.images.find((image) => image.id === payload.profileImageId)
        : null
    const profileImageUrl = profile ? URL.createObjectURL(profile.file) : null

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
      }),
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
