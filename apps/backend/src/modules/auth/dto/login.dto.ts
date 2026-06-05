import { z } from 'zod'
import { PasswordPolicySchema } from '@moby/shared'

export const LoginSchema = z.object({
  email: z.string().email('E-mail inválido').transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1, 'Senha obrigatória'),
})

export type LoginDto = z.infer<typeof LoginSchema>

export const LoginVerificationSchema = z.object({
  challengeId: z.string().uuid('Desafio inválido'),
  code: z.string().regex(/^\d{6}$/, 'Informe o código de 6 dígitos'),
})

export type LoginVerificationDto = z.infer<typeof LoginVerificationSchema>

export const LoginVerificationResendSchema = z.object({
  challengeId: z.string().uuid('Desafio inválido'),
})

export type LoginVerificationResendDto = z.infer<typeof LoginVerificationResendSchema>

export const ForgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido').transform((value) => value.trim().toLowerCase()),
})

export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>

export const ResetPasswordSchema = z.object({
  email: z.string().email('E-mail inválido').transform((value) => value.trim().toLowerCase()),
  code: z.string().regex(/^\d{6}$/, 'Informe o código de 6 dígitos'),
  password: PasswordPolicySchema,
})

export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>
