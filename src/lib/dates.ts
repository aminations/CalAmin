import type { MonthView } from '../types'

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function keyOf(y: number, m: number, d: number): string {
  return y + '-' + pad2(m + 1) + '-' + pad2(d)
}

export function dayKeyOfDate(dt: Date): string {
  return keyOf(dt.getFullYear(), dt.getMonth(), dt.getDate())
}

export function todayKey(): string {
  return dayKeyOfDate(new Date())
}

export function parseKey(k: string): { y: number; m: number; d: number } {
  const [y, m, d] = k.split('-').map(Number)
  return { y, m: m - 1, d }
}

export function labelOf(k: string): string {
  const { y, m, d } = parseKey(k)
  const dow = WEEKDAYS[new Date(y, m, d).getDay()]
  return m + 1 + '/' + d + ' (' + dow + ')'
}

export function addDaysKey(key: string, days: number): string {
  const { y, m, d } = parseKey(key)
  return dayKeyOfDate(new Date(y, m, d + days))
}

export function addMonths(view: MonthView, delta: number): MonthView {
  const dt = new Date(view.y, view.m + delta, 1)
  return { y: dt.getFullYear(), m: dt.getMonth() }
}

export function ymOf(view: MonthView): string {
  return view.y + '-' + pad2(view.m + 1)
}

export interface GridCell {
  key: string
  day: number
  dow: number
  inMonth: boolean
}

/** Build a 7xN grid of cells for a given month, padded to full weeks. */
export function buildGrid(year: number, month: number, weekStartsMonday: boolean): GridCell[] {
  const first = new Date(year, month, 1)
  let lead = first.getDay() - (weekStartsMonday ? 1 : 0)
  if (lead < 0) lead += 7
  const cells: GridCell[] = []
  const start = new Date(year, month, 1 - lead)
  const total = Math.ceil((lead + new Date(year, month + 1, 0).getDate()) / 7) * 7
  for (let i = 0; i < total; i++) {
    const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    cells.push({
      key: dayKeyOfDate(dt),
      day: dt.getDate(),
      dow: dt.getDay(),
      inMonth: dt.getMonth() === month,
    })
  }
  return cells
}
