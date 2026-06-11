import type { CellSize, Settings, ThemeMode, WeekStart } from '../types'

const SETTINGS_KEY = 'calendar-planner-settings-v1'

const DEFAULTS: Settings = {
  accent: '#7CA8D8',
  theme: 'auto',
  weekStart: 'Sunday',
  weekendTint: true,
  cellSize: 'regular',
  googleConnected: false,
  pushEnabled: false,
}

const WEEK_STARTS: readonly WeekStart[] = ['Sunday', 'Monday']
const CELL_SIZES: readonly CellSize[] = ['compact', 'regular', 'tall']
const THEMES: readonly ThemeMode[] = ['auto', 'light', 'dark']

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULTS
    const v: unknown = JSON.parse(raw)
    if (typeof v !== 'object' || v === null) return DEFAULTS
    const o = v as Record<string, unknown>
    return {
      accent: typeof o.accent === 'string' && o.accent.startsWith('#') ? o.accent : DEFAULTS.accent,
      theme: THEMES.includes(o.theme as ThemeMode) ? (o.theme as ThemeMode) : DEFAULTS.theme,
      weekStart: WEEK_STARTS.includes(o.weekStart as WeekStart) ? (o.weekStart as WeekStart) : DEFAULTS.weekStart,
      weekendTint: typeof o.weekendTint === 'boolean' ? o.weekendTint : DEFAULTS.weekendTint,
      cellSize: CELL_SIZES.includes(o.cellSize as CellSize) ? (o.cellSize as CellSize) : DEFAULTS.cellSize,
      googleConnected: o.googleConnected === true,
      pushEnabled: o.pushEnabled === true,
    }
  } catch {
    return DEFAULTS
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // ignore
  }
}
