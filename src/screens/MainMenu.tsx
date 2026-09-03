import { useMemo, useState } from 'react'
import { useTranslation } from '../locales/i18n'
import { useGameBgm } from '../game/bgm'
import { listSaveMetas } from '../game/saveService'

type MenuId =
  | 'continue'
  | 'new'
  | 'load'
  | 'settings'
  | 'gallery'
  | 'credits'
  | 'exit'
  | 'edit'

const MENU_ITEMS: {
  id: Exclude<MenuId, 'continue' | 'edit'>
  labelKey: string
  subKey?: string
  icon?: 'gear'
}[] = [
  { id: 'new', labelKey: 'menu.newGame' },
  { id: 'load', labelKey: 'menu.loadGame', subKey: 'menu.savedData' },
  { id: 'settings', labelKey: 'menu.settings', icon: 'gear' },
  { id: 'gallery', labelKey: 'menu.gallery' },
  { id: 'credits', labelKey: 'menu.credits' },
  { id: 'exit', labelKey: 'menu.exit' },
]

function GearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[1.1em] w-[1.1em] shrink-0 opacity-80"
      fill="currentColor"
      aria-hidden
    >
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.55-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.82 14.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.39 1.04.7 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.8a.5.5 0 0 0 .5-.42l.36-2.54c.59-.24 1.13-.55 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" />
    </svg>
  )
}

type MainMenuProps = {
  onNewGame: () => void
  onLoadGame: (id?: string) => void
  onOpenEditor?: () => void
}

