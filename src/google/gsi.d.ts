// Minimal typings for the Google Identity Services token client (loaded from
// https://accounts.google.com/gsi/client at runtime).
declare namespace google.accounts.oauth2 {
  interface TokenResponse {
    access_token: string
    expires_in: number | string
    scope: string
    error?: string
    error_description?: string
  }

  interface OverridableTokenClientConfig {
    prompt?: '' | 'none' | 'consent' | 'select_account'
  }

  interface TokenClient {
    requestAccessToken(overrideConfig?: OverridableTokenClientConfig): void
  }

  interface TokenClientConfig {
    client_id: string
    scope: string
    callback: (response: TokenResponse) => void
    error_callback?: (error: { type: string; message?: string }) => void
  }

  function initTokenClient(config: TokenClientConfig): TokenClient
  function revoke(accessToken: string, done?: () => void): void
}
