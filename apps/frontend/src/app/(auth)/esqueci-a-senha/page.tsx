import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import forgotPasswordIllustration from '@/assets/illustrations/forgot-password-illustration.webp'
import { AuthShell } from '@/components/auth/auth-shell'
import { ForgotPasswordForm } from './forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Recupere seu acesso com segurança."
      title="Esqueceu a senha?"
      description="Informe seu e-mail corporativo para gerar um token temporário de recuperação."
      illustration={forgotPasswordIllustration}
      illustrationAlt="Ilustração de recuperação de senha"
      illustrationWrapperClassName="max-w-[220px] sm:max-w-[260px] md:max-w-[300px] lg:max-w-[336px] xl:max-w-[356px]"
    >
      <Suspense
        fallback={
          <div className="flex min-h-[280px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <ForgotPasswordForm />
      </Suspense>
    </AuthShell>
  )
}
