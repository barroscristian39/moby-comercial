'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { PasswordPolicySchema } from '@moby/shared'
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, ShieldCheck, WifiOff } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { submitPasswordReset } from '@/lib/api/auth-password.api'
import { cn } from '@/lib/utils'

const ResetPasswordSchema = z
  .object({
    email: z.string().email('Informe um e-mail válido').transform((value) => value.trim().toLowerCase()),
    code: z.string().regex(/^\d{6}$/, 'Informe o código de 6 dígitos'),
    password: PasswordPolicySchema,
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'As senhas precisam ser iguais',
    path: ['confirmPassword'],
  })

type ResetPasswordFormData = z.infer<typeof ResetPasswordSchema>

type Feedback = {
  message: string
  type: 'network' | 'validation' | 'loading' | 'success' | 'error'
}

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get('email') ?? ''
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      email: initialEmail,
      code: '',
      password: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    const email = searchParams.get('email')
    if (email) {
      setValue('email', email, { shouldDirty: false })
    }
  }, [searchParams, setValue])

  const passwordHints = useMemo(
    () => [
      'Ao menos 8 caracteres',
      'Uma letra maiúscula',
      'Uma letra minúscula',
      'Um número',
      'Um caractere especial',
    ],
    [],
  )

  async function onSubmit(values: ResetPasswordFormData) {
    setFeedback({ type: 'loading', message: 'Salvando nova senha...' })

    try {
      const response = await submitPasswordReset(values.email, values.code, values.password)
      setFeedback({ type: 'success', message: response.message })

      setTimeout(() => {
        router.replace('/login')
      }, 1800)
    } catch (error: any) {
      if (!error?.response) {
        setFeedback({
          type: 'network',
          message: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
        })
        return
      }

      setFeedback({
        type: 'error',
        message: error.response?.data?.error?.message || 'Não foi possível redefinir a senha.',
      })
    }
  }

  function onInvalid() {
    setFeedback({
      type: 'validation',
      message: 'Revise o token e a nova senha para continuar.',
    })
  }

  const isBusy = isSubmitting || feedback?.type === 'loading' || feedback?.type === 'success'

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4" noValidate>
      {feedback && !['loading'].includes(feedback.type) && (
        <div
          role={feedback.type === 'success' ? 'status' : 'alert'}
          aria-live="polite"
          className={cn(
            'flex items-start gap-3 rounded-md border px-4 py-3.5',
            feedback.type === 'success'
              ? 'border-[#d8e5f6] bg-[#f6faff]'
              : 'border-[#f3d0d0] bg-[#fff7f7]',
          )}
        >
          {feedback.type === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
          {feedback.type === 'network' && <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
          {['error', 'validation'].includes(feedback.type) && (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          )}
          <p
            className={cn(
              'text-sm leading-6',
              feedback.type === 'success' ? 'text-[#1d4ed8]' : 'text-destructive',
            )}
          >
            {feedback.message}
          </p>
        </div>
      )}

      <div className="space-y-3.5">
        <div className="space-y-2">
          <Label htmlFor="email" className="px-1 text-sm font-medium text-[#475569]">
            E-mail
          </Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2563eb]" />
            <Input
              id="email"
              type="email"
              placeholder="voce@empresa.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              className={cn(
                'h-11 rounded-md border-[#ccd8e8] bg-white pl-10 pr-3.5 text-[0.95rem] text-[#0f172a] shadow-none placeholder:text-[#94a3b8] focus-visible:border-[#2563eb] focus-visible:ring-[3px] focus-visible:ring-[#2563eb]/12',
                errors.email && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/15',
              )}
              {...register('email')}
            />
          </div>
          {errors.email && <p className="px-1 text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="code" className="px-1 text-sm font-medium text-[#475569]">
            Código de recuperação
          </Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2563eb]" />
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Digite os 6 dígitos"
              aria-invalid={!!errors.code}
              className={cn(
                'h-11 rounded-md border-[#ccd8e8] bg-white pl-10 pr-3.5 text-[0.95rem] tracking-[0.35em] text-[#0f172a] shadow-none placeholder:tracking-normal placeholder:text-[#94a3b8] focus-visible:border-[#2563eb] focus-visible:ring-[3px] focus-visible:ring-[#2563eb]/12',
                errors.code && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/15',
              )}
              {...register('code')}
            />
          </div>
          {errors.code && <p className="px-1 text-xs text-destructive">{errors.code.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="px-1 text-sm font-medium text-[#475569]">
            Nova senha
          </Label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2563eb]" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Sua nova senha"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              className={cn(
                'h-11 rounded-md border-[#ccd8e8] bg-white pl-10 pr-11 text-[0.95rem] text-[#0f172a] shadow-none placeholder:text-[#94a3b8] focus-visible:border-[#2563eb] focus-visible:ring-[3px] focus-visible:ring-[#2563eb]/12',
                errors.password && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/15',
              )}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#94a3b8] transition-colors hover:bg-[#e8f0ff] hover:text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="px-1 text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="px-1 text-sm font-medium text-[#475569]">
            Confirmar nova senha
          </Label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2563eb]" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Repita a nova senha"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              className={cn(
                'h-11 rounded-md border-[#ccd8e8] bg-white pl-10 pr-11 text-[0.95rem] text-[#0f172a] shadow-none placeholder:text-[#94a3b8] focus-visible:border-[#2563eb] focus-visible:ring-[3px] focus-visible:ring-[#2563eb]/12',
                errors.confirmPassword && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/15',
              )}
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((value) => !value)}
              className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#94a3b8] transition-colors hover:bg-[#e8f0ff] hover:text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={showConfirmPassword ? 'Ocultar confirmação' : 'Mostrar confirmação'}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="px-1 text-xs text-destructive">{errors.confirmPassword.message}</p>}
        </div>
      </div>

      <div className="rounded-md border border-[#d8e5f6] bg-[#f8fbff] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2563eb]">
          Regras da senha
        </p>
        <div className="mt-3 space-y-2">
          {passwordHints.map((hint) => (
            <div key={hint} className="flex items-center gap-2 text-sm text-[#475569]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2563eb]" />
              <span>{hint}</span>
            </div>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className="h-11 w-full rounded-md bg-[#2563eb] text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.18)] transition-colors duration-200 hover:bg-[#1d4ed8] disabled:opacity-100"
        disabled={isBusy}
        aria-busy={isBusy}
      >
        <span className="inline-flex items-center gap-2">
          {feedback?.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : isBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          {feedback?.type === 'success' ? 'Redirecionando...' : isBusy ? 'Salvando...' : 'Salvar nova senha'}
        </span>
      </Button>

      <div className="space-y-3 pt-0.5">
        <div className="flex items-center justify-center gap-2 text-[0.83rem] text-[#64748b]">
          <ShieldCheck className="h-4 w-4 text-[#2563eb]" />
          <span>A redefinição revoga sessões antigas.</span>
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="text-xs font-semibold text-[#2563eb] transition-colors hover:text-[#1d4ed8]"
          >
            Voltar ao login
          </Link>
        </div>
      </div>
    </form>
  )
}
