export function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100)
}

export function compact(n: number): string {
  return new Intl.NumberFormat("en-US").format(n)
}

export function pct(part: number, whole: number): number {
  if (!whole) return 0
  return Math.min(100, (part / whole) * 100)
}
