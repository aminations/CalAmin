import type { GcalEvent } from '../types'

const CACHE_KEY = 'calendar-planner-gcal-cache-v1'
const CAL_ID_KEY = 'calendar-planner-gcal-calendar-id-v1'
const QUEUE_KEY = 'calendar-planner-push-queue-v1'

export interface MonthCache {
  at: number
  events: GcalEvent[]
}

/** A pending push for one date. `gId` is the event to update/delete, if known. */
export interface QueuedPush {
  key: string
  gId?: string
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as unknown) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function parseEvent(v: unknown): GcalEvent | null {
  if (!isRecord(v)) return null
  const { id, title, start, end, allDay } = v
  if (
    typeof id !== 'string' ||
    typeof title !== 'string' ||
    typeof start !== 'string' ||
    typeof end !== 'string'
  ) {
    return null
  }
  return { id, title, start, end, allDay: allDay === true }
}

export function loadMonthCache(ym: string): MonthCache | null {
  const all = readJson(CACHE_KEY)
  if (!isRecord(all)) return null
  const m = all[ym]
  if (!isRecord(m) || typeof m.at !== 'number' || !Array.isArray(m.events)) return null
  return {
    at: m.at,
    events: m.events.map(parseEvent).filter((e): e is GcalEvent => e !== null),
  }
}

export function saveMonthCache(ym: string, events: GcalEvent[]): void {
  const all = readJson(CACHE_KEY)
  const next: Record<string, unknown> = isRecord(all) ? all : {}
  next[ym] = { at: Date.now(), events }
  writeJson(CACHE_KEY, next)
}

export function loadCalendarId(): string | null {
  const v = readJson(CAL_ID_KEY)
  return typeof v === 'string' && v.length > 0 ? v : null
}

export function saveCalendarId(id: string): void {
  writeJson(CAL_ID_KEY, id)
}

export function clearCalendarId(): void {
  try {
    localStorage.removeItem(CAL_ID_KEY)
  } catch {
    // ignore
  }
}

export function loadQueue(): Record<string, QueuedPush> {
  const v = readJson(QUEUE_KEY)
  if (!isRecord(v)) return {}
  const out: Record<string, QueuedPush> = {}
  for (const [key, op] of Object.entries(v)) {
    if (!isRecord(op)) continue
    const gId = typeof op.gId === 'string' ? op.gId : undefined
    out[key] = gId !== undefined ? { key, gId } : { key }
  }
  return out
}

export function saveQueue(queue: Record<string, QueuedPush>): void {
  writeJson(QUEUE_KEY, queue)
}

export function clearGoogleStorage(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
    localStorage.removeItem(CAL_ID_KEY)
    localStorage.removeItem(QUEUE_KEY)
  } catch {
    // ignore
  }
}
