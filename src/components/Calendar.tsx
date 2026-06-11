import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { CalendarData, MonthView, Settings } from '../types'
import { MONTH_NAMES, WEEKDAYS, addMonths, buildGrid, ymOf } from '../lib/dates'
import DateCell from './DateCell'
import MonthYearPicker from './MonthYearPicker'

interface CalendarProps {
  view: MonthView
  selected: string
  todayKey: string
  data: CalendarData
  gcalDays: ReadonlySet<string>
  settings: Settings
  settingsOpen: boolean
  topPanel?: ReactNode
  onSelect: (key: string) => void
  onViewChange: (view: MonthView) => void
  onToday: () => void
  onToggleSettings: () => void
}

export default function Calendar({
  view,
  selected,
  todayKey,
  data,
  gcalDays,
  settings,
  settingsOpen,
  topPanel,
  onSelect,
  onViewChange,
  onToday,
  onToggleSettings,
}: CalendarProps) {
  const [jumpOpen, setJumpOpen] = useState(false)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [slideFrom, setSlideFrom] = useState<'left' | 'right' | null>(null)
  const touchRef = useRef<{ x: number; y: number; axis: 'h' | 'v' | null } | null>(null)
  const accent = settings.accent

  const goMonth = (delta: number) => {
    setSlideFrom(delta > 0 ? 'right' : 'left')
    onViewChange(addMonths(view, delta))
  }
  const weekStartsMonday = settings.weekStart === 'Monday'
  const now = new Date()

  const grid = useMemo(
    () => buildGrid(view.y, view.m, weekStartsMonday),
    [view.y, view.m, weekStartsMonday],
  )
  const weekdays = weekStartsMonday ? [...WEEKDAYS.slice(1), WEEKDAYS[0]] : [...WEEKDAYS]

  return (
    <>
      <header className="cal-header">
        <div className="cal-title-wrap">
          <button
            className={'cal-title-btn' + (jumpOpen ? ' open' : '')}
            title="Jump to any month"
            aria-expanded={jumpOpen}
            onClick={() => setJumpOpen((v) => !v)}
          >
            <h1 className="cal-title">
              {MONTH_NAMES[view.m]} <span className="cal-year">{view.y}</span>
            </h1>
            <span className="cal-title-caret">▾</span>
          </button>
          {(view.y !== now.getFullYear() || view.m !== now.getMonth()) && (
            <button className="today-btn" style={{ color: accent }} onClick={onToday}>
              Today
            </button>
          )}
        </div>
        <div className="cal-nav">
          <button className="nav-btn" aria-label="Previous month" onClick={() => goMonth(-1)}>
            ‹
          </button>
          <button className="nav-btn" aria-label="Next month" onClick={() => goMonth(1)}>
            ›
          </button>
          <button
            className="nav-btn gear"
            aria-label="Settings"
            aria-expanded={settingsOpen}
            style={settingsOpen ? { color: accent } : undefined}
            onClick={onToggleSettings}
          >
            ⚙︎
          </button>
        </div>
      </header>

      {jumpOpen && (
        <MonthYearPicker
          view={view}
          accent={accent}
          onPick={(y, m) => onViewChange({ y, m })}
          onClose={() => setJumpOpen(false)}
        />
      )}

      {topPanel}

      <div className="weekday-row">
        {weekdays.map((w) => (
          <div
            key={w}
            className={
              'weekday' +
              (settings.weekendTint && (w === 'Sun' || w === 'Sat') ? (w === 'Sun' ? ' sun' : ' sat') : '')
            }
          >
            {w}
          </div>
        ))}
      </div>

      <div
        key={ymOf(view)}
        className={'date-grid' + (slideFrom ? ' slide-from-' + slideFrom : '')}
        role="grid"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 0.18s ease',
        }}
        onAnimationEnd={() => setSlideFrom(null)}
        onTouchStart={(e) => {
          const t = e.touches[0]
          touchRef.current = { x: t.clientX, y: t.clientY, axis: null }
          setDragging(true)
        }}
        onTouchMove={(e) => {
          const s = touchRef.current
          if (!s) return
          const t = e.touches[0]
          const dx = t.clientX - s.x
          const dy = t.clientY - s.y
          // lock to one axis early so vertical scrolling never drags the grid
          if (!s.axis) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
            s.axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
          }
          if (s.axis === 'h') setDragX(dx * 0.5)
        }}
        onTouchEnd={(e) => {
          const s = touchRef.current
          touchRef.current = null
          setDragging(false)
          setDragX(0)
          if (!s || s.axis !== 'h') return
          const dx = e.changedTouches[0].clientX - s.x
          if (Math.abs(dx) > 56) goMonth(dx < 0 ? 1 : -1)
        }}
        onTouchCancel={() => {
          touchRef.current = null
          setDragging(false)
          setDragX(0)
        }}
      >
        {grid.map((cell) => (
          <DateCell
            key={cell.key}
            cell={cell}
            entry={data[cell.key]}
            isToday={cell.key === todayKey}
            isSelected={cell.key === selected}
            accent={accent}
            weekendTint={settings.weekendTint}
            hasGcal={gcalDays.has(cell.key)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </>
  )
}
