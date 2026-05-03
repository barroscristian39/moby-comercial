'use client'

import Link from 'next/link'
import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { PasswordPolicySchema } from '@moby/shared'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { MobyLogo } from '@/components/brand/moby-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { submitPasswordReset } from '@/lib/api/auth-password.api'

const ResetPasswordSchema = z
  .object({
    token: z.string().min(32, 'Informe um token válido').max(256, 'Informe um token válido'),
    password: PasswordPolicySchema,
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'As senhas precisam ser iguais',
    path: ['confirmPassword'],
  })

type ResetPasswordFormData = z.infer<typeof ResetPasswordSchema>

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialToken = searchParams.get('token') ?? ''
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [serverMessage, setServerMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      token: initialToken,
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(values: ResetPasswordFormData) {
    setServerMessage(null)

    try {
      const response = await submitPasswordReset(values.token, values.password)
      setIsSuccess(true)
      setServerMessage(response.message)
      setTimeout(() => {
        router.push('/login')
      }, 1600)
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || 'Não foi possível redefinir a senha.'
      setServerMessage(message)
    }
  }

  return (
    <main className="login-hero-shell relative min-h-screen overflow-hidden">
      <div className="login-hero-noise" />
      <div className="login-hero-spotlight" />
      <div className="login-hero-shape login-hero-shape-square" />
      <div className="login-hero-shape login-hero-shape-square-secondary" />
      <div className="login-hero-shape login-hero-shape-ring" />
      <div className="login-hero-shape login-hero-shape-line-secondary" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1280px] flex-col px-6 py-8 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between">
          <MobyLogo tone="light" size="lg" />
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 py-1 text-xs font-medium text-white/88 backdrop-blur-sm transition-colors hover:bg-white/14"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao login
          </Link>
        </div>

        <div className="grid flex-1 items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(440px,520px)] lg:gap-16">
          <section className="hidden max-w-[430px] space-y-5 lg:block">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/82 backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-200" />
              Atualização segura de credenciais
            </p>
            <h1 className="max-w-[10ch] text-[clamp(2rem,2.8vw,3rem)] font-semibold leading-[0.96] tracking-[-0.05em] text-white">
              Escolha uma nova senha com segurança.
            </h1>
            <p className="max-w-[34ch] text-[0.96rem] leading-7 text-[rgba(239,246,255,0.9)]">
              O token de recuperação tem validade curta. Após redefinir, seus acessos antigos são revogados.
            </p>

            <div className="rounded-2xl border border-white/14 bg-white/10 p-4 backdrop-blur-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/74">
                Regras da nova senha
              </p>
              <div className="space-y-2">
                {passwordHints.map((hint) => (
                  <div key={hint} className="flex items-center gap-2 text-sm text-white/88">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-200" />
                    <span>{hint}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="w-full max-w-[520px] justify-self-center lg:justify-self-end">
            <div className="login-auth-card rounded-[30px] border border-white/70 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.22)] sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="inline-flex items-center gap-2 rounded-full border border-primary/12 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    <KeyRound className="h-3.5 w-3.5" />
                    Redefinir senha
                  </p>
                  <h2 className="text-[2rem] font-semibold tracking-[-0.05em] text-foreground">
                    Nova senha
                  </h2>
                  <p className="max-w-sm text-[0.98rem] leading-7 text-slate-500">
                    Defina uma senha forte para voltar ao ambiente com segurança.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="login-field-shell space-y-1.5 rounded-lg border border-border/70 bg-background/75 p-3">
                  <Label htmlFor="token" className="text-sm font-medium">Token de recuperação</Label>
                  <Input
                    id="token"
                    type="text"
                    placeholder="Cole aqui o token recebido"
                    aria-invalid={!!errors.token}
                    className="h-10 border-border/70 bg-muted/35 font-mono text-xs shadow-none"
                    {...register('token')}
                  />
                  {errors.token && <p className="text-xs text-destructive">{errors.token.message}</p>}
                </div>

                <div className="login-field-shell space-y-1.5 rounded-lg border border-border/70 bg-background/75 p-3">
                  <Label htmlFor="password" className="text-sm font-medium">Nova senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Sua nova senha"
                      aria-invalid={!!errors.password}
                      className="h-10 border-border/70 bg-muted/35 pr-10 shadow-none"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>

                <div className="login-field-shell space-y-1.5 rounded-lg border border-border/70 bg-background/75 p-3">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar nova senha</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Repita a nova senha"
                      aria-invalid={!!errors.confirmPassword}
                      className="h-10 border-border/70 bg-muted/35 pr-10 shadow-none"
                      {...register('confirmPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showConfirmPassword ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
                </div>

                {serverMessage && (
                  <div
                    className={
                      isSuccess
                        ? 'rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800'
                        : 'rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive'
                    }
                  >
                    <div className="flex items-start gap-2">
                      {isSuccess ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : null}
                      <span>{serverMessage}</span>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="h-11 w-full rounded-lg text-base font-semibold shadow-sm hover:shadow-md"
                  disabled={isSubmitting}
                >
                  <span className="inline-flex items-center gap-2">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {isSubmitting ? 'Salvando...' : 'Salvar nova senha'}
                  </span>
                </Button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="login-hero-shell relative min-h-screen overflow-hidden">
          <div className="login-hero-noise" />
          <div className="login-hero-spotlight" />
          <div className="login-hero-shape login-hero-shape-square" />
          <div className="login-hero-shape login-hero-shape-square-secondary" />
          <div className="login-hero-shape login-hero-shape-ring" />
          <div className="login-hero-shape login-hero-shape-line-secondary" />
          <div className="relative z-10 flex min-h-screen items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-white/80" />
          </div>
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}
