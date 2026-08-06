import { useState } from 'react'

type EditorTab = 'character'

type EditorScreenProps = {
  onBack: () => void
}

export function EditorScreen({ onBack }: EditorScreenProps) {
  const [tab, setTab] = useState<EditorTab>('character')

  return (
    <main className="game-stage fixed inset-0 grid h-dvh grid-rows-[auto_1fr] overflow-hidden">
      <header className="game-hud z-20 flex shrink-0 items-center justify-between px-6 py-3">
        <div>
          <p className="game-kicker">DEV ONLY</p>
          <h1 className="game-title mt-1 text-2xl">EDITOR</h1>
        </div>
        <button type="button" onClick={onBack} className="game-btn px-4 py-2 text-sm">
          뒤로가기
        </button>
      </header>

      <div className="grid min-h-0 grid-cols-[240px_1fr]">
        {/* Left sidebar */}
        <aside className="game-dock z-10 flex min-h-0 flex-col gap-2 border-r border-indigo-500/15 px-3 py-4">
          <p className="game-stat-label px-2 mb-1">메뉴</p>
          <button
            type="button"
            onClick={() => setTab('character')}
            className={`game-btn-tab flex w-full items-center justify-start rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
              tab === 'character' ? 'is-active' : ''
            }`}
          >
            캐릭터 관리
          </button>
        </aside>

        {/* Main panel */}
        <section className="relative z-10 min-h-0 overflow-auto p-6">
          {tab === 'character' ? (
            <div className="game-panel rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-slate-100">캐릭터 관리</h2>
              <p className="mt-2 text-sm text-slate-400">
                캐릭터 편집 기능을 여기에 구성합니다.
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}
