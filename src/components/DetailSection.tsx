import { useEffect, useState } from 'react'
import type { DayEntry, GcalEvent } from '../types'
import { labelOf } from '../lib/dates'
import EmojiPicker from './EmojiPicker'
import DayColorRow from './DayColorRow'

function timeLabel(ev: GcalEvent): string {
  if (ev.allDay) return 'All day'
  const fmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${fmt.format(new Date(ev.start))} – ${fmt.format(new Date(ev.end))}`
}

interface DetailSectionProps {
  dateKey: string
  entry: DayEntry | undefined
  accent: string
  googleEvents: GcalEvent[]
  onAddEmoji: (emoji: string) => void
  onRemoveEmoji: (index: number) => void
  onNoteChange: (note: string) => void
  onColorChange: (color?: string) => void
  onExpand: () => void
}

export default function DetailSection({
  dateKey,
  entry,
  accent,
  googleEvents,
  onAddEmoji,
  onRemoveEmoji,
  onNoteChange,
  onColorChange,
  onExpand,
}: DetailSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const emojis = entry?.e ?? []
  const note = entry?.n ?? ''

  useEffect(() => {
    setPickerOpen(false)
  }, [dateKey])

  return (
    <section className="detail" aria-label="Selected date details">
      <div className="detail-head">
        <h2 className="detail-date">{labelOf(dateKey)}</h2>
        <div className="detail-actions">
          <button className="icon-btn" aria-label="Open full screen" title="Full screen" onClick={onExpand}>
            ⤢
          </button>
          <button
            className="add-emoji-btn"
            aria-label={pickerOpen ? 'Close emoji picker' : 'Add emoji'}
            style={{ color: accent, borderColor: accent + '55' }}
            onClick={() => setPickerOpen((v) => !v)}
          >
            <span className="add-emoji-plus">{pickerOpen ? '✕' : '+'}</span>
            <span className="add-emoji-smiley">☺︎</span>
          </button>
        </div>
      </div>

      <DayColorRow value={entry?.c} onChange={onColorChange} />

      {emojis.length > 0 && (
        <div className="emoji-chips">
          {emojis.map((e, i) => (
            <button key={e + i} className="emoji-chip" title="Tap to remove" onClick={() => onRemoveEmoji(i)}>
              <span className="emoji-chip-glyph">{e}</span>
              <span className="emoji-chip-x">✕</span>
            </button>
          ))}
        </div>
      )}

      {pickerOpen && (
        <EmojiPicker accent={accent} onPick={onAddEmoji} onClose={() => setPickerOpen(false)} />
      )}

      <textarea
        className="note-input"
        value={note}
        placeholder="Please tap here to edit note"
        rows={3}
        onChange={(ev) => onNoteChange(ev.target.value)}
      ></textarea>

      {googleEvents.length > 0 && (
        <div className="gcal-list" aria-label="Google Calendar events">
          <div className="emoji-section-label">Google Calendar</div>
          {googleEvents.map((ev) => (
            <div key={ev.id} className="gcal-event">
              <span className="gcal-event-dot"></span>
              <span className="gcal-event-title">{ev.title}</span>
              <span className="gcal-event-time">{timeLabel(ev)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
