// Google Identity Services token handling. The access token lives in memory
// only; expired tokens are silently re-requested with prompt 'none'.

const GSI_SRC = 'https://accounts.google.com/gsi/client'

export const SCOPE_READONLY = 'https://www.googleapis.com/auth/calendar.readonly'

// Push needs to write events, create the "Shift Planner" calendar, and find it
// again in the user's calendar list — granular scopes, no full calendar access.
export const SCOPES_WRITE = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.calendars',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
].join(' ')

interface ActiveToken {
  value: string
  expiresAt: number
  scopes: Set<string>
}

let active: ActiveToken | null = null
let gsiPromise: Promise<void> | null = null
let inFlight: { scope: string; promise: Promise<string> } | null = null

export function hasClientId(): boolean {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID
  return typeof id === 'string' && id.length > 0
}

function covers(granted: Set<string>, scope: string): boolean {
  return scope.split(' ').every(
    (s) =>
      granted.has(s) ||
      (s === SCOPE_READONLY && granted.has('https://www.googleapis.com/auth/calendar.events')),
  )
}

function loadGsi(): Promise<void> {
  if (gsiPromise) return gsiPromise
  gsiPromise = new Promise<void>((resolve, reject) => {
    if (typeof google !== 'undefined') {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = GSI_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      gsiPromise = null
      reject(new Error('could not load Google sign-in (offline?)'))
    }
    document.head.appendChild(script)
  })
  return gsiPromise
}

export async function requestToken(scope: string, interactive: boolean): Promise<string> {
  if (active && active.expiresAt > Date.now() + 60_000 && covers(active.scopes, scope)) {
    return active.value
  }
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID is not set')
  if (inFlight && inFlight.scope === scope) return inFlight.promise

  const promise = (async () => {
    await loadGsi()
    return new Promise<string>((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope,
        callback: (resp) => {
          if (resp.error) {
            reject(new Error(resp.error_description ?? resp.error))
            return
          }
          active = {
            value: resp.access_token,
            expiresAt: Date.now() + (Number(resp.expires_in) - 60) * 1000,
            scopes: new Set(resp.scope.split(' ')),
          }
          resolve(resp.access_token)
        },
        error_callback: (err) => {
          reject(new Error(err.message ?? err.type))
        },
      })
      client.requestAccessToken({ prompt: interactive ? '' : 'none' })
    })
  })()

  inFlight = { scope, promise }
  try {
    return await promise
  } finally {
    inFlight = null
  }
}

export async function revokeToken(): Promise<void> {
  const token = active?.value
  active = null
  if (!token) return
  await loadGsi()
  await new Promise<void>((resolve) => {
    google.accounts.oauth2.revoke(token, () => resolve())
  })
}
