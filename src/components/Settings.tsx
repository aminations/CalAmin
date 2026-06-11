import type { Settings } from '../types'
import { ACCENT_PRESETS } from '../types'
import type { GoogleControls } from '../google/useGoogleCalendar'

function Seg<T extends string>({
  options,
  value,
  accent,
  onPick,
  labels,
}: {
  options: readonly T[]
  value: T
  accent: string
  onPick: (v: T) => void
  labels?: Partial<Record<T, string>>
}) {
  return (
    <div className="seg" role="radiogroup">
      {options.map((o) => (
        <button
          key={o}
          role="radio"
          aria-checked={o === value}
          className="seg-btn"
          style={o === value ? { backgroundColor: accent, color: '#fff' } : undefined}
          onClick={() => onPick(o)}
        >
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  )
}

interface SettingsPanelProps {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  google: GoogleControls
}

export default function SettingsPanel({ settings, onChange, google }: SettingsPanelProps) {
  const accent = settings.accent
  return (
    <div className="settings-card" role="dialog" aria-label="Settings">
      <div className="settings-section">Theme</div>
      <div className="settings-row">
        <span className="settings-label">Accent</span>
        <div className="swatch-row">
          {ACCENT_PRESETS.map((c) => (
            <button
              key={c}
              className="swatch"
              aria-label={'Accent color ' + c}
              aria-pressed={c === accent}
              onClick={() => onChange({ accent: c })}
            >
              <span
                className="swatch-dot"
                style={{
                  backgroundColor: c,
                  boxShadow: c === accent ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}` : undefined,
                }}
              ></span>
            </button>
          ))}
        </div>
      </div>
      <div className="settings-row">
        <span className="settings-label">Appearance</span>
        <Seg
          options={['auto', 'light', 'dark'] as const}
          value={settings.theme}
          accent={accent}
          labels={{ auto: 'Auto', light: 'Light', dark: 'Dark' }}
          onPick={(v) => onChange({ theme: v })}
        />
      </div>
      <div className="settings-row">
        <span className="settings-label">Weekend tint</span>
        <Seg
          options={['On', 'Off'] as const}
          value={settings.weekendTint ? 'On' : 'Off'}
          accent={accent}
          onPick={(v) => onChange({ weekendTint: v === 'On' })}
        />
      </div>

      <div className="settings-section">Layout</div>
      <div className="settings-row">
        <span className="settings-label">Week starts</span>
        <Seg
          options={['Sunday', 'Monday'] as const}
          value={settings.weekStart}
          accent={accent}
          onPick={(v) => onChange({ weekStart: v })}
        />
      </div>
      <div className="settings-row">
        <span className="settings-label">Cell size</span>
        <Seg
          options={['compact', 'regular', 'tall'] as const}
          value={settings.cellSize}
          accent={accent}
          labels={{ compact: 'Compact', regular: 'Regular', tall: 'Tall' }}
          onPick={(v) => onChange({ cellSize: v })}
        />
      </div>

      <div className="settings-section">Google Calendar</div>
      {!google.available ? (
        <p className="settings-note">
          Set <code>VITE_GOOGLE_CLIENT_ID</code> in your environment to enable Google Calendar sync. See the
          README for how to create one.
        </p>
      ) : !google.connected ? (
        <div className="settings-row">
          <span className="settings-label">Not connected</span>
          <button
            className="add-emoji-btn"
            style={{ color: accent, borderColor: accent + '55' }}
            disabled={google.busy}
            onClick={google.connect}
          >
            {google.busy ? 'Connecting…' : 'Connect Google Calendar'}
          </button>
        </div>
      ) : (
        <>
          <div className="settings-row">
            <span className="settings-label">Connected</span>
            <button
              className="add-emoji-btn"
              style={{ color: 'var(--sun)', borderColor: '#E3D5D5' }}
              onClick={google.disconnect}
            >
              Disconnect
            </button>
          </div>
          <div className="settings-row">
            <span className="settings-label">Mirror notes to Google</span>
            <Seg
              options={['On', 'Off'] as const}
              value={settings.pushEnabled ? 'On' : 'Off'}
              accent={accent}
              onPick={(v) => google.setPush(v === 'On')}
            />
          </div>
          {settings.pushEnabled && google.pending > 0 && (
            <p className="settings-note">
              {google.pending} change{google.pending === 1 ? '' : 's'} waiting to sync…
            </p>
          )}
        </>
      )}
      {google.error && <p className="settings-error">{google.error}</p>}
    </div>
  )
}
