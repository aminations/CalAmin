// Shift Work Calendar Planner — main app
// Requires: React, tweaks-panel.jsx, emoji-picker.jsx

const STORAGE_KEY = 'calendar-planner-data-v1';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CAL_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#7CA8D8",
  "weekStart": "Sunday",
  "weekendTint": true,
  "cellSize": "regular"
}/*EDITMODE-END*/;

// ---------- storage ----------
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch (e) { return {}; }
}

function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
}

// ---------- date helpers ----------
function pad2(n) { return String(n).padStart(2, '0'); }
function keyOf(y, m, d) { return y + '-' + pad2(m + 1) + '-' + pad2(d); }
function todayKey() {
  const t = new Date();
  return keyOf(t.getFullYear(), t.getMonth(), t.getDate());
}
function parseKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return { y, m: m - 1, d };
}
function labelOf(k) {
  const { y, m, d } = parseKey(k);
  const dow = WEEKDAYS[new Date(y, m, d).getDay()];
  return (m + 1) + '/' + d + ' (' + dow + ')';
}

// Build a 7xN grid of {key, day, inMonth} for a given month
function buildGrid(year, month, weekStartsMonday) {
  const first = new Date(year, month, 1);
  let lead = first.getDay() - (weekStartsMonday ? 1 : 0);
  if (lead < 0) lead += 7;
  const cells = [];
  const start = new Date(year, month, 1 - lead);
  const total = Math.ceil((lead + new Date(year, month + 1, 0).getDate()) / 7) * 7;
  for (let i = 0; i < total; i++) {
    const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({
      key: keyOf(dt.getFullYear(), dt.getMonth(), dt.getDate()),
      day: dt.getDate(),
      dow: dt.getDay(),
      inMonth: dt.getMonth() === month,
    });
  }
  return cells;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// ---------- components ----------
function DateCell({ cell, entry, isToday, isSelected, accent, weekendTint, onSelect }) {
  const emojis = (entry && entry.e) || [];
  const hasNote = !!(entry && entry.n && entry.n.trim());
  const cls = ['date-cell'];
  if (!cell.inMonth) cls.push('out-month');
  if (isToday) cls.push('today');
  if (isSelected) cls.push('selected');
  if (weekendTint && (cell.dow === 0 || cell.dow === 6)) cls.push(cell.dow === 0 ? 'sun' : 'sat');

  const style = {};
  if (isSelected) style.boxShadow = 'inset 0 0 0 2px ' + accent;
  if (isToday) style.backgroundColor = accent + '1f';

  return (
    <button className={cls.join(' ')} style={style} onClick={() => onSelect(cell.key)}
      aria-label={cell.key} aria-pressed={isSelected}>
      <span className="cell-day" style={isToday ? { backgroundColor: accent, color: '#fff' } : undefined}>
        {cell.day}
      </span>
      <span className="cell-emojis">
        {emojis.slice(0, 3).map((e, i) => <span key={i} className="cell-emoji">{e}</span>)}
        {emojis.length > 3 && <span className="cell-more">+{emojis.length - 3}</span>}
      </span>
      {hasNote && <span className="cell-note-dot" style={{ backgroundColor: accent }}></span>}
    </button>
  );
}

function DetailSection({ dateKey, entry, accent, onAddEmoji, onRemoveEmoji, onNoteChange }) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const emojis = (entry && entry.e) || [];
  const note = (entry && entry.n) || '';

  React.useEffect(() => { setPickerOpen(false); }, [dateKey]);

  return (
    <section className="detail" aria-label="Selected date details">
      <div className="detail-head">
        <h2 className="detail-date">{labelOf(dateKey)}</h2>
        <button className="add-emoji-btn" style={{ color: accent, borderColor: accent + '55' }}
          onClick={() => setPickerOpen((v) => !v)}>
          <span className="add-emoji-plus">{pickerOpen ? '✕' : '+'}</span> Emoji
        </button>
      </div>

      {emojis.length > 0 && (
        <div className="emoji-chips">
          {emojis.map((e, i) => (
            <button key={e + i} className="emoji-chip" title="Tap to remove"
              onClick={() => onRemoveEmoji(i)}>
              <span className="emoji-chip-glyph">{e}</span>
              <span className="emoji-chip-x">✕</span>
            </button>
          ))}
        </div>
      )}

      {pickerOpen && (
        <EmojiPicker accent={accent}
          onPick={(e) => onAddEmoji(e)}
          onClose={() => setPickerOpen(false)} />
      )}

      <textarea
        className="note-input"
        value={note}
        placeholder="Please tap here to edit note"
        rows={3}
        onChange={(ev) => onNoteChange(ev.target.value)}
      ></textarea>
    </section>
  );
}

