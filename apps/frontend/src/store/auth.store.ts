import { create } from 'zustand'
import { api } from '@/lib/api'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  tenantId: string | null
  companyId: string | null
  companyIds: string[]
  unitIds: string[]
}

export interface AuthAccessContext {
  user_id: string
  tenant_id: string | null
  role: string
  companies_allowed: string[]
  units_allowed: string[]
  available_permissions: string[]
  menus: Array<{
    key: string
    label: string
    href: string
    permission?: string
  }>
}

export interface PendingLoginVerification {
  challengeId: string
  email: string
  deliveryHint: string
  message: string
}

export type AuthLoginResult =
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'verification_required'; verification: PendingLoginVerification }

interface AuthState {
  user: AuthUser | null
  accessContext: AuthAccessContext | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<AuthLoginResult>
  verifyLoginCode: (challengeId: string, code: string) => Promise<AuthUser>
  resendLoginCode: (challengeId: string) => Promise<PendingLoginVerification>
  logout: () => Promise<void>
  hydrate: () => void
}

function persistAuthenticatedSession(
  set: (state: Partial<AuthState>) => void,
  payload: {
    accessToken: string
    user: AuthUser
    context: AuthAccessContext
  },
) {
  sessionStorage.setItem('access_token', payload.accessToken)
  sessionStorage.setItem('user_id', payload.user.id)
  sessionStorage.setItem('auth_user', JSON.stringify(payload.user))
  sessionStorage.setItem('access_context', JSON.stringify(payload.context))

  // Cookie não-HttpOnly para o middleware do Next.js conseguir detectar a sessão.
  // O refresh_token seguro (HttpOnly) é setado pelo backend; este é apenas um sinal de rota.
  document.cookie = 'has_session=1; path=/; SameSite=Lax'

  set({ user: payload.user, accessContext: payload.context, isAuthenticated: true })
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessContext: null,
  isAuthenticated: false,

  hydrate() {
    if (typeof window === 'undefined') return
    const rawUser = sessionStorage.getItem('auth_user')
    const rawContext = sessionStorage.getItem('access_context')
    if (rawUser) {
      set({
        user: JSON.parse(rawUser),
        accessContext: rawContext ? JSON.parse(rawContext) : null,
        isAuthenticated: true,
      })
    }
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

    persistAuthenticatedSession(set, payload)
    return { status: 'authenticated', user: payload.user }
  },

  async verifyLoginCode(challengeId, code) {
    const { data } = await api.post('/auth/login/verify', { challengeId, code })
    const payload = data.data

    persistAuthenticatedSession(set, payload)
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
      sessionStorage.clear()
      // Remove o cookie de sinalização ao sair
      document.cookie = 'has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC'
      set({ user: null, accessContext: null, isAuthenticated: false })
    }
  },
}))
