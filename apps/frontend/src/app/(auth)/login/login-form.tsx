'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSetupStatus } from '@/hooks/use-setup'
import { useAuthStore } from '@/store/auth.store'
import { useCompanyStore } from '@/store/company.store'
import { cn } from '@/lib/utils'

const LoginSchema = z.object({
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

type LoginDto = z.infer<typeof LoginSchema>

type Feedback = {
  message: string
  type: 'auth' | 'info' | 'network' | 'validation' | 'loading' | 'success'
}

interface LoginFormProps {
  variant?: 'desktop' | 'mobile'
}

export function LoginForm({
  variant = 'desktop',
}: LoginFormProps) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const login            = useAuthStore((s) => s.login)
  const clearActiveCompany = useCompanyStore((s) => s.clearActiveCompany)
  const { data: setupStatus, isLoading: isCheckingSetup } = useSetupStatus()
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const isMobile = variant === 'mobile'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginDto>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: searchParams.get('email') ?? '',
      password: '',
    },
  })

  useEffect(() => {
    if (searchParams.get('setup') === 'done') {
      setFeedback({
        type: 'info',
        message: 'Primeiro acesso configurado. Entre com a senha que você acabou de cadastrar.',
      })
    }
  }, [searchParams])

  useEffect(() => {
    if (!isCheckingSetup && setupStatus?.requiresBootstrap) {
      setFeedback({
        type: 'info',
        message: 'Este ambiente ainda não possui usuários. Redirecionando para o primeiro acesso...',
      })
      router.replace('/primeiro-acesso')
    }
  }, [isCheckingSetup, router, setupStatus])

  const isBusy =
    isCheckingSetup ||
    isSubmitting ||
    feedback?.type === 'loading' ||
    feedback?.type === 'success'

  async function onSubmit(data: LoginDto) {
    if (setupStatus?.requiresBootstrap) {
      setFeedback({
        type: 'info',
        message: 'Crie primeiro o administrador inicial para liberar o login neste ambiente.',
      })
      router.replace('/primeiro-acesso')
      return
    }

    setFeedback({ type: 'loading', message: 'Validando credenciais...' })
    try {
      await login(data.email, data.password)
      clearActiveCompany()
      setFeedback({ type: 'success', message: 'Acesso autorizado. Abrindo ambiente...' })

      const redirect = searchParams.get('redirect')
      const destination = redirect
        ? `/selecionar-empresa?redirect=${encodeURIComponent(redirect)}`
        : '/selecionar-empresa'
      router.replace(destination)
    } catch (err: any) {
      if (!err?.response) {
        setFeedback({ type: 'network', message: 'Não foi possível conectar ao servidor. Verifique sua conexão.' })
      } else {
        const msg = err.response?.data?.error?.message || 'E-mail ou senha incorretos.'
        setFeedback({ type: 'auth', message: msg })
      }
    }
  }

  function onInvalid() {
    setFeedback({
      type: 'validation',
      message: 'Preencha e-mail e senha para continuar.',
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className={cn('space-y-3.5', isMobile && 'space-y-4')}
      noValidate
    >
      {feedback && (
        <div
          role={feedback.type === 'loading' || feedback.type === 'success' || feedback.type === 'info' ? 'status' : 'alert'}
          aria-live="polite"
          className={cn(
            'flex items-start gap-2 rounded-2xl border px-3.5 py-3',
            isMobile && 'rounded-[24px] px-4 py-3.5',
            feedback.type === 'loading' || feedback.type === 'success' || feedback.type === 'info'
              ? 'border-primary/20 bg-primary/10'
              : 'border-destructive/20 bg-destructive/10',
          )}
        >
          {feedback.type === 'loading' && <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />}
          {feedback.type === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
          {feedback.type === 'info' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
          {feedback.type === 'network' && <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
          {(feedback.type === 'auth' || feedback.type === 'validation') && (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          )}
          <p className={feedback.type === 'loading' || feedback.type === 'success' || feedback.type === 'info' ? 'text-sm text-primary' : 'text-sm text-destructive'}>
            {feedback.message}
          </p>
        </div>
      )}

      <div className={cn('space-y-2.5', isMobile && 'space-y-3.5')}>
        <div className={cn('space-y-1.5', isMobile && 'space-y-2')}>
          <Label htmlFor="email" className="sr-only">E-mail</Label>
          <div
            className={cn(
              'login-input-pill',
              isMobile && 'login-field-shell min-h-[4.35rem] rounded-[22px] border-slate-200 bg-white px-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]',
            )}
          >
            <Mail className={cn('h-4 w-4 shrink-0 text-primary/70', isMobile && 'h-5 w-5 text-slate-400')} />
            <Input
              id="email"
              type="email"
              placeholder={isMobile ? 'E-mail corporativo' : 'voce@empresa.com'}
              autoComplete="email"
              aria-invalid={!!errors.email}
              className={cn(
                'h-11 border-0 bg-transparent px-0 text-[0.95rem] shadow-none focus-visible:border-transparent focus-visible:ring-0',
                isMobile && 'h-[3.9rem] text-[0.98rem] text-slate-700 placeholder:text-slate-400',
              )}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className={cn('px-1 text-xs text-destructive', isMobile && 'text-[0.82rem]')}>{errors.email.message}</p>
          )}
        </div>

        <div className={cn('space-y-1.5', isMobile && 'space-y-2')}>
          <Label htmlFor="password" className="sr-only">Senha</Label>
          <div
            className={cn(
              'login-input-pill',
              isMobile && 'login-field-shell min-h-[4.35rem] rounded-[22px] border-slate-200 bg-white px-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]',
            )}
          >
            <LockKeyhole className={cn('h-4 w-4 shrink-0 text-primary/70', isMobile && 'h-5 w-5 text-slate-400')} />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={isMobile ? 'Senha' : 'Sua senha'}
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              className={cn(
                'h-11 border-0 bg-transparent px-0 pr-1 text-[0.95rem] shadow-none focus-visible:border-transparent focus-visible:ring-0',
                isMobile && 'h-[3.9rem] text-[0.98rem] text-slate-700 placeholder:text-slate-400',
              )}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className={cn(
                'ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isMobile && 'h-10 w-10 text-slate-400',
              )}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? (
                <EyeOff className={cn('h-4 w-4', isMobile && 'h-5 w-5')} />
              ) : (
                <Eye className={cn('h-4 w-4', isMobile && 'h-5 w-5')} />
              )}
            </button>
          </div>
          {errors.password && (
            <p className={cn('px-1 text-xs text-destructive', isMobile && 'text-[0.82rem]')}>{errors.password.message}</p>
          )}
        </div>

        <div className="flex justify-end px-1">
          <Link
            href="/esqueci-a-senha"
            className={cn(
              'login-form-link text-xs font-medium text-primary',
              isMobile && 'text-[0.92rem] font-semibold',
            )}
          >
            Esqueceu a senha?
          </Link>
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className={cn(
          'login-submit-button h-11 w-full rounded-xl text-sm font-semibold shadow-[0_18px_36px_rgba(37,99,235,0.2)] hover:shadow-[0_22px_42px_rgba(37,99,235,0.24)] disabled:opacity-100',
          isMobile && 'h-[3.85rem] rounded-[22px] bg-gradient-to-r from-[#1f63ff] via-[#2058f0] to-[#1848db] text-base shadow-[0_22px_42px_rgba(37,99,235,0.28)]',
        )}
        disabled={isBusy}
        aria-busy={isBusy}
        data-loading={isBusy ? 'true' : 'false'}
      >
        <span className="relative z-10 inline-flex items-center justify-center gap-2">
          {feedback?.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : isBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          {feedback?.type === 'success'
            ? 'Abrindo...'
            : isBusy
              ? 'Entrando...'
              : 'Entrar'}
        </span>
      </Button>

      {isMobile ? (
        <div className="pt-0.5">
          <div className="flex items-center justify-center gap-2 text-[0.9rem] text-slate-400">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span>Acesso protegido</span>
          </div>
        </div>
      ) : (
        <p className="text-center text-[11px] text-slate-500">
          Acesso protegido
        </p>
      )}
    </form>
  )
}
