import { create } from 'zustand'
import { api, registerAuthSessionBridge, resetAuthRedirectState } from '@/lib/api'
import {
  applyAuthenticatedClientSession,
  clearAuthenticatedClientSession,
} from '@/lib/auth-session'
import {
  AuthAccessContext,
  AuthLoginResult,
  AuthSessionPayload,
  AuthUser,
  PendingLoginVerification,
} from '@/lib/auth-types'

interface AuthState {
  user: AuthUser | null
  accessContext: AuthAccessContext | null
  isAuthenticated: boolean
  hasHydrated: boolean
  isHydrating: boolean
  login: (email: string, password: string) => Promise<AuthLoginResult>
  verifyLoginCode: (challengeId: string, code: string) => Promise<AuthUser>
  resendLoginCode: (challengeId: string) => Promise<PendingLoginVerification>
  logout: () => Promise<void>
  hydrate: () => Promise<void>
}

let hydratePromise: Promise<void> | null = null

function applyAuthenticatedState(
  set: (state: Partial<AuthState>) => void,
  payload: AuthSessionPayload,
) {
  resetAuthRedirectState()
  applyAuthenticatedClientSession(payload)
  set({
    user: payload.user,
    accessContext: payload.context,
    isAuthenticated: true,
  })
}

function clearAuthenticatedState(
  set: (state: Partial<AuthState>) => void,
  extras?: Partial<AuthState>,
) {
  clearAuthenticatedClientSession()
  set({
    user: null,
    accessContext: null,
    isAuthenticated: false,
    ...extras,
  })
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessContext: null,
  isAuthenticated: false,
  hasHydrated: false,
  isHydrating: false,

  async hydrate() {
    if (typeof window === 'undefined') return

    if (hydratePromise) {
      await hydratePromise
      return
    }

    if (get().hasHydrated && !get().isHydrating) {
      return
    }

    set({ isHydrating: true })

    hydratePromise = (async () => {
      try {
        const { data } = await api.post('/auth/refresh', {})
        applyAuthenticatedState(set, data.data)
      } catch {
        clearAuthenticatedState(set)
      } finally {
        set({ hasHydrated: true, isHydrating: false })
        hydratePromise = null
      }
    })()

    await hydratePromise
  },

  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    const payload = data.data

    if (payload.requiresTwoFactor) {
      return {
        status: 'verification_required',
        verification: {
          challengeId: payload.challengeId,
          email: payload.email,
          deliveryHint: payload.deliveryHint,
          message: payload.message,
        },
      }
    }

    applyAuthenticatedState(set, payload)
    return { status: 'authenticated', user: payload.user }
  },

  async verifyLoginCode(challengeId, code) {
    const { data } = await api.post('/auth/login/verify', { challengeId, code })
    const payload = data.data

    applyAuthenticatedState(set, payload)
    return payload.user
  },

  async resendLoginCode(challengeId) {
    const { data } = await api.post('/auth/login/resend', { challengeId })
    const payload = data.data

    return {
      challengeId: payload.challengeId,
      email: payload.email,
      deliveryHint: payload.deliveryHint,
      message: payload.message,
    }
  },

  async logout() {
    try {
      await api.post<any>('/auth/logout')
    } catch {
      // Backend indisponível — o logout local continua normalmente
    } finally {
      clearAuthenticatedState(set)
    }
  },
}))

registerAuthSessionBridge({
  onSessionRefreshed(payload) {
    useAuthStore.setState({
      user: payload.user,
      accessContext: payload.context,
      isAuthenticated: true,
    })
  },
  onSessionCleared() {
    useAuthStore.setState({
      user: null,
      accessContext: null,
      isAuthenticated: false,
    })
  },
})
