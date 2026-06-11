# Calendar Planner

A minimalist monthly calendar PWA for shift workers. Tap a date, mark it with emoji shift markers
(🌅 ☀️ 🌙 💤 …) and a free-text note — everything saves instantly and works fully offline.
Optionally overlay your Google Calendar events and mirror your notes back to Google.

Built with Vite + React 18 + TypeScript, no UI library, no backend. The design is ported
high-fidelity from the prototype in `design_files/` (spec in [`HANDOFF.md`](HANDOFF.md)).

## Features

- **Monthly calendar** with month/year jump picker, prev/next navigation, and a Today button.
- **Emoji markers + notes per day** — curated category picker (Shifts, Outdoors, Smileys, …) with
  a persisted "Recent" row; entries auto-save on every keystroke and empty entries are cleaned up.
- **Settings** (gear in the header): week start (Sunday/Monday), weekend tint, cell size, and
  4 accent color presets. Persisted locally.
- **Installable PWA** — offline-first service worker precaches the app shell and the self-hosted
  Manrope font, so it works with no connection.
- **Google Calendar sync** (optional):
  - *Pull*: read-only overlay of your primary calendar's events for the visible month (neutral dot
    on date cells, title + time list in the detail card). The last fetch per month is cached so the
    overlay still shows offline.
  - *Push*: mirror each day's emojis + note to a dedicated **"Shift Planner"** calendar as an
    all-day event (created automatically). Pushes are debounced 2s and queued while offline.
  - Local data is the source of truth. The app never edits or deletes Google events it didn't create.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # month math + storage parsing tests (vitest)
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
npm run icons      # regenerate the PWA icons in public/icons/
```

Google sync is disabled until you provide a client ID:

```bash
cp .env.example .env   # then fill in VITE_GOOGLE_CLIENT_ID
```

## Getting a Google OAuth client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create (or pick) a project.
2. **APIs & Services → Library** → enable the **Google Calendar API**.
3. **APIs & Services → OAuth consent screen** → configure it (External is fine). Add yourself as a
   test user while the app is unverified.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID** →
   type **Web application**.
5. Under **Authorized JavaScript origins** add:
   - `http://localhost:5173` (development)
   - your deployed URL, e.g. `https://your-app.netlify.app`
   No redirect URIs are needed (the app uses the Google Identity Services token flow).
6. Copy the client ID into `.env` as `VITE_GOOGLE_CLIENT_ID`, and set the same variable in your
   host's environment settings for production builds.

Scopes requested: `calendar.readonly` for the read-only overlay; enabling push upgrades to the
granular `calendar.events`, `calendar.calendars`, and `calendar.calendarlist.readonly` scopes
(needed to create and find the "Shift Planner" calendar — never full account access). The access
token is kept in memory only and silently refreshed; disconnecting revokes it and clears all
cached Google data.

## Deploy (GitHub Pages)

The repo ships a workflow (`.github/workflows/deploy.yml`) that builds and publishes to GitHub
Pages on every push to `main`. One-time setup:

1. Create a GitHub repo and push this project to it (any repo name works — the workflow derives
   the `/repo-name/` base path automatically).
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Optional, for Google sync: **Settings → Secrets and variables → Actions → Variables** → add
   `VITE_GOOGLE_CLIENT_ID`, and add `https://<your-username>.github.io` as an authorized
   JavaScript origin on the OAuth client.

The app then lives at `https://<your-username>.github.io/<repo-name>/`.

A `netlify.toml` is also included if you prefer Netlify
(`npm run build && npx netlify-cli deploy --prod --dir dist`); any static HTTPS host works.

## Install on Android

1. Open the deployed URL in Chrome.
2. Tap the **⋮** menu → **Add to Home screen** (or the "Install app" prompt).
3. The app launches standalone, portrait, and works offline.

On iOS: Safari → Share → **Add to Home Screen**.

## Data & storage

All data lives in `localStorage` (the keys are compatible with the original prototype, so existing
data survives):

| Key | Contents |
| --- | --- |
| `calendar-planner-data-v1` | `Record<'YYYY-MM-DD', {e: string[], n: string, gId?: string}>` |
| `calendar-planner-recent-emojis-v1` | last 16 used emojis |
| `calendar-planner-settings-v1` | app settings |
| `calendar-planner-gcal-cache-v1` | per-month Google event cache (offline overlay) |
| `calendar-planner-gcal-calendar-id-v1` | id of the "Shift Planner" calendar |
| `calendar-planner-push-queue-v1` | pending offline pushes |

`gId` on an entry is the mirrored Google event id; legacy `{e, n}` entries parse unchanged.

## Project structure

```
src/
  App.tsx                    state + wiring
  components/
    Calendar.tsx             header, jump picker, weekday row, date grid
    DateCell.tsx             one date button (emojis, note/event dots)
    DetailSection.tsx        selected-day card: chips, note, Google events
    EmojiPicker.tsx          tabbed category picker with recents
    MonthYearPicker.tsx      year stepper + month grid
    Settings.tsx             settings panel (theme, layout, Google)
  data/emojiCategories.ts    exact emoji data from the design handoff
  google/
    auth.ts                  GIS token client (in-memory token, silent refresh)
    api.ts                   Calendar REST wrappers (fetch only)
    useGoogleCalendar.ts     pull overlay + debounced/queued push
  lib/
    dates.ts                 grid builder + date key helpers (tested)
    storage.ts               data + recents persistence (tested)
    settings.ts              settings persistence
    gcalStore.ts             Google cache/queue persistence
scripts/generate-icons.mjs   dependency-free PWA icon generator
```

## Future (intentionally not built)

A native wrapper (Capacitor) with an Android home-screen widget can read the same
`localStorage`-shaped data store; the storage module (`src/lib/storage.ts`) is the seam.
