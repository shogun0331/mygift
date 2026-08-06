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
            className="game-panel flex flex-col gap-3 rounded-2xl p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/10 text-xl">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    {item.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {item.bonusLabel}{' '}
                    <span className={item.bonusValue > 0 ? 'text-indigo-300' : 'text-slate-500'}>
                      +{item.bonusValue}%
                    </span>
                  </p>
                </div>
              </div>

              <span
                className={`rounded-lg border px-2 py-1 text-xs font-bold ${
                  item.level > 0
                    ? 'border-indigo-400/30 bg-indigo-500/15 text-indigo-200'
                    : 'border-white/10 bg-black/20 text-slate-400'
                }`}
              >
                +{item.level}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleUpgrade(item.id)}
              className="game-btn mt-auto w-full rounded-xl px-3 py-2 text-sm"
            >
              강화: {formatCost(item.upgradeCost)}원
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}
