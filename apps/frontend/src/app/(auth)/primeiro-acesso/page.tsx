'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { PasswordPolicySchema } from '@moby/shared'
import { MobyLogo } from '@/components/brand/moby-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useBootstrapSetup, useSetupStatus } from '@/hooks/use-setup'

const FirstAccessSchema = z
  .object({
    name: z.string().min(2, 'Informe o nome do administrador'),
    email: z.string().email('Informe um e-mail válido').transform((value) => value.trim().toLowerCase()),
    password: PasswordPolicySchema,
    confirmPassword: z.string().min(1, 'Confirme a senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  })

type FirstAccessFormData = z.infer<typeof FirstAccessSchema>

type Feedback = {
  message: string
  type: 'error' | 'loading' | 'success'
}

export default function FirstAccessPage() {
  const router = useRouter()
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const { data: setupStatus, isLoading: isCheckingStatus } = useSetupStatus()
  const bootstrapSetup = useBootstrapSetup()
  const bootstrapLocked = !!setupStatus?.requiresBootstrap && !setupStatus?.bootstrapEnabled

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FirstAccessFormData>({
    resolver: zodResolver(FirstAccessSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    if (!isCheckingStatus && setupStatus && !setupStatus.requiresBootstrap) {
      router.replace('/login')
    }
  }, [isCheckingStatus, router, setupStatus])

  const isBusy = isCheckingStatus || isSubmitting || bootstrapSetup.isPending || feedback?.type === 'loading'

  async function onSubmit(values: FirstAccessFormData) {
    if (bootstrapLocked) {
      setFeedback({
        type: 'error',
        message: 'O primeiro acesso público está desabilitado para este ambiente.',
      })
      return
    }

    setFeedback({ type: 'loading', message: 'Criando o acesso inicial da plataforma...' })

    try {
      await bootstrapSetup.mutateAsync({
        name: values.name.trim(),
        email: values.email,
        password: values.password,
      })

      setFeedback({ type: 'success', message: 'Primeiro acesso criado. Redirecionando para o login...' })
      router.replace(`/login?setup=done&email=${encodeURIComponent(values.email)}`)
    } catch (error: any) {
      if (error?.response?.data?.error?.code === 'BOOTSTRAP_ALREADY_COMPLETED') {
        router.replace('/login')
        return
      }

      const message =
        error?.response?.data?.error?.message || 'Não foi possível concluir o primeiro acesso.'

      setFeedback({ type: 'error', message })
    }
  }

  if (!isCheckingStatus && setupStatus && !setupStatus.requiresBootstrap) {
    return null
  }

  return (
    <main className="login-hero-shell relative min-h-screen overflow-hidden">
      <div className="login-hero-noise" />
      <div className="login-hero-spotlight" />
      <div className="login-hero-shape login-hero-shape-square" />
      <div className="login-hero-shape login-hero-shape-square-secondary" />
      <div className="login-hero-shape login-hero-shape-ring" />
      <div className="login-hero-shape login-hero-shape-orb" />
      <div className="login-hero-shape login-hero-shape-line" />

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

        <div className="grid flex-1 items-center gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,520px)] lg:gap-16">
          <section className="hidden max-w-[460px] space-y-5 lg:block">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/82 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-blue-200" />
              Configuração inicial do ambiente
            </p>
            <h1 className="max-w-[11ch] text-[clamp(2rem,2.8vw,3rem)] font-semibold leading-[0.96] tracking-[-0.05em] text-white">
              Primeiro acesso sem ambiente ou empresa pré-criados.
            </h1>
            <p className="max-w-[35ch] text-[0.96rem] leading-7 text-[rgba(239,246,255,0.9)]">
              Este passo cria apenas o administrador da plataforma. Depois do login, você mesmo cadastra o ambiente e a primeira empresa dentro do MOBY.
            </p>
          </section>

          <section className="w-full max-w-[520px] justify-self-center lg:justify-self-end">
            <div className="login-auth-card rounded-[30px] border border-white/70 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.22)] sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="inline-flex items-center gap-2 rounded-full border border-primary/12 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Primeiro acesso
                  </p>
                  <h2 className="text-[2rem] font-semibold tracking-[-0.05em] text-foreground">
                    Configure o administrador inicial
                  </h2>
                  <p className="max-w-md text-[0.98rem] leading-7 text-slate-500">
                    Nenhum usuário foi encontrado neste ambiente. Defina agora quem terá acesso inicial à plataforma.
                  </p>
                </div>
              </div>

              <div className="mb-4 rounded-xl border border-primary/12 bg-primary/5 px-4 py-3 text-sm text-slate-600">
                O ambiente e a primeira empresa não serão criados aqui. Eles continuam 100% sob sua criação manual dentro do MOBY.
              </div>

              {bootstrapLocked ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                    O banco ainda está vazio, mas o primeiro acesso público foi bloqueado neste ambiente. Habilite
                    temporariamente o bootstrap apenas durante a implantação inicial ou conclua a criação do
                    administrador por um canal administrativo controlado.
                  </div>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="h-11 w-full rounded-lg text-base font-semibold"
                    onClick={() => router.replace('/login')}
                  >
                    Voltar ao login
                  </Button>
                </div>
              ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="login-field-shell space-y-1.5 rounded-lg border border-border/70 bg-background/75 p-3">
                  <Label htmlFor="name" className="text-sm font-medium">Nome do administrador</Label>
                  <Input
                    id="name"
                    placeholder="Nome completo"
                    autoComplete="name"
                    aria-invalid={!!errors.name}
                    className="h-10 border-border/70 bg-muted/35 shadow-none"
                    {...register('name')}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>

                <div className="login-field-shell space-y-1.5 rounded-lg border border-border/70 bg-background/75 p-3">
                  <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="voce@empresa.com"
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                    className="h-10 border-border/70 bg-muted/35 shadow-none"
                    {...register('email')}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="login-field-shell space-y-1.5 rounded-lg border border-border/70 bg-background/75 p-3">
                    <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      autoComplete="new-password"
                      aria-invalid={!!errors.password}
                      className="h-10 border-border/70 bg-muted/35 shadow-none"
                      {...register('password')}
                    />
                    {errors.password ? (
                      <p className="text-xs text-destructive">{errors.password.message}</p>
                    ) : (
                      <p className="text-[11px] leading-4.5 text-slate-500">
                        Use uma senha forte para o acesso inicial da plataforma.
                      </p>
                    )}
                  </div>

                  <div className="login-field-shell space-y-1.5 rounded-lg border border-border/70 bg-background/75 p-3">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Repita a senha"
                      autoComplete="new-password"
                      aria-invalid={!!errors.confirmPassword}
                      className="h-10 border-border/70 bg-muted/35 shadow-none"
                      {...register('confirmPassword')}
                    />
                    {errors.confirmPassword && (
                      <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>

                {feedback && (
                  <div
                    role={feedback.type === 'loading' || feedback.type === 'success' ? 'status' : 'alert'}
                    aria-live="polite"
                    className={
                      feedback.type === 'error'
                        ? 'flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-3'
                        : 'flex items-start gap-2 rounded-md border border-primary/25 bg-primary/10 px-3 py-3'
                    }
                  >
                    {feedback.type === 'loading' ? (
                      <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
                    ) : (
                      <CheckCircle2
                        className={`mt-0.5 h-4 w-4 shrink-0 ${feedback.type === 'error' ? 'text-destructive' : 'text-primary'}`}
                      />
                    )}
                    <p
                      className={
                        feedback.type === 'error' ? 'text-sm text-destructive' : 'text-sm text-primary'
                      }
                    >
                      {feedback.message}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="h-11 w-full rounded-lg text-base font-semibold shadow-sm hover:shadow-md"
                  disabled={isBusy}
                >
                  <span className="inline-flex items-center gap-2">
                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {isBusy ? 'Configurando...' : 'Criar primeiro acesso'}
                  </span>
                </Button>
              </form>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
