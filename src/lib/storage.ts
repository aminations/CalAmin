import type { CalendarData, DayEntry } from '../types'

const DATA_KEY = 'calendar-planner-data-v1'
const RECENTS_KEY = 'calendar-planner-recent-emojis-v1'
const MAX_RECENTS = 16

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function parseEntry(v: unknown): DayEntry | null {
  if (!isRecord(v)) return null
  const entry: DayEntry = {
    e: Array.isArray(v.e) ? v.e.filter((x): x is string => typeof x === 'string') : [],
    n: typeof v.n === 'string' ? v.n : '',
  }
  if (typeof v.c === 'string' && v.c.startsWith('#')) entry.c = v.c
  if (typeof v.gId === 'string') entry.gId = v.gId
  return entry
}

/** Parse the persisted data blob. Tolerates the legacy `{e, n}` shape and junk values. */
export function parseData(raw: string | null): CalendarData {
  if (!raw) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (!isRecord(parsed)) return {}
  const out: CalendarData = {}
  for (const [key, value] of Object.entries(parsed)) {
    const entry = parseEntry(value)
    if (entry) out[key] = entry
  }
  return out
}

export function loadData(): CalendarData {
  try {
    return parseData(localStorage.getItem(DATA_KEY))
  } catch {
    return {}
  }
}

export function saveData(data: CalendarData): void {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data))
  } catch {
    // storage unavailable/full — keep working in memory
  }
}

export function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY)
    if (!raw) return []
    const arr: unknown = JSON.parse(raw)
    return Array.isArray(arr)
      ? arr.filter((x): x is string => typeof x === 'string').slice(0, MAX_RECENTS)
      : []
  } catch {
    return []
  }
}

export function clearRecents(): void {
  try {
    localStorage.removeItem(RECENTS_KEY)
  } catch {
    // ignore
  }
}

export function pushRecent(emoji: string): string[] {
  const next = [emoji, ...loadRecents().filter((e) => e !== emoji)].slice(0, MAX_RECENTS)
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
  return next
}
