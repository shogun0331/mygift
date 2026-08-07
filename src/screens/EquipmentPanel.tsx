import { useState } from 'react'
import { useTranslation } from '../locales/i18n'

type Equipment = {
  id: string
  icon: string
  level: number
  bonusKey: string
  bonusValue: number
  upgradeCost: number
}

const INITIAL_EQUIPMENT: Equipment[] = [
  {
    id: 'camera',
    icon: '📷',
    level: 2,
    bonusKey: 'revenue',
    bonusValue: 10,
    upgradeCost: 500_000,
  },
  {
    id: 'light',
    icon: '💡',
    level: 1,
    bonusKey: 'popularity',
    bonusValue: 5,
    upgradeCost: 300_000,
  },
  {
    id: 'mic',
    icon: '🎙️',
    level: 0,
    bonusKey: 'loyalty',
    bonusValue: 0,
    upgradeCost: 200_000,
  },
  {
    id: 'pc',
    icon: '💻',
    level: 0,
    bonusKey: 'revenue',
    bonusValue: 0,
    upgradeCost: 1_000_000,
  },
  {
    id: 'internet',
    icon: '🌐',
    level: 0,
    bonusKey: 'revenue',
    bonusValue: 0,
    upgradeCost: 300_000,
  },
  {
    id: 'set',
    icon: '🎨',
    level: 0,
    bonusKey: 'popularity',
    bonusValue: 0,
    upgradeCost: 500_000,
  },
  {
    id: 'studio_expansion',
    icon: '🏗️',
    level: 0,
    bonusKey: 'slots',
    bonusValue: 0,
    upgradeCost: 5_000_000,
  },
]

function formatCost(value: number) {
  return value.toLocaleString('ko-KR')
}

type EquipmentPanelProps = {
  onUpgradeStudio?: () => void
}

export function EquipmentPanel({ onUpgradeStudio }: EquipmentPanelProps) {
  const { t } = useTranslation()
  const [items, setItems] = useState(INITIAL_EQUIPMENT)

  const handleUpgrade = (id: string) => {
    if (id === 'studio_expansion' && onUpgradeStudio) {
      onUpgradeStudio()
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item

        const delta = item.id === 'studio_expansion'
          ? 1
          : (item.id === 'light' || item.id === 'set' ? 5 : 10)

        return {
          ...item,
          level: item.level + 1,
          bonusValue: item.bonusValue + delta,
          upgradeCost: Math.round(item.upgradeCost * 1.5),
        }
      }),
    )
  }

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const bonusDelta = item.id === 'studio_expansion'
            ? 1
            : (item.id === 'light' || item.id === 'set' ? 5 : 10)
          const nextBonusValue = item.bonusValue + bonusDelta

          return (
            <article
              key={item.id}
              className="neon-glow-card rounded-2xl p-4 bg-slate-950/40 backdrop-blur-md grid grid-cols-[1fr_auto] gap-4 items-center"
            >
              {/* 좌측: 장비 상세 정보 */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-indigo-500/25 bg-[radial-gradient(circle_at_center,rgba(124,77,255,0.25),transparent_70%)] bg-slate-950/60 text-2xl shadow-[inset_0_0_8px_rgba(124,77,255,0.15)] relative">
                  <div className="absolute top-1 left-1.5 text-[8px] text-slate-700/60 select-none pointer-events-none font-mono">+</div>
                  <span className="relative z-10">{item.icon}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-100 truncate">
                      {t(`equipment.${item.id}`)}
                    </h3>
                    <span
                      className={`rounded-md border px-1.5 py-0.2 text-[9px] font-black tracking-wider transition-all shrink-0 ${
                        item.level > 0
                          ? 'border-pink-500/40 bg-pink-500/10 text-pink-300 neon-text-pink shadow-[0_0_8px_rgba(255,42,116,0.15)]'
                          : 'border-white/5 bg-black/40 text-slate-600'
                      }`}
                    >
                      {item.level > 0 ? `LV +${item.level}` : 'LV 0'}
                    </span>
                  </div>

                  {/* 스탯 비교 연출 */}
                  <div className="mt-1.5 flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-xs">
                    <span className="text-slate-500 font-semibold">{t(`equipment.${item.bonusKey}`)}</span>
                    <span className="text-slate-400 font-medium">{item.bonusValue}%</span>
                    <span className="text-pink-500/60 font-black">➔</span>
                    <span className="text-cyan-300 font-bold animate-pulse" style={{ textShadow: '0 0 8px rgba(0, 245, 255, 0.4)' }}>
                      +{nextBonusValue}%
                    </span>
                    <span className="text-[9px] text-pink-300 font-bold bg-pink-950/50 border border-pink-500/20 px-1 rounded-sm">
                      ▲{bonusDelta}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 우측: 컴팩트한 강화 액션 버튼 */}
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => handleUpgrade(item.id)}
                  className="game-btn-pink rounded-xl px-4 py-2 text-xs font-black tracking-wider transition-all hover:scale-[1.03] active:scale-[0.98] flex flex-col items-center justify-center gap-0.5"
                  style={{
                    boxShadow: '0 4px 14px rgba(255, 42, 116, 0.25)',
                    minWidth: '120px',
                    height: '46px'
                  }}
                >
                  <span className="text-[9px] text-pink-200 tracking-widest font-semibold uppercase">{t('equipment.upgrade')}</span>
                  <span className="text-[11px] font-extrabold text-white">₩{formatCost(item.upgradeCost)}</span>
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
