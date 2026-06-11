/**
 * One day's annotations. `c` is an optional highlight color for the date cell;
 * `gId` is the mirrored Google event id when push sync is on.
 */
export interface DayEntry {
  e: string[]
  n: string
  c?: string
  gId?: string
}

export type CalendarData = Record<string, DayEntry>

export interface MonthView {
  y: number
  m: number
}

export type WeekStart = 'Sunday' | 'Monday'
export type CellSize = 'compact' | 'regular' | 'tall'

export interface Settings {
  accent: string
  weekStart: WeekStart
  weekendTint: boolean
  cellSize: CellSize
  googleConnected: boolean
  pushEnabled: boolean
}

export const ACCENT_PRESETS = ['#7CA8D8', '#8FBA9B', '#A99BD6', '#E5A98C'] as const

/** A Google Calendar event, reduced to what the overlay needs. */
export interface GcalEvent {
  id: string
  title: string
  /** RFC3339 dateTime, or YYYY-MM-DD when allDay. */
  start: string
  end: string
  allDay: boolean
}
