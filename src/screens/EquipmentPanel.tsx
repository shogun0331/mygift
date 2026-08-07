import { useState } from 'react'

type Equipment = {
  id: string
  name: string
  icon: string
  level: number
  bonusLabel: string
  bonusValue: number
  upgradeCost: number
}

const INITIAL_EQUIPMENT: Equipment[] = [
  {
    id: 'camera',
    name: '카메라',
    icon: '📷',
    level: 2,
    bonusLabel: '수익',
    bonusValue: 10,
    upgradeCost: 500_000,
  },
  {
    id: 'light',
    name: '조명',
    icon: '💡',
    level: 1,
    bonusLabel: '인기',
    bonusValue: 5,
    upgradeCost: 300_000,
  },
  {
    id: 'mic',
    name: '마이크',
    icon: '🎙️',
    level: 0,
    bonusLabel: '충성도',
    bonusValue: 0,
    upgradeCost: 200_000,
  },
  {
    id: 'pc',
    name: 'PC',
    icon: '💻',
    level: 0,
    bonusLabel: '수익',
    bonusValue: 0,
    upgradeCost: 1_000_000,
  },
  {
    id: 'internet',
    name: '인터넷',
    icon: '🌐',
    level: 0,
    bonusLabel: '수익',
    bonusValue: 0,
    upgradeCost: 300_000,
  },
  {
    id: 'set',
    name: '배경/세트',
    icon: '🎨',
    level: 0,
    bonusLabel: '인기',
    bonusValue: 0,
    upgradeCost: 500_000,
  },
]

function formatCost(value: number) {
  return value.toLocaleString('ko-KR')
}

export function EquipmentPanel() {
  const [items, setItems] = useState(INITIAL_EQUIPMENT)

  const handleUpgrade = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        return {
          ...item,
          level: item.level + 1,
          bonusValue: item.bonusValue + (item.id === 'light' || item.id === 'set' ? 5 : 10),
          upgradeCost: Math.round(item.upgradeCost * 1.4),
        }
      }),
    )
  }

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <article
            key={item.id}
            className="neon-glow-card flex flex-col gap-4 rounded-2xl p-4.5 bg-slate-950/40 backdrop-blur-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-500/25 bg-[radial-gradient(circle_at_center,rgba(124,77,255,0.25),transparent_70%)] bg-slate-950/60 text-2xl shadow-[inset_0_0_8px_rgba(124,77,255,0.15)] relative">
                  <div className="absolute top-1 left-1.5 text-[8px] text-slate-700/60 select-none pointer-events-none font-mono">+</div>
                  <span className="relative z-10">{item.icon}</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    {item.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {item.bonusLabel}{' '}
                    <span
                      className={item.bonusValue > 0 ? 'text-cyan-300 font-bold' : 'text-slate-600'}
                      style={{ textShadow: item.bonusValue > 0 ? '0 0 8px rgba(0, 245, 255, 0.45)' : 'none' }}
                    >
                      +{item.bonusValue}%
                    </span>
                  </p>
                </div>
              </div>

              <span
                className={`rounded-lg border px-2 py-0.5 text-[10px] font-black tracking-wider transition-all ${
                  item.level > 0
                    ? 'border-pink-500/40 bg-pink-500/10 text-pink-300 neon-text-pink shadow-[0_0_8px_rgba(255,42,116,0.15)]'
                    : 'border-white/5 bg-black/40 text-slate-600'
                }`}
              >
                {item.level > 0 ? `LV +${item.level}` : 'LV 0'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleUpgrade(item.id)}
              className="game-btn-pink mt-auto w-full rounded-xl px-3 py-2.5 text-xs font-extrabold tracking-wider transition-all hover:scale-[1.01]"
              style={{ boxShadow: '0 4px 15px rgba(255, 42, 116, 0.25)' }}
            >
              ⚡ 강화 : {formatCost(item.upgradeCost)}원
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}
