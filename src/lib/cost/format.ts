/** Format USD without scientific notation. */
export function formatUsd(n: number, digits = 4): string {
  if (!Number.isFinite(n)) return '$0'
  if (n === 0) return '$0'
  if (n >= 1) return `$${n.toFixed(2)}`
  if (n >= 0.01) return `$${n.toFixed(digits)}`
  // Small amounts: fixed decimals, trim trailing zeros (never use e-notation)
  const fixed = n.toFixed(10)
  const trimmed = fixed.replace(/0+$/, '').replace(/\.$/, '')
  return `$${trimmed}`
}

/** Exact USD for breakdowns — always enough decimals to show the full value. */
export function formatUsdExact(n: number): string {
  if (!Number.isFinite(n)) return '$0'
  if (n === 0) return '$0.00000000'
  if (n >= 1) return `$${n.toFixed(4)}`
  return `$${n.toFixed(8)}`
}

export function formatTokens(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}

/** Full calendar date for day-level rows (e.g. Saturday, July 4, 2026). */
export function formatFullDate(isoDate: string): string {
  try {
    const d = isoDate.includes('T') ? new Date(isoDate) : new Date(`${isoDate}T12:00:00`)
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return isoDate
  }
}

/** Simple arithmetic line: (tokens / 1,000,000) × $rate = $cost */
export function formatTokenCostMath(tokens: number, unitPricePer1M: number, costUsd: number): string {
  return `(${formatTokens(tokens)} ÷ 1,000,000) × $${unitPricePer1M} = ${formatUsdExact(costUsd)}`
}
