import { api } from '@/lib/api'

export type ForgotPasswordResponse = {
  message: string
  devResetToken?: string
}

export type ResetPasswordResponse = {
  message: string
}

export async function requestPasswordReset(email: string) {
  const { data } = await api.post<{ data: ForgotPasswordResponse }>('/auth/password/forgot', { email })
  return data.data
}

export async function submitPasswordReset(token: string, password: string) {
  const { data } = await api.post<{ data: ResetPasswordResponse }>('/auth/password/reset', { token, password })
  return data.data
}
