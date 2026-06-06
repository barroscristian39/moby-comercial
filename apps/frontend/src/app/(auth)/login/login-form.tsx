'use client'

import Link from 'next/link'
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  RefreshCcw,
  ShieldCheck,
  WifiOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSetupStatus } from '@/hooks/use-setup'
import { PendingLoginVerification } from '@/lib/auth-types'
import { cn } from '@/lib/utils'
import { useCompanyStore } from '@/store/company.store'
import { useAuthStore } from '@/store/auth.store'

const PENDING_LOGIN_VERIFICATION_KEY = 'pending_login_verification'

const LoginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().optional(),
  code: z.string().optional(),
})

type LoginDto = z.infer<typeof LoginSchema>

type Feedback = {
  message: string
  type: 'auth' | 'info' | 'network' | 'validation' | 'loading' | 'success'
}

type LoginStep = 'credentials' | 'verification'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const login = useAuthStore((s) => s.login)
  const verifyLoginCode = useAuthStore((s) => s.verifyLoginCode)
  const resendLoginCode = useAuthStore((s) => s.resendLoginCode)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const clearActiveCompany = useCompanyStore((s) => s.clearActiveCompany)
  const { data: setupStatus, isLoading: isCheckingSetup } = useSetupStatus()
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<LoginStep>('credentials')
  const [pendingVerification, setPendingVerification] = useState<PendingLoginVerification | null>(null)
  const [isResendingCode, setIsResendingCode] = useState(false)
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([])

  const {
    register,
    handleSubmit,
    clearErrors,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginDto>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: searchParams.get('email') ?? '',
      password: '',
      code: '',
    },
  })

  useEffect(() => {
    register('code')
  }, [register])

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return

    const redirect = searchParams.get('redirect')
    const destination = redirect
      ? `/selecionar-empresa?redirect=${encodeURIComponent(redirect)}`
      : '/selecionar-empresa'

    router.replace(destination)
  }, [hasHydrated, isAuthenticated, router, searchParams])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const rawPendingVerification = sessionStorage.getItem(PENDING_LOGIN_VERIFICATION_KEY)
    if (!rawPendingVerification) return

    try {
      const parsed = JSON.parse(rawPendingVerification) as PendingLoginVerification
      if (!parsed?.challengeId || !parsed?.email) return

      setPendingVerification(parsed)
      setStep('verification')
      setValue('email', parsed.email)
      setFeedback({
        type: 'info',
        message: parsed.message || `Enviamos um código de 6 dígitos para ${parsed.deliveryHint}.`,
      })
    } catch {
      sessionStorage.removeItem(PENDING_LOGIN_VERIFICATION_KEY)
    }
  }, [setValue])

  useEffect(() => {
    if (searchParams.get('setup') === 'done') {
      setFeedback({
        type: 'info',
        message: 'Primeiro acesso configurado. Entre com a senha que você acabou de cadastrar.',
      })
    }
  }, [searchParams])

  useEffect(() => {
    if (isCheckingSetup || !setupStatus?.requiresBootstrap) return

    if (setupStatus.bootstrapEnabled) {
      setFeedback({
        type: 'info',
        message: 'Este ambiente ainda não possui usuários. Redirecionando para o primeiro acesso...',
      })
      router.replace('/primeiro-acesso')
      return
    }

    setFeedback({
      type: 'auth',
      message: 'Este ambiente ainda não foi inicializado e o primeiro acesso público está desabilitado.',
    })
  }, [isCheckingSetup, router, setupStatus])

  const codeValue = watch('code') ?? ''
  const codeDigits = useMemo(
    () => Array.from({ length: 6 }, (_, index) => codeValue[index] ?? ''),
    [codeValue],
  )

  const isBusy =
    isCheckingSetup ||
    isSubmitting ||
    isResendingCode ||
    feedback?.type === 'loading' ||
    feedback?.type === 'success'

  const stepDescription = useMemo(() => {
    if (step === 'verification') {
      return null
    }

    return 'Entre com sua conta para continuar.'
  }, [step])

  useEffect(() => {
    if (step !== 'verification') return

    const timer = window.setTimeout(() => {
      const firstEmptyIndex = codeDigits.findIndex((digit) => !digit)
      const targetIndex = firstEmptyIndex === -1 ? codeDigits.length - 1 : firstEmptyIndex
      codeInputRefs.current[targetIndex]?.focus()
      codeInputRefs.current[targetIndex]?.select()
    }, 40)

    return () => window.clearTimeout(timer)
  }, [codeDigits, step])

  async function redirectAfterLogin() {
    clearActiveCompany()
    setFeedback({ type: 'success', message: 'Acesso autorizado. Abrindo ambiente...' })

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(PENDING_LOGIN_VERIFICATION_KEY)
    }

    const redirect = searchParams.get('redirect')
    const destination = redirect
      ? `/selecionar-empresa?redirect=${encodeURIComponent(redirect)}`
      : '/selecionar-empresa'

    router.replace(destination)
  }

  function persistPendingVerification(verification: PendingLoginVerification) {
    setPendingVerification(verification)
    setStep('verification')
    setValue('email', verification.email)
    setValue('password', '')
    setValue('code', '')
    setShowPassword(false)

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(PENDING_LOGIN_VERIFICATION_KEY, JSON.stringify(verification))
    }
  }

  function resetVerificationStep() {
    setPendingVerification(null)
    setStep('credentials')
    setValue('password', '')
    setValue('code', '')

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(PENDING_LOGIN_VERIFICATION_KEY)
    }
  }

  function focusCodeInput(index: number) {
    const boundedIndex = Math.max(0, Math.min(5, index))
    const target = codeInputRefs.current[boundedIndex]
    target?.focus()
    target?.select()
  }

  function updateCodeValue(nextCode: string) {
    const sanitizedValue = nextCode.replace(/\D/g, '').slice(0, 6)
    setValue('code', sanitizedValue, { shouldDirty: true, shouldValidate: true })

    if (errors.code && sanitizedValue.length > 0) {
      clearErrors('code')
    }
  }

  function handleCodeDigitChange(index: number, value: string) {
    const digitsOnly = value.replace(/\D/g, '')
    if (!digitsOnly) {
      const nextDigits = [...codeDigits]
      nextDigits[index] = ''
      updateCodeValue(nextDigits.join(''))
      return
    }

    if (digitsOnly.length > 1) {
      handleCodePaste(digitsOnly)
      return
    }

    const nextDigits = [...codeDigits]
    nextDigits[index] = digitsOnly
    updateCodeValue(nextDigits.join(''))

    if (index < 5) {
      focusCodeInput(index + 1)
    }
  }

  function handleCodePaste(rawValue: string) {
    const pastedDigits = rawValue.replace(/\D/g, '').slice(0, 6)
    if (!pastedDigits) return

    updateCodeValue(pastedDigits)
    focusCodeInput(Math.min(pastedDigits.length, 6) - 1)
  }

  function handleCodeKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !codeDigits[index] && index > 0) {
      event.preventDefault()
      const nextDigits = [...codeDigits]
      nextDigits[index - 1] = ''
      updateCodeValue(nextDigits.join(''))
      focusCodeInput(index - 1)
      return
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      focusCodeInput(index - 1)
      return
    }

    if (event.key === 'ArrowRight' && index < 5) {
      event.preventDefault()
      focusCodeInput(index + 1)
    }
  }

  async function onSubmit(data: LoginDto) {
    if (setupStatus?.requiresBootstrap && setupStatus.bootstrapEnabled) {
      setFeedback({
        type: 'info',
        message: 'Crie primeiro o administrador inicial para liberar o login neste ambiente.',
      })
      router.replace('/primeiro-acesso')
      return
    }

    if (setupStatus?.requiresBootstrap && !setupStatus.bootstrapEnabled) {
      setFeedback({
        type: 'auth',
        message: 'Este ambiente ainda não foi inicializado e o primeiro acesso público está desabilitado.',
      })
      return
    }

    if (step === 'credentials') {
      if (!data.password?.trim()) {
        setError('password', { type: 'manual', message: 'Senha obrigatória' })
        setFeedback({
          type: 'validation',
          message: 'Preencha e-mail e senha para continuar.',
        })
        return
      }

      setFeedback({ type: 'loading', message: 'Validando credenciais...' })

      try {
        const result = await login(data.email, data.password)

        if (result.status === 'verification_required') {
          persistPendingVerification(result.verification)
          setFeedback({
            type: 'info',
            message: result.verification.message || `Enviamos um código de 6 dígitos para ${result.verification.deliveryHint}.`,
          })
          return
        }

        await redirectAfterLogin()
      } catch (err: any) {
        if (!err?.response) {
          setFeedback({
            type: 'network',
            message: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
          })
        } else {
          const message = err.response?.data?.error?.message || 'E-mail ou senha inválidos.'
          setFeedback({ type: 'auth', message })
        }
      }

      return
    }

    if (!pendingVerification?.challengeId) {
      setFeedback({
        type: 'validation',
        message: 'Faça o login novamente para gerar um novo código.',
      })
      resetVerificationStep()
      return
    }

    const normalizedCode = data.code?.trim() ?? ''

    if (!/^\d{6}$/.test(normalizedCode)) {
      setError('code', { type: 'manual', message: 'Informe o código de 6 dígitos' })
      setFeedback({
        type: 'validation',
        message: 'Digite o código de 6 dígitos enviado para o seu e-mail.',
      })
      return
    }

    setFeedback({ type: 'loading', message: 'Verificando código...' })

    try {
      await verifyLoginCode(pendingVerification.challengeId, normalizedCode)
      await redirectAfterLogin()
    } catch (err: any) {
      if (!err?.response) {
        setFeedback({
          type: 'network',
          message: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
        })
      } else {
        const message = err.response?.data?.error?.message || 'Código inválido ou expirado.'
        setFeedback({ type: 'auth', message })
      }
    }
  }

  function onInvalid() {
    setFeedback({
      type: 'validation',
      message:
        step === 'verification'
          ? 'Digite o código de 6 dígitos para continuar.'
          : 'Preencha e-mail e senha para continuar.',
    })
  }

  async function handleResendCode() {
    if (!pendingVerification?.challengeId || isResendingCode) return

    setIsResendingCode(true)
    setFeedback({ type: 'loading', message: 'Enviando um novo código...' })

    try {
      const verification = await resendLoginCode(pendingVerification.challengeId)
      persistPendingVerification(verification)
      setFeedback({
        type: 'info',
        message: verification.message || `Novo código enviado para ${verification.deliveryHint}.`,
      })
    } catch (err: any) {
      if (!err?.response) {
        setFeedback({
          type: 'network',
          message: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
        })
      } else {
        const message = err.response?.data?.error?.message || 'Não foi possível reenviar o código agora.'
        setFeedback({ type: 'auth', message })
      }
    } finally {
      setIsResendingCode(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4" noValidate>
      {stepDescription ? (
        <div className="space-y-2">
          <p className="text-[0.95rem] font-medium text-[#64748b]">{stepDescription}</p>
        </div>
      ) : null}

      {feedback && !['loading', 'success'].includes(feedback.type) && (
        <div
          role={feedback.type === 'info' ? 'status' : 'alert'}
          aria-live="polite"
          className={cn(
            'flex items-start gap-3 rounded-md border px-4 py-3.5',
            feedback.type === 'info'
              ? 'border-[#d8e5f6] bg-[#f6faff]'
              : 'border-[#f3d0d0] bg-[#fff7f7]',
          )}
        >
          {feedback.type === 'info' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
          {feedback.type === 'network' && <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
          {(feedback.type === 'auth' || feedback.type === 'validation') && (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          )}
          <p
            className={cn(
              'text-sm leading-6',
              feedback.type === 'info'
                ? 'text-[#1d4ed8]'
                : 'text-destructive',
            )}
          >
            {feedback.message}
          </p>
        </div>
      )}

      {step === 'credentials' ? (
        <div className="space-y-3.5">
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="px-1 text-sm font-medium text-[#475569]"
            >
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

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="px-1 text-sm font-medium text-[#475569]"
            >
              Senha
            </Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2563eb]" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Sua senha"
                autoComplete="current-password"
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

          <div className="flex justify-end px-1">
            <Link
              href="/esqueci-a-senha"
              className="text-xs font-semibold text-[#2563eb] transition-colors hover:text-[#1d4ed8]"
            >
              Esqueceu a senha?
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          <div className="space-y-2">
            <Label className="px-1 text-sm font-medium text-[#475569]">
              Código de verificação
            </Label>
            <div
              role="group"
              aria-label="Código de verificação"
              className="flex w-full items-center gap-4 px-1 py-2 sm:gap-5"
            >
              {[0, 3].map((startIndex) => (
                <div key={startIndex} className="grid flex-1 grid-cols-3 gap-3 sm:gap-4">
                  {codeDigits.slice(startIndex, startIndex + 3).map((digit, digitIndex) => {
                    const index = startIndex + digitIndex

                    return (
                      <input
                        key={index}
                        ref={(element) => {
                          codeInputRefs.current[index] = element
                        }}
                        type="text"
                        inputMode="numeric"
                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
                        maxLength={1}
                        value={digit}
                        onChange={(event) => handleCodeDigitChange(index, event.target.value)}
                        onKeyDown={(event) => handleCodeKeyDown(index, event)}
                        onFocus={(event) => event.currentTarget.select()}
                        onPaste={(event) => {
                          event.preventDefault()
                          handleCodePaste(event.clipboardData.getData('text'))
                        }}
                        aria-label={`Dígito ${index + 1} do código`}
                        aria-invalid={!!errors.code}
                        disabled={isBusy}
                        className={cn(
                          'h-12 w-full min-w-0 rounded-none border-0 border-b-2 border-b-[#0f172a] bg-transparent px-0 pb-1 text-center text-[1.55rem] font-medium text-[#0f172a] outline-none transition-all duration-200 sm:h-14 sm:text-[1.8rem]',
                          'focus:border-b-[#2563eb] focus:text-[#2563eb]',
                          'disabled:cursor-not-allowed disabled:opacity-60',
                          digit && 'border-b-[#0f172a]',
                          errors.code && 'border-b-destructive/80 focus:border-b-destructive',
                        )}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
            {errors.code && <p className="px-1 text-xs text-destructive">{errors.code.message}</p>}
          </div>

          <div className="flex items-center justify-between gap-3 px-1">
            <button
              type="button"
              onClick={resetVerificationStep}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748b] transition-colors hover:text-[#0f172a]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </button>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isBusy}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#2563eb] transition-colors hover:text-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className={cn('h-3.5 w-3.5', isResendingCode && 'animate-spin')} />
              Reenviar código
            </button>
          </div>
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="h-11 w-full rounded-md bg-[#2563eb] text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.18)] transition-colors duration-200 hover:bg-[#1d4ed8] disabled:opacity-100"
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
              ? step === 'verification'
                ? 'Verificando...'
                : 'Entrando...'
              : step === 'verification'
                ? 'Verificar código'
                : 'Entrar'}
        </span>
      </Button>

      <div className="pt-0.5">
        <div className="flex items-center justify-center gap-2 text-[0.83rem] text-[#64748b]">
          <ShieldCheck className="h-4 w-4 text-[#2563eb]" />
          <span>Ambiente protegido</span>
        </div>
      </div>
    </form>
  )
}
