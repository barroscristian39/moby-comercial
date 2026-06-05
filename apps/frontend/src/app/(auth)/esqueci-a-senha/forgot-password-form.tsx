'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Mail, ShieldCheck, WifiOff } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordReset } from '@/lib/api/auth-password.api'
import { cn } from '@/lib/utils'

const ForgotPasswordSchema = z.object({
  email: z.string().email('Informe um e-mail válido').transform((value) => value.trim().toLowerCase()),
})

type ForgotPasswordFormData = z.infer<typeof ForgotPasswordSchema>

type Feedback = {
  message: string
  type: 'network' | 'validation' | 'loading' | 'success' | 'error'
}

export function ForgotPasswordForm() {
  const searchParams = useSearchParams()
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [requestedEmail, setRequestedEmail] = useState(searchParams.get('email') ?? '')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: searchParams.get('email') ?? '',
    },
  })

  async function onSubmit(values: ForgotPasswordFormData) {
    setRequestedEmail(values.email)
    setFeedback({ type: 'loading', message: 'Validando e-mail...' })

    try {
      const response = await requestPasswordReset(values.email)
      setFeedback({
        type: 'success',
        message: response.message,
      })
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
        message: error.response?.data?.error?.message || 'Não foi possível iniciar a recuperação de senha.',
      })
    }
  }

  function onInvalid() {
    setFeedback({
      type: 'validation',
      message: 'Informe um e-mail válido para continuar.',
    })
  }

  const isBusy = isSubmitting || feedback?.type === 'loading'

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4" noValidate>
      {feedback && feedback.type !== 'loading' && (
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
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2563eb]" />
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
      </div>

      {feedback?.type === 'success' ? (
        <div className="rounded-md border border-[#d8e5f6] bg-[#f8fbff] px-4 py-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#2563eb]" />
            <div className="space-y-3">
              <p className="text-sm leading-6 text-[#475569]">
                As instruções e o código de 6 dígitos foram enviados para o e-mail informado. Depois disso, continue na tela de redefinição.
              </p>
              <Link
                href={`/redefinir-senha?email=${encodeURIComponent(requestedEmail)}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563eb] transition-colors hover:text-[#1d4ed8]"
              >
                Já recebi o código
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="h-11 w-full rounded-md bg-[#2563eb] text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.18)] transition-colors duration-200 hover:bg-[#1d4ed8] disabled:opacity-100"
        disabled={isBusy}
        aria-busy={isBusy}
      >
        <span className="inline-flex items-center gap-2">
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isBusy ? 'Enviando...' : 'Enviar instruções'}
        </span>
      </Button>

      <div className="space-y-3 pt-0.5">
        <div className="flex items-center justify-center gap-2 text-[0.83rem] text-[#64748b]">
          <ShieldCheck className="h-4 w-4 text-[#2563eb]" />
          <span>Código único de 6 dígitos e expiração curta.</span>
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
