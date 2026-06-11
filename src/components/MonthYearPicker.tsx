import { useState } from 'react'
import type { MonthView } from '../types'
import { MONTH_NAMES } from '../lib/dates'

interface MonthYearPickerProps {
  view: MonthView
  accent: string
  onPick: (y: number, m: number) => void
  onClose: () => void
}

export default function MonthYearPicker({ view, accent, onPick, onClose }: MonthYearPickerProps) {
  const [year, setYear] = useState(view.y)
  const now = new Date()
  return (
    <div className="my-picker" role="dialog" aria-label="Jump to month">
      <div className="my-picker-year">
        <button className="nav-btn small" aria-label="Previous year" onClick={() => setYear((y) => y - 1)}>
          ‹
        </button>
        <span className="my-picker-year-label">{year}</span>
        <button className="nav-btn small" aria-label="Next year" onClick={() => setYear((y) => y + 1)}>
          ›
        </button>
      </div>
      <div className="my-picker-grid">
        {MONTH_NAMES.map((name, m) => {
          const isCurrent = year === now.getFullYear() && m === now.getMonth()
          const isViewed = year === view.y && m === view.m
          return (
            <button
              key={name}
              className={'my-picker-month' + (isViewed ? ' viewed' : '')}
              style={
                isViewed
                  ? { backgroundColor: accent, color: '#fff' }
                  : isCurrent
                    ? { color: accent, fontWeight: 800 }
                    : undefined
              }
              onClick={() => {
                onPick(year, m)
                onClose()
              }}
            >
              {name.slice(0, 3)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