function MonthYearPicker({ view, accent, onPick, onClose }) {
  const [year, setYear] = React.useState(view.y);
  const now = new Date();
  return (
    <div className="my-picker" role="dialog" aria-label="Jump to month">
      <div className="my-picker-year">
        <button className="nav-btn small" aria-label="Previous year" onClick={() => setYear((y) => y - 1)}>‹</button>
        <span className="my-picker-year-label">{year}</span>
        <button className="nav-btn small" aria-label="Next year" onClick={() => setYear((y) => y + 1)}>›</button>
      </div>
      <div className="my-picker-grid">
        {MONTH_NAMES.map((name, m) => {
          const isCurrent = year === now.getFullYear() && m === now.getMonth();
          const isViewed = year === view.y && m === view.m;
          return (
            <button key={name}
              className={'my-picker-month' + (isViewed ? ' viewed' : '')}
              style={isViewed ? { backgroundColor: accent, color: '#fff' } : (isCurrent ? { color: accent, fontWeight: 800 } : undefined)}
              onClick={() => { onPick(year, m); onClose(); }}>
              {name.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CalendarApp() {
  const [t, setTweak] = useTweaks(CAL_TWEAK_DEFAULTS);
  const now = new Date();
  const [view, setView] = React.useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = React.useState(todayKey);
  const [data, setData] = React.useState(loadData);
  const [jumpOpen, setJumpOpen] = React.useState(false);

  const accent = t.accent;
  const weekStartsMonday = t.weekStart === 'Monday';
  const tKey = todayKey();

  const update = (key, fn) => {
    setData((prev) => {
      const cur = prev[key] || { e: [], n: '' };
      const nextEntry = fn(cur);
      const next = { ...prev };
      if ((!nextEntry.e || nextEntry.e.length === 0) && !(nextEntry.n && nextEntry.n.trim())) {
        delete next[key];
      } else {
        next[key] = nextEntry;
      }
      saveData(next);
      return next;
    });
  };

  const goMonth = (delta) => {
    setView(({ y, m }) => {
      const dt = new Date(y, m + delta, 1);
      return { y: dt.getFullYear(), m: dt.getMonth() };
    });
  };

  const selectDate = (key) => {
    setSelected(key);
    const { y, m } = parseKey(key);
    if (y !== view.y || m !== view.m) setView({ y, m });
  };

  const goToday = () => {
    setView({ y: now.getFullYear(), m: now.getMonth() });
    setSelected(tKey);
  };

  const grid = buildGrid(view.y, view.m, weekStartsMonday);
  const weekdays = weekStartsMonday
    ? [...WEEKDAYS.slice(1), WEEKDAYS[0]]
    : WEEKDAYS;

  return (
    <div className={'app density-' + t.cellSize}>
      <header className="cal-header">
        <div className="cal-title-wrap">
          <button className={'cal-title-btn' + (jumpOpen ? ' open' : '')} title="Jump to any month"
            aria-expanded={jumpOpen}
            onClick={() => setJumpOpen((v) => !v)}>
            <h1 className="cal-title">{MONTH_NAMES[view.m]} <span className="cal-year">{view.y}</span></h1>
            <span className="cal-title-caret">▾</span>
          </button>
          {(view.y !== now.getFullYear() || view.m !== now.getMonth()) && (
            <button className="today-btn" style={{ color: accent }} onClick={goToday}>Today</button>
          )}
        </div>
        <div className="cal-nav">
          <button className="nav-btn" aria-label="Previous month" onClick={() => goMonth(-1)}>‹</button>
          <button className="nav-btn" aria-label="Next month" onClick={() => goMonth(1)}>›</button>
        </div>
      </header>

      {jumpOpen && (
        <MonthYearPicker view={view} accent={accent}
          onPick={(y, m) => setView({ y, m })}
          onClose={() => setJumpOpen(false)} />
      )}

      <div className="weekday-row">
        {weekdays.map((w) => (
          <div key={w} className={'weekday' + (t.weekendTint && (w === 'Sun' || w === 'Sat') ? (w === 'Sun' ? ' sun' : ' sat') : '')}>{w}</div>
        ))}
      </div>

      <div className="date-grid" role="grid">
        {grid.map((cell) => (
          <DateCell key={cell.key} cell={cell}
            entry={data[cell.key]}
            isToday={cell.key === tKey}
            isSelected={cell.key === selected}
            accent={accent}
            weekendTint={t.weekendTint}
            onSelect={selectDate} />
        ))}
      </div>

      <DetailSection
        dateKey={selected}
        entry={data[selected]}
        accent={accent}
        onAddEmoji={(e) => update(selected, (cur) => ({ ...cur, e: [...(cur.e || []), e] }))}
        onRemoveEmoji={(i) => update(selected, (cur) => ({ ...cur, e: (cur.e || []).filter((_, j) => j !== i) }))}
        onNoteChange={(n) => update(selected, (cur) => ({ ...cur, n }))}
      />

      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakColor label="Accent" value={t.accent}
          options={['#7CA8D8', '#8FBA9B', '#A99BD6', '#E5A98C']}
          onChange={(v) => setTweak('accent', v)} />
        <TweakToggle label="Weekend tint" value={t.weekendTint}
          onChange={(v) => setTweak('weekendTint', v)} />
        <TweakSection label="Layout" />
        <TweakRadio label="Week starts" value={t.weekStart}
          options={['Sunday', 'Monday']}
          onChange={(v) => setTweak('weekStart', v)} />
        <TweakRadio label="Cell size" value={t.cellSize}
          options={['compact', 'regular', 'tall']}
          onChange={(v) => setTweak('cellSize', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<CalendarApp />);
