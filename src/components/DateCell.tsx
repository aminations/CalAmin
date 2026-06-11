import type { CSSProperties } from 'react'
import type { DayEntry } from '../types'
import type { GridCell } from '../lib/dates'

interface DateCellProps {
  cell: GridCell
  entry: DayEntry | undefined
  isToday: boolean
  isSelected: boolean
  accent: string
  weekendTint: boolean
  hasGcal: boolean
  onSelect: (key: string) => void
}

export default function DateCell({
  cell,
  entry,
  isToday,
  isSelected,
  accent,
  weekendTint,
  hasGcal,
  onSelect,
}: DateCellProps) {
  const emojis = entry?.e ?? []
  const hasNote = Boolean(entry?.n.trim())
  const cls = ['date-cell']
  if (!cell.inMonth) cls.push('out-month')
  if (isToday) cls.push('today')
  if (isSelected) cls.push('selected')
  if (weekendTint && (cell.dow === 0 || cell.dow === 6)) cls.push(cell.dow === 0 ? 'sun' : 'sat')

  const style: CSSProperties = {}
  if (isSelected) style.boxShadow = 'inset 0 0 0 2px ' + accent
  if (entry?.c) style.backgroundColor = entry.c + '2e'
  else if (isToday) style.backgroundColor = accent + '1f'

  return (
    <button
      className={cls.join(' ')}
      style={style}
      onClick={() => onSelect(cell.key)}
      aria-label={cell.key}
      aria-pressed={isSelected}
    >
      <span className="cell-day" style={isToday ? { backgroundColor: accent, color: '#fff' } : undefined}>
        {cell.day}
      </span>
      <span className="cell-emojis">
        {emojis.slice(0, 3).map((e, i) => (
          <span key={i} className="cell-emoji">
            {e}
          </span>
        ))}
        {emojis.length > 3 && <span className="cell-more">+{emojis.length - 3}</span>}
      </span>
      {(hasNote || hasGcal) && (
        <span className="cell-dots">
          {hasNote && <span className="cell-note-dot" style={{ backgroundColor: accent }}></span>}
          {hasGcal && <span className="cell-gcal-dot"></span>}
        </span>
      )}
    </button>
  )
}
