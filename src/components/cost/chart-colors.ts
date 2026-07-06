/** Evenly spaced HSL colors — unique for any series length. */
export function chartColor(index: number, total = 1): string {
  const n = Math.max(total, index + 1)
  const hue = (index * (360 / n)) % 360
  const sat = 68 + (index % 3) * 6
  const light = 48 + (index % 2) * 5
  return `hsl(${Math.round(hue)} ${sat}% ${light}%)`
}

export function chartColors(count: number): string[] {
  return Array.from({ length: count }, (_, i) => chartColor(i, count))
}
