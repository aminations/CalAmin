import { ACCENT_PRESETS } from '../types'

interface DayColorRowProps {
  value: string | undefined
  onChange: (color?: string) => void
}

export default function DayColorRow({ value, onChange }: DayColorRowProps) {
  return (
    <div className="day-colors" role="radiogroup" aria-label="Day color">
      <button
        className="day-color-btn"
        role="radio"
        aria-checked={!value}
        aria-label="No color"
        onClick={() => onChange(undefined)}
      >
        <span
          className="day-color-dot none"
          style={
            !value ? { boxShadow: '0 0 0 2px var(--surface), 0 0 0 3px var(--text-muted)' } : undefined
          }
        >
          ✕
        </span>
      </button>
      {ACCENT_PRESETS.map((c) => (
        <button
          key={c}
          className="day-color-btn"
          role="radio"
          aria-checked={value === c}
          aria-label={'Day color ' + c}
          onClick={() => onChange(c)}
        >
          <span
            className="day-color-dot"
            style={{
              backgroundColor: c,
              boxShadow: value === c ? `0 0 0 2px var(--surface), 0 0 0 3px ${c}` : undefined,
            }}
          ></span>
        </button>
      ))}
    </div>
  )
}
