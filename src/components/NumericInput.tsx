import { useEffect, useState } from 'react'

export type QuickPreset = {
  label: string
  amount: number | 'reset'
}

type NumericInputProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
  placeholder?: string
  quickPresets?: QuickPreset[]
  unitLabel?: string
}

export function NumericInput({
  value,
  onChange,
  min = 0,
  max,
  className = 'w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400/50',
  placeholder,
  quickPresets,
  unitLabel,
}: NumericInputProps) {
  const [inputValue, setInputValue] = useState<string>(String(value ?? 0))
  const [isFocused, setIsFocused] = useState(false)

  // Sync internal input string when external value changes from outside (if not active editing)
  useEffect(() => {
    if (!isFocused) {
      setInputValue(String(value ?? 0))
    }
  }, [value, isFocused])

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawStr = e.target.value
    setInputValue(rawStr)

    // Parse clean digits
    if (rawStr.trim() === '' || rawStr === '-') {
      onChange(min)
      return
    }

    const parsed = parseInt(rawStr, 10)
    if (!isNaN(parsed)) {
      let clamped = Math.max(min, parsed)
      if (max != null) {
        clamped = Math.min(max, clamped)
      }
      onChange(clamped)
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
    let parsed = parseInt(inputValue, 10)
    if (isNaN(parsed)) {
      parsed = min
    }
    let clamped = Math.max(min, parsed)
    if (max != null) {
      clamped = Math.min(max, clamped)
    }
    onChange(clamped)
    setInputValue(String(clamped))
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const applyPreset = (amount: number | 'reset') => {
    let nextVal = 0
    if (amount === 'reset') {
      nextVal = min
    } else {
      nextVal = (value || 0) + amount
    }
    let clamped = Math.max(min, nextVal)
    if (max != null) {
      clamped = Math.min(max, clamped)
    }
    onChange(clamped)
    setInputValue(String(clamped))
  }

  return (
    <div className="space-y-1.5">
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className={className}
          value={inputValue}
          onChange={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
        />
        {unitLabel ? (
          <span className="pointer-events-none absolute right-3 text-xs text-slate-500">
            {unitLabel}
          </span>
        ) : null}
      </div>

      {quickPresets && quickPresets.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {quickPresets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyPreset(preset.amount)}
              className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300 transition hover:border-indigo-400/40 hover:bg-indigo-500/20 active:scale-95"
            >
              {preset.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
