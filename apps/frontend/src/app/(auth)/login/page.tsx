'use client'

import Image from 'next/image'
import { Suspense, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import sidebarNavbarLogo from '@/assets/brand/sidebar-navbar-logo.png'
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

const mobileSkyDots = [
  { top: '12%', left: '12%', size: 'sm', delay: '0.4s' },
  { top: '20%', right: '18%', size: 'md', delay: '1.2s' },
  { top: '34%', left: '20%', size: 'sm', delay: '2.2s' },
  { top: '54%', right: '30%', size: 'sm', delay: '3.1s' },
  { top: '68%', left: '14%', size: 'md', delay: '1.8s' },
] as const

const mobileSkyStreaks = [
  { top: '18%', right: '12%', width: '84px', delay: '0.8s' },
  { top: '42%', left: '8%', width: '62px', delay: '2.6s' },
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
    <main className="login-hero-shell relative min-h-[100svh] overflow-hidden">
      <div className="hidden md:block">
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
      </div>

      <div className="relative z-10 md:hidden">
        <section className="flex min-h-[100svh] flex-col bg-[#06163c]">
          <div className="login-mobile-stage relative flex min-h-[38svh] flex-col justify-center px-6 pt-6">
            <div className="login-mobile-stage-line" />
            <div className="pointer-events-none absolute -right-10 top-1/3 h-56 w-56 rounded-full border border-primary/20" />
            <div className="pointer-events-none absolute -right-16 top-[42%] h-72 w-72 rounded-full border border-primary/10" />
            <div className="pointer-events-none absolute -right-20 top-[50%] h-96 w-96 rounded-full border border-primary/10" />

            {mobileSkyDots.map((dot, index) => (
              <span
                key={`mobile-dot-${index}`}
                className={`login-sky-dot ${dot.size === 'md' ? 'login-sky-dot-md' : ''}`}
                style={{
                  top: dot.top,
                  left: 'left' in dot ? dot.left : undefined,
                  right: 'right' in dot ? dot.right : undefined,
                  animationDelay: dot.delay,
                }}
              />
            ))}

            {mobileSkyStreaks.map((streak, index) => (
              <span
                key={`mobile-streak-${index}`}
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

            <div className="login-mobile-safety-mark login-mobile-safety-mark-helmet" aria-hidden="true">
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 38C18 29.716 24.716 23 33 23C41.284 23 48 29.716 48 38V41H18V38Z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M23 27.5V22.5C23 21.1193 24.1193 20 25.5 20H28.5L31 25.5H37L39.5 20H42.5C43.8807 20 45 21.1193 45 22.5V27.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16.5 41H49.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>

            <div className="login-mobile-safety-mark login-mobile-safety-mark-shield" aria-hidden="true">
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M32 11L17 16.5V29.5C17 39.6045 23.5313 47.6696 32 52C40.4687 47.6696 47 39.6045 47 29.5V16.5L32 11Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
                <path d="M25 30.5L30 35L39.5 25.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div className="login-mobile-safety-mark login-mobile-safety-mark-wave" aria-hidden="true">
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 36H21L26 27L33 42L38 33H54" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 22H50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
              </svg>
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center pb-10 text-center">
              <Image
                src={sidebarNavbarLogo}
                alt="MOBY Gestão em Segurança do Trabalho"
                priority
                className="mb-4 h-auto w-[282px] drop-shadow-[0_20px_36px_rgba(2,8,23,0.32)]"
              />
            </div>
          </div>

          <div className="relative -mt-9 flex-1 rounded-t-[40px] bg-white px-6 pb-7 pt-6 shadow-[0_-20px_40px_rgba(15,23,42,0.12)]">
            <div className="mx-auto w-full max-w-sm">
              <div className="mb-5 space-y-1.5">
                <h1 className="text-[1.85rem] font-semibold tracking-[-0.07em] text-[#11224c]">
                  Acesso à sua conta
                </h1>
                <p className="text-[1rem] text-slate-400">
                  Entre para continuar
                </p>
              </div>

              <Suspense
                fallback={
                  <div className="flex min-h-[320px] items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                }
              >
                <LoginForm variant="mobile" />
              </Suspense>
            </div>
          </div>
        </section>
      </div>

      <div className="relative z-10 hidden min-h-[100svh] items-center justify-center px-4 py-8 sm:px-6 lg:px-8 md:flex">
        <div className="w-full max-w-[430px] sm:max-w-[460px]">
          <section className="login-auth-panel overflow-hidden rounded-[34px] border border-white/70 bg-white shadow-[0_40px_110px_rgba(15,23,42,0.28)]">
            <div className="login-scene relative isolate h-[220px] px-5 pt-5 sm:h-[248px] sm:px-6 sm:pt-6">
              <div className="relative z-20 flex justify-center pt-2">
                <Image
                  src={sidebarNavbarLogo}
                  alt="MOBY Gestão em Segurança do Trabalho"
                  priority
                  className="h-auto w-[252px] drop-shadow-[0_18px_34px_rgba(15,23,42,0.24)] sm:w-[286px]"
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

            <div className="px-5 pb-5 pt-5 sm:px-8 sm:pb-8 sm:pt-7">
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
