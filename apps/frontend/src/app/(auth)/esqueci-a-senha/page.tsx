'use client'

import Link from 'next/link'
import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, CheckCircle2, Loader2, Mail, Sparkles } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { MobyLogo } from '@/components/brand/moby-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordReset } from '@/lib/api/auth-password.api'

const ForgotPasswordSchema = z.object({
  email: z.string().email('Informe um e-mail válido').transform((value) => value.trim().toLowerCase()),
})

type ForgotPasswordFormData = z.infer<typeof ForgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [serverMessage, setServerMessage] = useState<string | null>(null)
  const [devResetToken, setDevResetToken] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(ForgotPasswordSchema),
  })

  async function onSubmit(values: ForgotPasswordFormData) {
    setServerMessage(null)
    setDevResetToken(null)

    try {
      const response = await requestPasswordReset(values.email)
      setServerMessage(response.message)
      setDevResetToken(response.devResetToken ?? null)
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || 'Não foi possível iniciar a recuperação de senha.'
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

        <div className="grid flex-1 items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,500px)] lg:gap-16">
          <section className="hidden max-w-[430px] space-y-5 lg:block">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/82 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-blue-200" />
              Recuperação segura de acesso
            </p>
            <h1 className="max-w-[10ch] text-[clamp(2rem,2.8vw,3rem)] font-semibold leading-[0.96] tracking-[-0.05em] text-white">
              Redefina sua senha sem sair do fluxo.
            </h1>
            <p className="max-w-[34ch] text-[0.96rem] leading-7 text-[rgba(239,246,255,0.9)]">
              Informe seu e-mail corporativo para gerar um token de recuperação e continuar com segurança.
            </p>
          </section>

          <section className="w-full max-w-[500px] justify-self-center lg:justify-self-end">
            <div className="login-auth-card rounded-[30px] border border-white/70 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.22)] sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="inline-flex items-center gap-2 rounded-full border border-primary/12 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    <Mail className="h-3.5 w-3.5" />
                    Recuperar senha
                  </p>
                  <h2 className="text-[2rem] font-semibold tracking-[-0.05em] text-foreground">
                    Esqueceu a senha?
                  </h2>
                  <p className="max-w-sm text-[0.98rem] leading-7 text-slate-500">
                    Enviaremos as instruções para redefinir o acesso da sua conta.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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

                {serverMessage && (
                  <div className="rounded-xl border border-primary/12 bg-primary/5 px-4 py-3 text-sm text-slate-600">
                    {serverMessage}
                  </div>
                )}

                {devResetToken && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Ambiente local detectado
                    </div>
                    <p className="text-sm leading-6 text-emerald-800">
                      Como o envio de e-mail ainda não está configurado, você pode continuar direto pela redefinição.
                    </p>
                    <div className="mt-3">
                      <Link
                        href={`/redefinir-senha?token=${encodeURIComponent(devResetToken)}`}
                        className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                      >
                        Abrir redefinição de senha
                      </Link>
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
                    {isSubmitting ? 'Enviando...' : 'Enviar instruções'}
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
