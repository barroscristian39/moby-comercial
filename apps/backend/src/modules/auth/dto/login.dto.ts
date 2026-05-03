import { z } from 'zod'
import { PasswordPolicySchema } from '@moby/shared'

export const LoginSchema = z.object({
  email: z.string().email('E-mail inválido').transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1, 'Senha obrigatória'),
})

export type LoginDto = z.infer<typeof LoginSchema>

export const ForgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido').transform((value) => value.trim().toLowerCase()),
})

export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>

export const ResetPasswordSchema = z.object({
  token: z.string().min(32, 'Token inválido').max(256, 'Token inválido'),
  password: PasswordPolicySchema,
})

export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>
