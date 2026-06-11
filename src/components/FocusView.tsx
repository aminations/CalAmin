import { useEffect, useState } from 'react'
import type { DayEntry } from '../types'
import { labelOf } from '../lib/dates'
import EmojiPicker from './EmojiPicker'
import DayColorRow from './DayColorRow'

interface FocusViewProps {
  dateKey: string
  entry: DayEntry | undefined
  accent: string
  onClose: () => void
  onAddEmoji: (emoji: string) => void
  onRemoveEmoji: (index: number) => void
  onNoteChange: (note: string) => void
  onColorChange: (color?: string) => void
}

export default function FocusView({
  dateKey,
  entry,
  accent,
  onClose,
  onAddEmoji,
  onRemoveEmoji,
  onNoteChange,
  onColorChange,
}: FocusViewProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const emojis = entry?.e ?? []

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="focus-overlay" role="dialog" aria-modal="true" aria-label="Day editor">
      <div className="focus-inner">
        <header className="focus-head">
          <h2 className="focus-date">{labelOf(dateKey)}</h2>
          <button className="nav-btn" aria-label="Close full screen" onClick={onClose}>
            ✕
          </button>
        </header>

        <DayColorRow value={entry?.c} onChange={onColorChange} />

        <div className="emoji-chips focus-chips">
          {emojis.map((e, i) => (
            <button key={e + i} className="emoji-chip" title="Tap to remove" onClick={() => onRemoveEmoji(i)}>
              <span className="emoji-chip-glyph">{e}</span>
              <span className="emoji-chip-x">✕</span>
            </button>
          ))}
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

        {pickerOpen && (
          <EmojiPicker accent={accent} onPick={onAddEmoji} onClose={() => setPickerOpen(false)} />
        )}

        <textarea
          className="note-input focus-note"
          value={entry?.n ?? ''}
          placeholder="Please tap here to edit note"
          onChange={(ev) => onNoteChange(ev.target.value)}
        ></textarea>
      </div>
    </div>
  )
}
