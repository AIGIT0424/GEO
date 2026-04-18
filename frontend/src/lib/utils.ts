import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function fmtUsd(n: number | null | undefined): string {
  if (n == null) return '—'
  return `$${fmt(n)}`
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${fmt(n)}%`
}

export function fmtK(n: number | null | undefined): string {
  if (n == null) return '—'
  if (Math.abs(n) >= 1_000_000) return `${fmt(n / 1_000_000, 1)}M`
  if (Math.abs(n) >= 1_000) return `${fmt(n / 1_000, 1)}K`
  return String(n)
}

/** ACoS colour class: <20% good, 20-35% warn, >35% bad */
export function acosClass(acos: number | null | undefined): string {
  if (acos == null) return 'text-muted-foreground'
  if (acos < 20) return 'acos-good'
  if (acos < 35) return 'acos-warn'
  return 'acos-bad'
}

export function roasClass(roas: number | null | undefined): string {
  if (roas == null) return 'text-muted-foreground'
  return roas >= 3 ? 'roas-good' : roas >= 1.5 ? 'acos-warn' : 'acos-bad'
}

export function opportunityColor(score: number): { bg: string; text: string } {
  if (score >= 0.7) return { bg: 'bg-emerald-100', text: 'text-emerald-700' }
  if (score >= 0.4) return { bg: 'bg-amber-100', text: 'text-amber-700' }
  return { bg: 'bg-red-100', text: 'text-red-700' }
}
