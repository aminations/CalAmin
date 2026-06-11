# Handoff: Shift Work Calendar Planner

## Overview
A minimalist monthly calendar app for shift workers. Users tap a date to annotate it with emojis (shift markers like 🌅 ☀️ 🌙 💤, plus general categories) and a free-text note. Data persists locally per date. The goal of this handoff is to turn the HTML prototype into a production **installable web app (PWA)** with **Google Calendar sync**.

## About the Design Files
The files in `design_files/` are **design references created in HTML** — a working prototype showing intended look and behavior, not production code to ship directly. The task is to **recreate this design in a proper production environment**. No target codebase exists yet; the recommended stack is **Vite + React + TypeScript** with `vite-plugin-pwa` (see PROMPT.md). The prototype uses in-browser Babel and CDN React — do not carry that over.

`tweaks-panel.jsx` is design-review tooling only (theme toggles used during design iteration). **Do not port it.** The chosen tweak values are already baked into the spec below.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, and interactions in the prototype are final. Recreate pixel-perfectly. The behavior in `calendar-app.jsx` (grid building, storage shape, selection flow) is correct and can be translated to TypeScript nearly 1:1.

## Screens / Views

### 1. Monthly Calendar (single screen, mobile-first, max-width 600px centered)
**Layout (top to bottom):**
1. **Header** — flex row, space-between, 18px bottom margin
   - Left: month/year title button — "June 2026" (month 26px/800, year 26px/500 in `--text-soft`), with ▾ caret (14px, muted). Clicking toggles the month/year jump picker. Caret rotates 180° when open (0.15s ease).
   - Next to title: "Today" text button (14px/700, accent color) — **only rendered when the viewed month ≠ current month**. Returns view + selection to today.
   - Right: prev/next buttons — 44×44px, 1px `--line` border, 10px radius, white bg, ‹ › glyphs 22px in `--text-soft`. Hover: bg `#F3F4F2`.
2. **Month/year jump picker** (conditional, between header and weekday row) — card (white, 1px `--line`, 14px radius, 14px padding, 16px bottom margin). Contains: centered year stepper (‹ 2026 › — 36px square buttons, year 17px/800) above a 4×3 grid of month buttons (44px min-height, 10px radius, 3-letter labels 14px/600 `--text-soft`). Viewed month: accent bg + white text. Current real month: accent text + weight 800. Picking a month navigates and closes the picker.
3. **Weekday row** — 7-col grid, 4px gap. Labels 12px/700 uppercase, 0.06em tracking, `--text-muted`. Sun tinted `--sun`, Sat tinted `--sat` (when weekend tint enabled — it is, by default).
4. **Date grid** — 7-col grid, 4px gap (3px under 480px). 5 or 6 rows depending on month.
5. **Detail section** — see below.

**Date cell** (a `<button>`, min tap target honored):
- min-height 64px (58px mobile), padding 6px 2px 10px, white bg, 1px `--line` border, 12px radius (9px mobile), column flex, 2px gap, centered.
- Day number: 14px/600 inside a 24px circle. Today: circle filled with accent, white text; whole cell bg = accent at 12% opacity (`accent + '1f'` hex alpha).
- Selected: inset 2px ring in accent (`box-shadow: inset 0 0 0 2px accent`).
- Sun/Sat day numbers tinted `--sun`/`--sat`.
- Out-of-month dates: transparent bg + border, day number in `--text-muted` (these remain clickable; selecting navigates to that month).
- Emojis: wrap row under the number, 13px; show max 3 then "+N" (10px/700 `--text-soft`).
- Note indicator: 5px accent dot, absolutely positioned bottom-center.

