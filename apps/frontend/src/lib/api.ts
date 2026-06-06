import axios from 'axios'
import { AuthSessionPayload } from '@/lib/auth-types'
import {
  applyAuthenticatedClientSession,
  clearAuthenticatedClientSession,
  getAccessToken,
} from '@/lib/auth-session'
import { triggerToast } from '@/lib/toast-registry'

function resolveApiBaseUrl() {
  const configuredValue = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_ORIGIN
  const fallbackOrigin = 'http://localhost:3001'

  const normalizedValue = (configuredValue || fallbackOrigin).trim().replace(/\/+$/, '')
  return normalizedValue.endsWith('/api') ? normalizedValue : `${normalizedValue}/api`
}

const API_BASE_URL = resolveApiBaseUrl()

type AuthSessionBridge = {
  onSessionRefreshed?: (payload: AuthSessionPayload) => void
  onSessionCleared?: () => void
}

let authSessionBridge: AuthSessionBridge = {}

export function registerAuthSessionBridge(bridge: AuthSessionBridge) {
  authSessionBridge = bridge
}

export function resetAuthRedirectState() {
  isRedirectingToLogin = false
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // envia o cookie refresh_token automaticamente
})

// Injeta o access token em toda requisição
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// Refresh automático quando receber 401
let isRefreshing = false
let isRedirectingToLogin = false
let refreshQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function clearClientSession() {
  clearAuthenticatedClientSession()
  authSessionBridge.onSessionCleared?.()
}

function shouldBypassAuthRefresh(config?: { url?: string }) {
  const requestUrl = config?.url ?? ''

  return [
    '/auth/login',
    '/auth/login/verify',
    '/auth/login/resend',
    '/auth/refresh',
    '/auth/password/forgot',
    '/auth/password/reset',
  ].some((path) => requestUrl.includes(path))
}

function flushRefreshQueue(token?: string, error?: unknown) {
  refreshQueue.forEach((entry) => {
    if (token) {
      entry.resolve(token)
      return
    }

    entry.reject(error)
  })

  refreshQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const bypassRefresh = shouldBypassAuthRefresh(original)

    if (bypassRefresh) {
      return Promise.reject(error)
    }

    if (error.response?.status !== 401 || original._retry) {
      // Mostra erro genérico se não for 401
      if (error.response?.status !== 401 && !original._retry) {
        const apiError = error.response?.data?.error
        const firstDetail = Array.isArray(apiError?.details) ? apiError.details[0] : undefined
        const errorMessage = apiError?.message || 'Erro ao processar requisição'
        const description = firstDetail
          ? `${errorMessage}: ${firstDetail.field} ${firstDetail.message}`
          : errorMessage

        triggerToast({
          title: '✗ Erro',
          description,
          variant: 'destructive',
        })
      }
      return Promise.reject(error)
    }

    original._retry = true

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          },
          reject,
        })
      })
    }

    isRefreshing = true

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      )

      const payload = data.data as AuthSessionPayload
      const newToken = payload.accessToken
      applyAuthenticatedClientSession(payload)
      isRedirectingToLogin = false
      authSessionBridge.onSessionRefreshed?.(payload)

      flushRefreshQueue(newToken)

      original.headers.Authorization = `Bearer ${newToken}`
      return api(original)
    } catch (refreshError) {
      flushRefreshQueue(undefined, refreshError)
      clearClientSession()

      if (!isRedirectingToLogin) {
        isRedirectingToLogin = true
        triggerToast({
          title: '✗ Sessão expirada',
          description: 'Faça login novamente para continuar',
          variant: 'destructive',
        })
        window.location.replace('/login')
      }

      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  },
)
