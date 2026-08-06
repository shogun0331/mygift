import { useState } from 'react'
import { BroadcastScene } from './screens/BroadcastScene'
import { EditorScreen } from './screens/EditorScreen'
import { InGame } from './screens/InGame'
import { MainMenu } from './screens/MainMenu'

type Screen = 'main' | 'game' | 'broadcast' | 'editor'

export default function App() {
  const [screen, setScreen] = useState<Screen>('main')

  if (screen === 'broadcast') {
    return <BroadcastScene onEnd={() => setScreen('game')} />
  }

  if (screen === 'editor') {
    return <EditorScreen onBack={() => setScreen('main')} />
  }

  if (screen === 'game') {
    return (
      <InGame
        onBack={() => setScreen('main')}
        onStartBroadcast={() => setScreen('broadcast')}
      />
    )
  }

  return (
    <MainMenu
      onNewGame={() => setScreen('game')}
      onOpenEditor={() => setScreen('editor')}
    />
  )
}
