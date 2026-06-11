// Thin fetch wrappers over the Google Calendar REST API (no gapi client).
import type { GcalEvent } from '../types'

const BASE = 'https://www.googleapis.com/calendar/v3'

export const SHIFT_CALENDAR_NAME = 'Shift Planner'

export class GcalError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'GcalError'
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

async function call<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
  if (res.status === 204) return undefined as T
  const json: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    if (isRecord(json) && isRecord(json.error) && typeof json.error.message === 'string') {
      message = json.error.message
    }
    throw new GcalError(res.status, message)
  }
  return json as T
}

interface RawEventTime {
  date?: string
  dateTime?: string
}

interface RawEvent {
  id?: string
  status?: string
  summary?: string
  start?: RawEventTime
  end?: RawEventTime
}

interface EventsPage {
  items?: RawEvent[]
  nextPageToken?: string
}

export async function listMonthEvents(
  token: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<GcalEvent[]> {
  const out: GcalEvent[] = []
  let pageToken: string | undefined
  do {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    })
    if (pageToken) params.set('pageToken', pageToken)
    const page = await call<EventsPage>(
      token,
      `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    )
    for (const it of page.items ?? []) {
      if (!it.id || it.status === 'cancelled') continue
      const start = it.start?.dateTime ?? it.start?.date
      const end = it.end?.dateTime ?? it.end?.date
      if (!start || !end) continue
      out.push({
        id: it.id,
        title: it.summary?.trim() || '(No title)',
        start,
        end,
        allDay: Boolean(it.start?.date),
      })
    }
    pageToken = page.nextPageToken
  } while (pageToken)
  return out
}

export async function findOrCreateShiftCalendar(token: string): Promise<string> {
  interface CalListPage {
    items?: { id?: string; summary?: string }[]
    nextPageToken?: string
  }
  let pageToken: string | undefined
  do {
    const params = new URLSearchParams({ minAccessRole: 'owner', maxResults: '250' })
    if (pageToken) params.set('pageToken', pageToken)
    const page = await call<CalListPage>(token, `/users/me/calendarList?${params.toString()}`)
    for (const it of page.items ?? []) {
      if (it.id && it.summary === SHIFT_CALENDAR_NAME) return it.id
    }
    pageToken = page.nextPageToken
  } while (pageToken)

  const created = await call<{ id?: string }>(token, '/calendars', {
    method: 'POST',
    body: JSON.stringify({ summary: SHIFT_CALENDAR_NAME }),
  })
  if (!created.id) throw new GcalError(500, 'calendar creation returned no id')
  return created.id
}

export interface EventBody {
  summary: string
  description: string
  start: { date: string }
  end: { date: string }
}

export async function insertEvent(token: string, calendarId: string, body: EventBody): Promise<string> {
  const created = await call<{ id?: string }>(
    token,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  if (!created.id) throw new GcalError(500, 'event creation returned no id')
  return created.id
}

export async function patchEvent(
  token: string,
  calendarId: string,
  eventId: string,
  body: EventBody,
): Promise<void> {
  await call<unknown>(
    token,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
}

export async function deleteEvent(token: string, calendarId: string, eventId: string): Promise<void> {
  try {
    await call<unknown>(
      token,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: 'DELETE' },
    )
  } catch (e) {
    // Already gone — that's the outcome we wanted.
    if (e instanceof GcalError && (e.status === 404 || e.status === 410)) return
    throw e
  }
}
