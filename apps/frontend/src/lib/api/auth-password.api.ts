import { api } from '@/lib/api'

export type ForgotPasswordResponse = {
  message: string
}

export type ResetPasswordResponse = {
  message: string
}

export async function requestPasswordReset(email: string) {
  const { data } = await api.post<{ data: ForgotPasswordResponse }>('/auth/password/forgot', { email })
  return data.data
}

export async function submitPasswordReset(email: string, code: string, password: string) {
  const { data } = await api.post<{ data: ResetPasswordResponse }>('/auth/password/reset', { email, code, password })
  return data.data
}
