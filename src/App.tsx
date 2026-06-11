import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarData, DayEntry, MonthView, Settings } from './types'
import { parseKey, todayKey } from './lib/dates'
import { loadData, saveData } from './lib/storage'
import { loadSettings, saveSettings } from './lib/settings'
import { useGoogleCalendar } from './google/useGoogleCalendar'
import Calendar from './components/Calendar'
import DetailSection from './components/DetailSection'
import FocusView from './components/FocusView'
import SettingsPanel from './components/Settings'

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  // Apply the theme to <html> so the body background follows; track the
  // system preference live while in auto mode.
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'auto' && mql.matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? '#15171C' : '#7CA8D8')
    }
    apply()
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [settings.theme])

  const tKey = todayKey()
  const today = parseKey(tKey)
  const [view, setView] = useState<MonthView>({ y: today.y, m: today.m })
  const [selected, setSelected] = useState<string>(tKey)
  const [data, setData] = useState<CalendarData>(loadData)
  const dataRef = useRef(data)
  dataRef.current = data
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [focusOpen, setFocusOpen] = useState(false)
  const lastTapRef = useRef<{ key: string; t: number } | null>(null)

  const google = useGoogleCalendar({ view, settings, updateSettings, dataRef, setData })

  const update = (key: string, fn: (cur: DayEntry) => DayEntry) => {
    const prev = dataRef.current
    const prevGId = prev[key]?.gId
    const entry = fn(prev[key] ?? { e: [], n: '' })
    const next = { ...prev }
    if (entry.e.length === 0 && !entry.n.trim() && !entry.c) {
      delete next[key]
    } else {
      next[key] = entry
    }
    saveData(next)
    setData(next)
    google.entryChanged(key, prevGId)
  }

  const selectDate = (key: string) => {
    const last = lastTapRef.current
    lastTapRef.current = { key, t: Date.now() }
    setSelected(key)
    const { y, m } = parseKey(key)
    if (y !== view.y || m !== view.m) setView({ y, m })
    // double-tap (or double-click) the same day → full-screen editor
    if (last && last.key === key && Date.now() - last.t < 400) setFocusOpen(true)
  }

  const setDayColor = (key: string, color?: string) =>
    update(key, (cur) => {
      const next = { ...cur }
      if (color) next.c = color
      else delete next.c
      return next
    })

  const goToday = () => {
    setView({ y: today.y, m: today.m })
    setSelected(tKey)
  }

  const gcalDays = useMemo(
    () => new Set(Object.keys(google.eventsByDay)),
    [google.eventsByDay],
  )

  return (
    <div className={'app density-' + settings.cellSize}>
      <Calendar
        view={view}
        selected={selected}
        todayKey={tKey}
        data={data}
        gcalDays={gcalDays}
        settings={settings}
        settingsOpen={settingsOpen}
        topPanel={
          settingsOpen ? (
            <SettingsPanel settings={settings} onChange={updateSettings} google={google.controls} />
          ) : undefined
        }
        onSelect={selectDate}
        onViewChange={setView}
        onToday={goToday}
        onToggleSettings={() => setSettingsOpen((v) => !v)}
      />

      <DetailSection
        dateKey={selected}
        entry={data[selected]}
        accent={settings.accent}
        googleEvents={google.eventsByDay[selected] ?? []}
        onAddEmoji={(e) => update(selected, (cur) => ({ ...cur, e: [...cur.e, e] }))}
        onRemoveEmoji={(i) => update(selected, (cur) => ({ ...cur, e: cur.e.filter((_, j) => j !== i) }))}
        onNoteChange={(n) => update(selected, (cur) => ({ ...cur, n }))}
        onColorChange={(c) => setDayColor(selected, c)}
        onExpand={() => setFocusOpen(true)}
      />

      {focusOpen && (
        <FocusView
          dateKey={selected}
          entry={data[selected]}
          accent={settings.accent}
          onClose={() => setFocusOpen(false)}
          onAddEmoji={(e) => update(selected, (cur) => ({ ...cur, e: [...cur.e, e] }))}
          onRemoveEmoji={(i) => update(selected, (cur) => ({ ...cur, e: cur.e.filter((_, j) => j !== i) }))}
          onNoteChange={(n) => update(selected, (cur) => ({ ...cur, n }))}
          onColorChange={(c) => setDayColor(selected, c)}
        />
      )}
    </div>
  )
}
