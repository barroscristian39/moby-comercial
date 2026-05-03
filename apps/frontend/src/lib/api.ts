import axios from 'axios'
import { triggerToast } from '@/lib/toast-registry'

function resolveApiBaseUrl() {
  const configuredValue = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_ORIGIN
  const fallbackOrigin = 'http://localhost:3001'

  const normalizedValue = (configuredValue || fallbackOrigin).trim().replace(/\/+$/, '')
  return normalizedValue.endsWith('/api') ? normalizedValue : `${normalizedValue}/api`
}

const API_BASE_URL = resolveApiBaseUrl()

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // envia o cookie refresh_token automaticamente
})

// Injeta o access token em toda requisição
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
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
  if (typeof window === 'undefined') return

  sessionStorage.clear()
  document.cookie = 'has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax'
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

    if (error.response?.status !== 401 || original._retry) {
      // Mostra erro genérico se não for 401
      if (error.response?.status !== 401 && !original._retry) {
        const errorMessage = error.response?.data?.error?.message || 'Erro ao processar requisição'
        triggerToast({
          title: '✗ Erro',
          description: errorMessage,
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

      const newToken = data.data.accessToken
      sessionStorage.setItem('access_token', newToken)

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
