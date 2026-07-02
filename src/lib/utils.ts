import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso))
}

export function formatRelative(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(iso)
}

/** Normalize a date-ish string to YYYY-MM-DD, or undefined if unparseable. */
export function normalizeIsoDate(value?: string | null): string | undefined {
  if (!value) return undefined
  const d = new Date(value)
  if (isNaN(d.getTime())) return undefined
  return d.toISOString().slice(0, 10)
}

/** Whole-day span between two ISO dates, or null if either is missing/invalid. */
export function daysBetween(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  if (isNaN(s) || isNaN(e)) return null
  return Math.round((e - s) / 86400000)
}

/** Days remaining until (positive) or overdue past (negative) an ISO date. */
export function daysUntilDue(end?: string | null): number | null {
  if (!end) return null
  const e = new Date(end).getTime()
  if (isNaN(e)) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((e - today.getTime()) / 86400000)
}

/** Human-readable span, e.g. "Jan 5, 2026 – Mar 1, 2026". */
export function formatTimelineSpan(start?: string | null, end?: string | null): string {
  if (!start && !end) return '—'
  if (start && !end) return `${formatDate(start)} –`
  if (!start && end) return `– ${formatDate(end)}`
  return `${formatDate(start!)} – ${formatDate(end!)}`
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n) + '…' : str
}

/** Strip HTML tags for plain-text previews. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  )
}

/** Time only, e.g. "2:30 PM" */
export function formatChatTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

/** Date label for chat dividers: Today, Yesterday, or "Jun 5, 2025" */
export function formatChatDateLabel(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (sameDay(d, today)) return 'Today'
  if (sameDay(d, yesterday)) return 'Yesterday'
  return formatDate(d)
}

/** Full timestamp for tooltips */
export function formatChatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}