export function MainMenu({ onNewGame, onLoadGame, onOpenEditor }: MainMenuProps) {
  const { t } = useTranslation()
  const saves = useMemo(() => listSaveMetas(), [])
  const latestSave = saves.length > 0 ? saves[0] : null
  const [active, setActive] = useState<MenuId>(latestSave ? 'continue' : 'new')
  const showEditor = import.meta.env.DEV
  useGameBgm('menu')

  const handleSelect = (id: MenuId) => {
    setActive(id)
    if (id === 'continue' && latestSave) {
      onLoadGame(latestSave.id)
      return
    }
    if (id === 'new') {
      onNewGame()
      return
    }
    if (id === 'load') {
      onLoadGame()
      return
    }
    if (id === 'edit') {
      onOpenEditor?.()
      return
    }
    if (id === 'exit' && window.confirm(t('menu.confirmExit'))) {
      window.close()
    }
  }

  return (
    <main className="game-stage relative flex h-full w-full items-center justify-end overflow-hidden px-[clamp(1rem,2vw,2rem)] pr-[clamp(1.5rem,4vw,4.5rem)]">
      <div
        className="relative z-10 flex flex-col"
        style={{
          width: 'clamp(220px, 16vw + 8vh, 440px)',
          gap: 'clamp(0.85rem, 1.6vh, 1.75rem)',
        }}
      >
        <header className="text-right">
          <p className="game-kicker mb-3">{t('menu.kicker')}</p>
          <h1
            className="game-title leading-[0.9]"
            style={{ fontSize: 'clamp(2.1rem, 2vw + 2.2vh, 5rem)' }}
          >
            STAR
            <span className="mt-[0.15em] block text-[0.58em] tracking-[0.08em] text-indigo-300">
              BROADCASTING CO.
            </span>
          </h1>
          <p
            className="tracking-wide text-slate-400"
            style={{
              marginTop: 'clamp(0.5rem, 1vh, 1rem)',
              fontSize: 'clamp(0.7rem, 0.35vw + 0.55vh, 1rem)',
            }}
          >
            {t('menu.desc')}{' '}
            <span className="text-amber-400">({t('menu.finalVer')})</span>
          </p>
        </header>

        <nav
          className="flex w-full flex-col"
          aria-label={t('menu.ariaMainMenu')}
          style={{ gap: 'clamp(0.4rem, 0.9vh, 0.85rem)' }}
        >
          {latestSave ? (
            <button
              type="button"
              onMouseEnter={() => setActive('continue')}
              onFocus={() => setActive('continue')}
              onClick={() => handleSelect('continue')}
              className={`game-menu-btn text-center ${active === 'continue' ? 'is-active border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.35)]' : ''}`}
              style={{
                padding:
                  'clamp(0.55rem, 1.15vh, 1.15rem) clamp(0.85rem, 1.2vw, 1.5rem)',
                fontSize: 'clamp(0.78rem, 0.45vw + 0.55vh, 1.2rem)',
              }}
            >
              <span className="flex items-center justify-center gap-[0.4em]">
                <span className="font-bold tracking-[0.14em] text-amber-300">
                  [{t('menu.continueGame') || 'CONTINUE'}]
                </span>
              </span>
              <span
                className={`mt-[0.25em] block tracking-[0.12em] ${
                  active === 'continue' ? 'text-indigo-100 font-semibold' : 'text-slate-400'
                }`}
                style={{ fontSize: '0.72em' }}
              >
                {latestSave.companyName} · {latestSave.date}
              </span>
            </button>
          ) : null}

          {MENU_ITEMS.map((item) => {
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setActive(item.id)}
                onFocus={() => setActive(item.id)}
                onClick={() => handleSelect(item.id)}
                className={`game-menu-btn text-center ${isActive ? 'is-active' : ''}`}
                style={{
                  padding:
                    'clamp(0.55rem, 1.15vh, 1.15rem) clamp(0.85rem, 1.2vw, 1.5rem)',
                  fontSize: 'clamp(0.78rem, 0.45vw + 0.55vh, 1.2rem)',
                }}
              >
                <span className="flex items-center justify-center gap-[0.4em]">
                  {item.icon === 'gear' ? <GearIcon /> : null}
                  <span className="font-semibold tracking-[0.12em]">
                    [{t(item.labelKey)}]
                  </span>
                </span>
                {item.id === 'load' && item.subKey ? (
                  <span
                    className={`mt-[0.2em] block tracking-[0.14em] ${
                      isActive ? 'text-indigo-100' : 'text-slate-500'
                    }`}
                    style={{ fontSize: '0.72em' }}
                  >
                    {t(item.subKey)}
                  </span>
                ) : item.subKey ? (
                  <span
                    className={`mt-[0.2em] block tracking-[0.14em] ${
                      isActive ? 'text-indigo-100' : 'text-slate-500'
                    }`}
                    style={{ fontSize: '0.72em' }}
                  >
                    {t(item.subKey)}
                  </span>
                ) : null}
              </button>
            )
          })}

          {showEditor ? (
            <button
              type="button"
              onMouseEnter={() => setActive('edit')}
              onFocus={() => setActive('edit')}
              onClick={() => handleSelect('edit')}
              className={`game-menu-btn mt-2 text-center ${
                active === 'edit' ? 'is-active' : ''
              }`}
              style={{
                padding:
                  'clamp(0.55rem, 1.15vh, 1.15rem) clamp(0.85rem, 1.2vw, 1.5rem)',
                fontSize: 'clamp(0.78rem, 0.45vw + 0.55vh, 1.2rem)',
              }}
            >
              <span className="font-semibold tracking-[0.12em]">[{t('menu.edit')}]</span>
              <span
                className={`mt-[0.2em] block tracking-[0.14em] ${
                  active === 'edit' ? 'text-indigo-100' : 'text-amber-400/90'
                }`}
                style={{ fontSize: '0.72em' }}
              >
                ({t('menu.devOnly')})
              </span>
            </button>
          ) : null}
        </nav>
      </div>

      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-[clamp(1.5rem,3vw,2.5rem)] py-[clamp(1rem,2.2vh,2rem)] text-[clamp(0.65rem,0.3vw+0.5vh,0.9rem)] text-slate-500">
        <span className="tracking-[0.12em]">v1.0 (FINAL VER.)</span>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-indigo-400/30 bg-indigo-500/10 text-[10px] font-bold text-indigo-300"
            aria-hidden
          >
            A
          </span>
          <span
            className="font-semibold tracking-[0.18em] text-slate-200"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(0.85rem, 0.4vw + 0.6vh, 1.15rem)',
            }}
          >
            AURA STUDIOS
          </span>
        </div>
      </footer>
    </main>
  )
}
