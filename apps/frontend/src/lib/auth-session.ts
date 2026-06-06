import type { AuthSessionPayload } from '@/lib/auth-types'

let accessToken: string | null = null

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function markHasSessionCookie() {
  if (typeof document === 'undefined') return
  document.cookie = 'has_session=1; path=/; SameSite=Lax'
}

export function clearHasSessionCookie() {
  if (typeof document === 'undefined') return
  document.cookie = 'has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax'
}

export function applyAuthenticatedClientSession(payload: AuthSessionPayload) {
  setAccessToken(payload.accessToken)
  markHasSessionCookie()
}

export function clearAuthenticatedClientSession() {
  setAccessToken(null)
  clearHasSessionCookie()
}
