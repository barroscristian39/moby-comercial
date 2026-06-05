import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import loginIllustration from '@/assets/illustrations/login-illustration.webp'
import { AuthShell } from '@/components/auth/auth-shell'
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow={null}
      title="Login"
      illustration={loginIllustration}
      illustrationAlt="Ilustração de acesso à plataforma"
      illustrationWrapperClassName="max-w-[200px] sm:max-w-[250px] md:max-w-[280px] lg:max-w-[336px] xl:max-w-[392px]"
    >
      <Suspense
        fallback={
          <div className="flex min-h-[280px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthShell>
  )
}
