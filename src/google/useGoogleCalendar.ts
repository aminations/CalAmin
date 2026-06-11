// Google Calendar sync hook: read-only month overlay (pull) plus optional
// mirroring of local entries to a dedicated "Shift Planner" calendar (push).
// Local data is the source of truth; the app never touches events it didn't create.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { CalendarData, GcalEvent, MonthView, Settings } from '../types'
import { addDaysKey, buildGrid, dayKeyOfDate, parseKey, ymOf } from '../lib/dates'
import { saveData } from '../lib/storage'
import {
  clearCalendarId,
  clearGoogleStorage,
  loadCalendarId,
  loadMonthCache,
  loadQueue,
  saveCalendarId,
  saveMonthCache,
  saveQueue,
} from '../lib/gcalStore'
import type { QueuedPush } from '../lib/gcalStore'
import { hasClientId, requestToken, revokeToken, SCOPE_READONLY, SCOPES_WRITE } from './auth'
import {
  GcalError,
  deleteEvent,
  findOrCreateShiftCalendar,
  insertEvent,
  listMonthEvents,
  patchEvent,
} from './api'
import type { EventBody } from './api'

const DEBOUNCE_MS = 2000
const CACHE_TTL_MS = 5 * 60_000

export interface GoogleControls {
  available: boolean
  connected: boolean
  busy: boolean
  error: string | null
  pending: number
  connect: () => void
  disconnect: () => void
  setPush: (on: boolean) => void
}

export interface GoogleCalendarSync {
  eventsByDay: Record<string, GcalEvent[]>
  controls: GoogleControls
  entryChanged: (key: string, prevGId?: string) => void
}

interface Args {
  view: MonthView
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
  dataRef: MutableRefObject<CalendarData>
  setData: Dispatch<SetStateAction<CalendarData>>
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function useGoogleCalendar({ view, settings, updateSettings, dataRef, setData }: Args): GoogleCalendarSync {
  const [connected, setConnected] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [months, setMonths] = useState<Record<string, GcalEvent[]>>({})
  const [pending, setPending] = useState(() => Object.keys(loadQueue()).length)

  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const viewRef = useRef(view)
  viewRef.current = view
  const queueRef = useRef<Record<string, QueuedPush>>(loadQueue())
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const flushingRef = useRef(new Set<string>())

  const scopeNeeded = () => (settingsRef.current.pushEnabled ? SCOPES_WRITE : SCOPE_READONLY)

  const setQueue = (q: Record<string, QueuedPush>) => {
    queueRef.current = q
    saveQueue(q)
    setPending(Object.keys(q).length)
  }

  const showCached = useCallback((v: MonthView) => {
    const ym = ymOf(v)
    const cached = loadMonthCache(ym)
    if (cached) setMonths((prev) => ({ ...prev, [ym]: cached.events }))
    return cached
  }, [])

  // ---- pull: events for the visible month ----
  const loadMonth = useCallback(
    async (v: MonthView, force: boolean) => {
      const cached = showCached(v)
      if (!navigator.onLine) return
      if (cached && !force && Date.now() - cached.at < CACHE_TTL_MS) return
      try {
        const token = await requestToken(scopeNeeded(), false)
        // Fetch the whole visible grid so adjacent-month edge days get dots too.
        const grid = buildGrid(v.y, v.m, settingsRef.current.weekStart === 'Monday')
        const toIso = (k: string) => {
          const { y, m, d } = parseKey(k)
          return new Date(y, m, d).toISOString()
        }
        const timeMin = toIso(grid[0].key)
        const timeMax = toIso(addDaysKey(grid[grid.length - 1].key, 1))
        const events = await listMonthEvents(token, 'primary', timeMin, timeMax)
        const ym = ymOf(v)
        saveMonthCache(ym, events)
        setMonths((prev) => ({ ...prev, [ym]: events }))
        setConnected(true)
        setError(null)
      } catch (e) {
        setError('Google Calendar: ' + message(e))
      }
    },
    [showCached],
  )

  // ---- push: mirror an entry to the Shift Planner calendar ----
  const ensureCalendar = async (token: string): Promise<string> => {
    const cached = loadCalendarId()
    if (cached) return cached
    const id = await findOrCreateShiftCalendar(token)
    saveCalendarId(id)
    return id
  }

  const writeGId = (key: string, gId: string) => {
    const cur = dataRef.current
    const entry = cur[key]
    if (!entry) return
    const next = { ...cur, [key]: { ...entry, gId } }
    saveData(next)
    setData(next)
  }

  const flushKey = useCallback(
    async (key: string): Promise<void> => {
      const op = queueRef.current[key]
      if (!op || !navigator.onLine || flushingRef.current.has(key)) return
      flushingRef.current.add(key)
      try {
        const token = await requestToken(SCOPES_WRITE, false)
        const calId = await ensureCalendar(token)
        const entry = dataRef.current[key]
        const hasContent = !!entry && (entry.e.length > 0 || entry.n.trim().length > 0)

        if (hasContent) {
          const firstLine = entry.n.trim().split('\n')[0].trim()
          const body: EventBody = {
            summary: [entry.e.join(''), firstLine].filter(Boolean).join(' ') || 'Planner note',
            description: entry.n,
            start: { date: key },
            end: { date: addDaysKey(key, 1) },
          }
          const existing = entry.gId ?? op.gId
          if (existing) {
            try {
              await patchEvent(token, calId, existing, body)
              if (!entry.gId) writeGId(key, existing)
            } catch (e) {
              if (e instanceof GcalError && (e.status === 404 || e.status === 410)) {
                const id = await insertEvent(token, calId, body)
                writeGId(key, id)
              } else {
                throw e
              }
            }
          } else {
            const id = await insertEvent(token, calId, body)
            if (dataRef.current[key]) writeGId(key, id)
            else await deleteEvent(token, calId, id) // entry was cleared mid-flight
          }
        } else if (op.gId) {
          await deleteEvent(token, calId, op.gId)
        }

        const rest = { ...queueRef.current }
        delete rest[key]
        setQueue(rest)
        setError(null)
      } catch (e) {
        // A vanished calendar id means "Shift Planner" was deleted — recreate next time.
        if (e instanceof GcalError && e.status === 404) clearCalendarId()
        setError('Google sync: ' + message(e))
      } finally {
        flushingRef.current.delete(key)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const flushQueue = useCallback(async () => {
    for (const key of Object.keys(queueRef.current)) {
      await flushKey(key)
    }
  }, [flushKey])

  const entryChanged = useCallback(
    (key: string, prevGId?: string) => {
      if (!settingsRef.current.pushEnabled) return
      const existing = queueRef.current[key]
      const gId = prevGId ?? existing?.gId
      setQueue({ ...queueRef.current, [key]: gId !== undefined ? { key, gId } : { key } })
      const timers = timersRef.current
      const t = timers.get(key)
      if (t) clearTimeout(t)
      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key)
          void flushKey(key)
        }, DEBOUNCE_MS),
      )
    },
    [flushKey],
  )

