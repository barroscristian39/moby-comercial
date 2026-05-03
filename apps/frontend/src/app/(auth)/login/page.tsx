'use client'

import Image from 'next/image'
import { Suspense, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import loginLogo from '@/assets/brand/login-logo.png'
import { LoginForm } from './login-form'

const skyDots = [
  { top: '11%', left: '8%', size: 'sm' },
  { top: '18%', right: '12%', size: 'md' },
  { top: '31%', left: '16%', size: 'sm' },
  { top: '67%', right: '10%', size: 'sm' },
  { top: '79%', left: '14%', size: 'md' },
] as const

const skyStreaks = [
  { top: '22%', right: '18%', width: '92px', delay: '0s' },
  { top: '58%', left: '11%', width: '74px', delay: '1.6s' },
  { top: '72%', right: '21%', width: '62px', delay: '3.2s' },
] as const

export default function LoginPage() {
  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
    }
  }, [])

  return (
    <main className="login-hero-shell relative h-[100svh] overflow-hidden">
      <div className="login-hero-noise" />
      <div className="login-hero-spotlight" />
      <div className="login-hero-shape login-hero-shape-square" />
      <div className="login-hero-shape login-hero-shape-square-secondary" />
      <div className="login-hero-shape login-hero-shape-ring" />
      <div className="login-hero-shape login-hero-shape-orb" />
      <div className="login-hero-shape login-hero-shape-line" />
      <div className="login-hero-shape login-hero-shape-line-secondary" />

      {skyDots.map((dot, index) => (
        <span
          key={`dot-${index}`}
          className={`login-sky-dot ${dot.size === 'md' ? 'login-sky-dot-md' : ''}`}
          style={{
            top: dot.top,
            left: 'left' in dot ? dot.left : undefined,
            right: 'right' in dot ? dot.right : undefined,
          }}
        />
      ))}

      {skyStreaks.map((streak, index) => (
        <span
          key={`streak-${index}`}
          className="login-sky-streak"
          style={{
            top: streak.top,
            left: 'left' in streak ? streak.left : undefined,
            right: 'right' in streak ? streak.right : undefined,
            width: streak.width,
            animationDelay: streak.delay,
          }}
        />
      ))}

      <div className="relative z-10 flex h-full items-center justify-center px-4 sm:px-6">
        <div className="w-full max-w-[430px]">
          <section className="login-auth-panel overflow-hidden rounded-[34px] border border-white/70 bg-white shadow-[0_40px_110px_rgba(15,23,42,0.28)]">
            <div className="login-scene relative isolate h-[220px] px-5 pt-5 sm:h-[248px] sm:px-6 sm:pt-6">
              <div className="relative z-20 inline-flex w-fit items-center justify-center">
                <Image
                  src={loginLogo}
                  alt="MOBY Gestão em Segurança do Trabalho"
                  priority
                  className="h-auto w-[72px] drop-shadow-[0_12px_22px_rgba(15,23,42,0.18)] sm:w-[84px]"
                />
              </div>

              <div className="login-scene-glow" />
              <div className="login-scene-orb" />
              <div className="login-scene-streak login-scene-streak-primary" />
              <div className="login-scene-streak login-scene-streak-secondary" />
              <div className="login-scene-ridge login-scene-ridge-back" />
              <div className="login-scene-ridge login-scene-ridge-mid" />
              <div className="login-scene-ridge login-scene-ridge-front" />
              <div className="login-scene-ridge login-scene-ridge-side" />
            </div>

            <div className="px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
              <div className="mb-5 space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">
                  Acesso
                </p>
                <h1 className="text-[2rem] font-semibold tracking-[-0.06em] text-foreground sm:text-[2.15rem]">
                  Entrar
                </h1>
                <p className="text-sm text-muted-foreground">
                  Use seu e-mail corporativo.
                </p>
              </div>

              <Suspense
                fallback={
                  <div className="flex min-h-[268px] items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                }
              >
                <LoginForm />
              </Suspense>
            </div>
          </section>
        </div>
      </div>

    </main>
  )
}
