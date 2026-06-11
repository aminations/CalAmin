# Claude Code Prompt — Shift Work Calendar Planner

Copy everything below the line into Claude Code, run from an empty directory containing this handoff folder.

---

Build a production-ready installable web app (PWA) from the design handoff in `design_handoff_calendar_planner/`. Read `README.md` in that folder first — it is the full spec. The HTML/JSX files in `design_files/` are high-fidelity design references: recreate them faithfully, do not ship them as-is (they use CDN React + in-browser Babel).

## Stack
- Vite + React 18 + TypeScript
- `vite-plugin-pwa` for the service worker + manifest (installable on Android via "Add to Home screen", works offline)
- Plain CSS modules or a single global stylesheet translated from the prototype's `<style>` block — no UI library, no Tailwind. The design tokens and all measurements are in the README; match them exactly.
- No backend. Everything client-side.

## Phase 1 — Core app (port the prototype)
1. Recreate the calendar exactly as specified in README.md: header with month/year jump picker, prev/next, Today button, weekday row, date grid, detail section with emoji chips, category emoji picker (copy the exact emoji category data from `design_files/emoji-picker.jsx`), and note textarea.
2. Storage: keep the prototype's shape and keys —
   `calendar-planner-data-v1` → `Record<'YYYY-MM-DD', {e: string[], n: string}>`,
   `calendar-planner-recent-emojis-v1` → `string[]`.
   Wrap access in a small storage module so existing prototype data survives.
3. Settings screen or small settings popover: week start (Sunday default / Monday), weekend tint toggle, accent color (4 presets: #7CA8D8, #8FBA9B, #A99BD6, #E5A98C). Persist in localStorage.
4. Make it a PWA: manifest (name "Calendar Planner", theme color #7CA8D8, background #FAFAF7, display standalone, portrait), generated 192/512 maskable icons (simple rounded calendar glyph on the accent color), offline-first service worker (precache app shell). Verify Lighthouse "installable" passes.

## Phase 2 — Google Calendar sync
Read-only overlay first, then optional push:
1. Use **Google Identity Services** (token client, implicit flow, scope `https://www.googleapis.com/auth/calendar.events` — start with `calendar.readonly` for phase 2a) and the Calendar REST API via `fetch`. No gapi client library needed.
2. **2a — Pull**: a "Connect Google Calendar" button in settings. When connected, fetch events for the visible month (`events.list` with `timeMin`/`timeMax`, `singleEvents=true`) and render each day's Google events in the detail section as a read-only list (event title + time), plus a tiny neutral dot on date cells that have events (visually distinct from the accent note dot). Cache the last fetch per month so the UI works offline.
3. **2b — Push (optional toggle)**: when enabled, a date's note + emojis are mirrored to a dedicated calendar named "Shift Planner" (create it if missing) as an all-day event — title = emojis + first line of note, description = full note. Store the Google event id alongside the local entry (extend the entry type to `{e, n, gId?}` — keep backward compatibility when parsing). Update/delete the event when the entry changes/empties. Debounce pushes (2s) and queue them when offline.
4. Token handling: keep the access token in memory only; silently re-request with `prompt=''` when expired; clear UI state on revoke. The OAuth client ID must come from an env var (`VITE_GOOGLE_CLIENT_ID`) — document in the README how to create it in Google Cloud Console (OAuth consent screen, JavaScript origin = the deployed URL and http://localhost:5173).
5. Conflict policy: local data is the source of truth for emojis/notes; Google events are display-only unless push is enabled. Never delete Google events the app didn't create.

## Phase 3 — Deploy
- Set up for deployment on a static host (Netlify or GitHub Pages or Cloudflare Pages — pick one and wire the config / Actions workflow).
- README with: dev setup, how to get the Google client ID, deploy steps, and how to install on Android.

## Quality bar
- TypeScript strict, no `any` in the data layer.
- Components split sensibly (Calendar, DateCell, DetailSection, EmojiPicker, MonthYearPicker, Settings, sync module).
- Touch targets ≥ 44px, works at 320px width and on desktop.
- Test the month math: leap years (Feb 2024), year rollovers (Dec→Jan), Monday week start alignment.
- Keep the visual design exactly as the handoff specifies — soft pastel light mode, borders not shadows, Manrope font (self-host via `@fontsource/manrope` so offline mode keeps the font).

Future (do not build now, leave clean seams): native wrapper (Capacitor) with an Android home-screen widget reading the same data store.
