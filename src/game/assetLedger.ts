const XOR_MASK = 0x5a3c19e7
const XOR_BASE = 0x100000000

export type AssetLedger = {
  slots: [number, number, number, number, number]
  committed: number
}

function encodeSlot(amount: number, index: number): number {
  switch (index) {
    case 0:
      return amount - 100
    case 1:
      return amount + 200
    case 2:
      return amount * 3 + 7
    case 3: {
      const hi = Math.trunc(amount / XOR_BASE)
      const lo = amount - hi * XOR_BASE
      return hi * XOR_BASE + ((lo ^ XOR_MASK) >>> 0)
    }
    default:
      return (amount + 17) * 2 - 9
  }
}

function decodeSlot(stored: number, index: number): number | null {
  if (!Number.isFinite(stored)) return null
  let raw: number
  switch (index) {
    case 0:
      raw = stored + 100
      break
    case 1:
      raw = stored - 200
      break
    case 2:
      raw = (stored - 7) / 3
      break
    case 3: {
      const hi = Math.trunc(stored / XOR_BASE)
      const lo = stored - hi * XOR_BASE
      raw = hi * XOR_BASE + ((lo ^ XOR_MASK) >>> 0)
      break
    }
    default:
      raw = (stored + 9) / 2 - 17
      break
  }
  if (!Number.isFinite(raw)) return null
  const rounded = Math.round(raw)
  if (Math.abs(raw - rounded) > 1e-6) return null
  return rounded
}

function fillLedger(ledger: AssetLedger, amount: number) {
  const next = Math.round(amount)
  ledger.committed = next
  ledger.slots = [
    encodeSlot(next, 0),
    encodeSlot(next, 1),
    encodeSlot(next, 2),
    encodeSlot(next, 3),
    encodeSlot(next, 4),
  ]
  return next
}

export function createAssetLedger(amount: number): AssetLedger {
  const ledger: AssetLedger = {
    slots: [0, 0, 0, 0, 0],
    committed: 0,
  }
  fillLedger(ledger, Number.isFinite(amount) ? amount : 0)
  return ledger
}

/** 5칸을 역산해 다수 금액을 확정하고, 어긋난 칸은 그 금액으로 다시 맞춘다. */
export function readAssetLedger(ledger: AssetLedger): number {
  const counts = new Map<number, number>()
  for (let index = 0; index < ledger.slots.length; index += 1) {
    const value = decodeSlot(ledger.slots[index] ?? Number.NaN, index)
    if (value == null) continue
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  let bestValue = ledger.committed
  let bestCount = 0
  let tie = false
  for (const [value, count] of counts) {
    if (count > bestCount) {
      bestValue = value
      bestCount = count
      tie = false
    } else if (count === bestCount) {
      tie = true
    }
  }

  const chosen = tie || bestCount === 0 ? ledger.committed : bestValue
  const aligned =
    ledger.committed === chosen &&
    ledger.slots.every((slot, index) => slot === encodeSlot(chosen, index))
  if (!aligned) fillLedger(ledger, chosen)
  return chosen
}

export function writeAssetLedger(ledger: AssetLedger, amount: number): number {
  if (!Number.isFinite(amount)) return readAssetLedger(ledger)
  return fillLedger(ledger, amount)
}
