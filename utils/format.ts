export const COMPANY_PALETTE = [
  '#f0b429',
  '#37b6c9',
  '#e06b4f',
  '#6b8cf0',
  '#d95fa6',
  '#6fc45f',
  '#a878e0',
  '#d8d2c2'
]

export function hashString(input: string): number {
  let hash = 2166136261
  for (const char of input) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function companyColor(name: string | null | undefined): string {
  return COMPANY_PALETTE[hashString(name || '') % COMPANY_PALETTE.length]!
}

export function shortId(id: string | null | undefined): string {
  return id ? id.slice(0, 8) : '—'
}

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })
}

export function formatDecimal(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return Number(value).toFixed(digits)
}

export function cargoTotal(cargo: Record<string, number> | null | undefined): number {
  return Object.values(cargo || {}).reduce((sum, units) => sum + units, 0)
}

export function formatTime(value: string | number | Date | null | undefined): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString()
}

export function shipStatus(order: { type: string; to_system?: string; ticks_left?: number } | null, docked: boolean) {
  if (!order) return docked ? { kind: 'docked', label: 'docked' } : { kind: 'idle', label: 'idle' }
  switch (order.type) {
    case 'move':
      return { kind: 'transit', label: `moving · ${order.ticks_left ?? '?'}t` }
    case 'travel':
      return { kind: 'transit', label: `→ ${order.to_system} · ${order.ticks_left ?? '?'}t` }
    case 'mine':
      return { kind: 'mining', label: 'mining' }
    case 'sell':
      return { kind: 'busy', label: 'selling' }
    case 'buy':
      return { kind: 'busy', label: 'buying' }
    default:
      return { kind: 'busy', label: order.type }
  }
}