  // Silent reconnect on launch if the user connected before.
  useEffect(() => {
    if (!hasClientId() || !settingsRef.current.googleConnected) return
    let cancelled = false
    void (async () => {
      try {
        await requestToken(scopeNeeded(), false)
        if (cancelled) return
        setConnected(true)
        if (settingsRef.current.pushEnabled) void flushQueue()
      } catch {
        if (!cancelled) {
          showCached(viewRef.current)
          setError('Google Calendar: reconnect from Settings')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [flushQueue, showCached])

  // Pull the visible month whenever it changes (cache-first, refetch if stale).
  useEffect(() => {
    if (!settings.googleConnected || !hasClientId()) return
    void loadMonth(view, false)
  }, [settings.googleConnected, view.y, view.m, connected, loadMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  // Coming back online: refresh the overlay and drain the push queue.
  useEffect(() => {
    const onOnline = () => {
      if (settingsRef.current.googleConnected) void loadMonth(viewRef.current, true)
      if (settingsRef.current.pushEnabled) void flushQueue()
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [loadMonth, flushQueue])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const t of timers.values()) clearTimeout(t)
      timers.clear()
    }
  }, [])

  const connect = useCallback(() => {
    setBusy(true)
    setError(null)
    void (async () => {
      try {
        await requestToken(scopeNeeded(), true)
        updateSettings({ googleConnected: true })
        setConnected(true)
        void loadMonth(viewRef.current, true)
        if (settingsRef.current.pushEnabled) void flushQueue()
      } catch (e) {
        setError('Google Calendar: ' + message(e))
      } finally {
        setBusy(false)
      }
    })()
  }, [loadMonth, flushQueue, updateSettings])

  const disconnect = useCallback(() => {
    void (async () => {
      try {
        await revokeToken()
      } catch {
        // token may already be invalid — clear local state regardless
      }
      clearGoogleStorage()
      queueRef.current = {}
      for (const t of timersRef.current.values()) clearTimeout(t)
      timersRef.current.clear()
      setPending(0)
      setMonths({})
      setConnected(false)
      setError(null)
      updateSettings({ googleConnected: false, pushEnabled: false })
    })()
  }, [updateSettings])

  const setPush = useCallback(
    (on: boolean) => {
      if (!on) {
        updateSettings({ pushEnabled: false })
        return
      }
      setBusy(true)
      setError(null)
      void (async () => {
        try {
          await requestToken(SCOPES_WRITE, true)
          updateSettings({ pushEnabled: true, googleConnected: true })
          setConnected(true)
          void flushQueue()
        } catch (e) {
          setError('Google Calendar: ' + message(e))
        } finally {
          setBusy(false)
        }
      })()
    },
    [flushQueue, updateSettings],
  )

  const ym = ymOf(view)
  const monthEvents = months[ym]
  const eventsByDay = useMemo(() => {
    const map: Record<string, GcalEvent[]> = {}
    for (const ev of monthEvents ?? []) {
      if (ev.allDay) {
        let k = ev.start
        for (let i = 0; i < 62 && k < ev.end; i++) {
          ;(map[k] ??= []).push(ev)
          k = addDaysKey(k, 1)
        }
      } else {
        const k = dayKeyOfDate(new Date(ev.start))
        ;(map[k] ??= []).push(ev)
      }
    }
    return map
  }, [monthEvents])

  return {
    eventsByDay,
    entryChanged,
    controls: {
      available: hasClientId(),
      connected,
      busy,
      error,
      pending,
      connect,
      disconnect,
      setPush,
    },
  }
}
