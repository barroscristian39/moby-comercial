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

interface AuthState {
  user: AuthUser | null
  accessContext: AuthAccessContext | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  hydrate: () => void
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
    const { accessToken, user, context } = data.data

    sessionStorage.setItem('access_token', accessToken)
    sessionStorage.setItem('user_id', user.id)
    sessionStorage.setItem('auth_user', JSON.stringify(user))
    sessionStorage.setItem('access_context', JSON.stringify(context))

    // Cookie não-HttpOnly para o middleware do Next.js conseguir detectar a sessão.
    // O refresh_token seguro (HttpOnly) é setado pelo backend; este é apenas um sinal de rota.
    document.cookie = 'has_session=1; path=/; SameSite=Lax'

    set({ user, accessContext: context, isAuthenticated: true })
    return user
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