### 2. Detail section (below grid, always visible for the selected date)
Card: white, 1px `--line` border, 16px radius, 18px padding, 12px column gap, 20px top margin.
- **Head row** (space-between): date label "6/10 (Wed)" (18px/800) + "+ Emoji" pill button (accent text, 1px accent-at-33% border, 999px radius, 8px 16px padding, 14px/700; shows "✕ Emoji" while picker open).
- **Emoji chips** (only when the date has emojis): wrap row, 8px gap. Chip = pill (1px `--line` border, `--bg` fill, 6px 10px padding, min-height 40px) with emoji at 18px + small ✕ (11px, muted; turns `--sun` on hover). Tapping a chip removes that emoji.
- **Emoji picker** (toggled): card with category tab row (38px square emoji-icon tabs; active tab bg = accent at 13%; ✕ close at right), optional "Recent" section (last 16 used, persisted), then label + grid of 40px emoji buttons (21px glyphs, scale 1.12 on hover). Categories: Shifts, Outdoors, Smileys, Hearts, Activities, Travel, Food, Nature, Objects — exact emoji lists in `design_files/emoji-picker.jsx`.
- **Note textarea**: full width, `--bg` fill, 1px `--line` border, 12px radius, 12px 14px padding, 15px text, line-height 1.5, min-height 76px, vertical resize to 240px max. Placeholder: "Please tap here to edit note". Focus: 2px `#D8E3F0` outline. Saves on every keystroke.

## Interactions & Behavior
- Tap date → selects it (accent ring) and detail section shows that date. Selecting an adjacent-month date also navigates the view to that month.
- Prev/Next → ±1 month with correct year rollover. Title button → jump picker for arbitrary month/year. "Today" → reset view + selection.
- Add emoji: + Emoji → picker → tap emoji (appends to date, records in recents; picker stays open for multi-add). Remove: tap chip in detail section.
- All mutations auto-save immediately; an entry with no emojis and an empty note is deleted from storage.
- Hovers are subtle bg shifts (see CSS); transitions 0.1–0.15s ease. No entrance animations.
- Responsive: single column; under 480px paddings/gaps shrink per the media query in the prototype.

## State Management
- `view: {y, m}` — displayed month
- `selected: 'YYYY-MM-DD'` — defaults to today
- `data: Record<'YYYY-MM-DD', {e: string[], n: string}>` — emojis + note per date
- `jumpOpen`, `pickerOpen` — UI toggles
- Persistence: localStorage key `calendar-planner-data-v1` (whole data object, JSON); recent emojis under `calendar-planner-recent-emojis-v1`. Keep this exact shape — see PROMPT.md for the sync layer built on top of it.

## Design Tokens
Colors:
- `--bg: #FAFAF7` (page) · `--surface: #FFFFFF` (cards/cells)
- `--text: #3A3F47` · `--text-soft: #6B7280` · `--text-muted: #B4BAC3`
- `--line: #ECEDEF` (all borders)
- Accent: `#7CA8D8` (soft blue) — used for today highlight, selection ring, note dots, links/buttons. Alpha variants: 12% cell fill, 33% button border.
- Weekend: `--sun: #C98A8A` (rose) · `--sat: #8A9DC9` (blue)

Typography: **Manrope** (Google Fonts), weights 400–800. Fallback: -apple-system, 'Segoe UI', sans-serif. Scale: 26 (title) / 18 (detail date) / 15 (note) / 14 (day numbers, buttons) / 12 (weekday) / 11–10 (labels).

Spacing: 4px grid gap, 18–20px section gaps, 12–18px card padding. Radii: 16 (detail card) / 14 (picker cards) / 12 (cells, inputs) / 10 (buttons) / 999 (pills). No shadows anywhere — borders only.

## Settings baked from design review
Week starts **Sunday** (offer Monday as a user setting — the grid builder already supports it), weekend tint **on**, cell density **regular** (64px). These were tweakable in the prototype; ship them as app settings, not hardcoded.

## Assets
None — no images or icon fonts. All glyphs are native emoji and text characters (‹ › ▾ ✕ +). The PWA will need app icons (192/512 maskable) — generate simple ones using the accent color.

## Files
- `design_files/Calendar Planner.html` — page shell + all CSS (the styling source of truth)
- `design_files/calendar-app.jsx` — app logic: grid builder, storage, all components
- `design_files/emoji-picker.jsx` — picker component + exact emoji category data
- `design_files/tweaks-panel.jsx` — design tooling, do not port
- `PROMPT.md` — paste this into Claude Code to kick off the build
