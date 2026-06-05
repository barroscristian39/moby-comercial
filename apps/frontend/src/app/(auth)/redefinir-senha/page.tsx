import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import forgotPasswordIllustration from '@/assets/illustrations/forgot-password-illustration.webp'
import { AuthShell } from '@/components/auth/auth-shell'
import { ResetPasswordForm } from './reset-password-form'

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Defina uma nova senha para continuar."
      title="Redefinir senha"
      description="Use o código de 6 dígitos recebido e escolha uma senha forte para voltar ao ambiente."
      illustration={forgotPasswordIllustration}
      illustrationAlt="Ilustração de redefinição de senha"
      illustrationWrapperClassName="max-w-[220px] sm:max-w-[260px] md:max-w-[300px] lg:max-w-[336px] xl:max-w-[356px]"
    >
      <Suspense
        fallback={
          <div className="flex min-h-[280px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  )
}
