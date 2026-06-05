import { Injectable, Logger } from '@nestjs/common'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

type PasswordResetEmailPayload = {
  email: string
  name?: string | null
  code: string
}

type LoginVerificationEmailPayload = {
  email: string
  name?: string | null
  code: string
}

type PasswordResetDispatchResult = {
  delivered: boolean
  provider: 'resend' | 'disabled'
  messageId?: string | null
}

type EmailAttachment = {
  content: string
  filename: string
  contentId?: string
  content_id?: string
  contentType?: string
  content_type?: string
}

@Injectable()
export class AuthEmailService {
  private readonly logger = new Logger(AuthEmailService.name)
  private readonly inlineAttachmentCache = new Map<string, string>()

  async sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<PasswordResetDispatchResult> {
    const config = this.getMailConfig()

    if (!config) {
      return { delivered: false, provider: 'disabled' }
    }

    const recipient = this.resolveRecipient(payload.email)

    const resetUrl = new URL(config.passwordResetUrlBase)
    resetUrl.searchParams.set('email', payload.email)

    return this.sendEmail({
      config,
      payload: {
        from: config.mailFrom,
        to: [recipient],
        subject: 'Redefina sua senha - MOBY SST',
        html: this.buildPasswordResetHtml({
          code: payload.code,
          recipientName: payload.name,
          resetUrl: resetUrl.toString(),
        }),
        text: this.buildPasswordResetText({
          code: payload.code,
          recipientName: payload.name,
          resetUrl: resetUrl.toString(),
        }),
      },
      errorContext: 'password reset',
    })
  }

  async sendLoginVerificationEmail(payload: LoginVerificationEmailPayload): Promise<PasswordResetDispatchResult> {
    const config = this.getMailConfig()

    if (!config) {
      return { delivered: false, provider: 'disabled' }
    }

    const recipient = this.resolveRecipient(payload.email)
    const loginUrl = `${config.frontendOrigin}/login`
    const logoAttachment = this.buildInlineAttachment({
      filename: 'moby-email-logo-transparent.png',
      contentId: 'moby-email-logo',
      contentType: 'image/png',
    })
    const illustrationAttachment = this.buildInlineAttachment({
      filename: 'login-auth-email-illustration.webp',
      contentId: 'login-auth-email-illustration',
      contentType: 'image/webp',
    })
    const attachments = [logoAttachment, illustrationAttachment].filter(
      (attachment): attachment is EmailAttachment => Boolean(attachment),
    )

    return this.sendEmail({
      config,
      payload: {
        from: config.mailFrom,
        to: [recipient],
        subject: 'Seu código de acesso - MOBY SST',
        html: this.buildLoginVerificationHtml({
          code: payload.code,
          recipientName: payload.name,
          loginUrl,
          logoSrc: logoAttachment ? `cid:${logoAttachment.contentId}` : null,
          illustrationSrc: illustrationAttachment ? `cid:${illustrationAttachment.contentId}` : null,
        }),
        text: this.buildLoginVerificationText({
          code: payload.code,
          recipientName: payload.name,
          loginUrl,
        }),
        attachments: attachments.length > 0 ? attachments : undefined,
      },
      errorContext: 'login verification',
    })
  }

  private async sendEmail(params: {
    config: NonNullable<ReturnType<AuthEmailService['getMailConfig']>>
    payload: {
      from: string
      to: string[]
      subject: string
      html: string
      text: string
      attachments?: EmailAttachment[]
    }
    errorContext: string
  }): Promise<PasswordResetDispatchResult> {
    const { config, payload, errorContext } = params

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        this.logger.error(
          `Failed to send ${errorContext} email via Resend: ${response.status} ${response.statusText}`,
          JSON.stringify(data ?? {}),
        )
        return { delivered: false, provider: 'resend' }
      }

      return {
        delivered: true,
        provider: 'resend',
        messageId: typeof data?.id === 'string' ? data.id : null,
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to send ${errorContext} email via Resend: ${error?.message ?? 'unknown error'}`,
      )
      return { delivered: false, provider: 'resend' }
    }
  }

  private resolveRecipient(email: string) {
    const testRecipient = process.env.MAIL_TEST_RECIPIENT?.trim()

    if (process.env.NODE_ENV !== 'production' && testRecipient) {
      return testRecipient
    }

    return email
  }

  private getMailConfig() {
    const provider = (process.env.MAIL_PROVIDER || '').trim().toLowerCase()

    if (provider !== 'resend') {
      return null
    }

    const resendApiKey = process.env.RESEND_API_KEY?.trim()
    const mailFrom = process.env.MAIL_FROM?.trim()
    const passwordResetUrlBase = this.resolvePasswordResetUrlBase()
    const frontendOrigin = this.resolveFrontendOrigin()

    if (!resendApiKey || !mailFrom || !passwordResetUrlBase || !frontendOrigin) {
      return null
    }

    return {
      resendApiKey,
      mailFrom,
      passwordResetUrlBase,
      frontendOrigin,
    }
  }

  private resolveFrontendOrigin() {
    return (process.env.FRONTEND_URL || '')
      .split(',')
      .map((origin) => origin.trim().replace(/\/+$/, ''))
      .find(Boolean) || null
  }

  private resolvePasswordResetUrlBase() {
    const explicitUrl = process.env.PASSWORD_RESET_URL_BASE?.trim()

    if (explicitUrl) {
      return explicitUrl.replace(/\/+$/, '')
    }

    const frontendOrigin = (process.env.FRONTEND_URL || '')
      .split(',')
      .map((origin) => origin.trim())
      .find(Boolean)

    if (!frontendOrigin) {
      return null
    }

    return `${frontendOrigin.replace(/\/+$/, '')}/redefinir-senha`
  }

  private buildLoginVerificationHtml(payload: {
    code: string
    recipientName?: string | null
    loginUrl: string
    logoSrc?: string | null
    illustrationSrc?: string | null
  }) {
    const recipientName = payload.recipientName?.trim() || 'Olá'
    const logoBlock = payload.logoSrc
      ? `
        <div style="display:block;max-width:100%;text-align:center;">
          <img src="${payload.logoSrc}" alt="MOBY SST" style="display:block;width:300px;max-width:100%;height:auto;margin:0 auto;">
        </div>
      `.trim()
      : `
        <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.78;">MOBY SST</p>
      `.trim()
    const illustrationBlock = payload.illustrationSrc
      ? `
        <div style="margin:0 0 24px;padding:22px 18px;border-radius:18px;background:linear-gradient(180deg,#f8fbff 0%,#eef5ff 100%);border:1px solid #d8e3f0;text-align:center;">
          <img src="${payload.illustrationSrc}" alt="Ilustração de acesso seguro à conta" style="display:block;width:100%;max-width:250px;height:auto;margin:0 auto;">
        </div>
      `.trim()
      : ''

    return `
      <div style="margin:0;padding:32px 20px;background:linear-gradient(180deg,#eef5ff 0%,#f7fbff 100%);font-family:Arial,sans-serif;color:#0f172a;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #d8e3f0;border-radius:24px;overflow:hidden;box-shadow:0 24px 64px rgba(15,23,42,0.08);">
          <div style="padding:32px 32px 24px;background:linear-gradient(135deg,#0f172a 0%,#162544 48%,#214fbf 100%);color:#ffffff;">
            ${logoBlock}
            <div style="margin-top:12px;">
              <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.72);">Acesso seguro</p>
              <h1 style="margin:0 0 12px;font-size:30px;line-height:1.12;font-weight:700;">Seu código de verificação chegou</h1>
              <p style="margin:0;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.82);">Confirme sua identidade para concluir o login no MOBY SST com segurança.</p>
            </div>
          </div>
          <div style="padding:32px;">
            ${illustrationBlock}
            <p style="margin:0 0 14px;font-size:16px;line-height:1.7;"><strong style="font-weight:700;">${recipientName}</strong>, identificamos uma tentativa de acesso à sua conta.</p>
            <p style="margin:0 0 22px;font-size:15px;line-height:1.75;color:#475569;">Use o código abaixo para concluir o login. Ele expira em <strong style="color:#0f172a;">10 minutos</strong> e só pode ser utilizado uma vez.</p>
            <div style="margin:0 0 24px;padding:22px 20px;border-radius:18px;background:linear-gradient(180deg,#f8fbff 0%,#f1f7ff 100%);border:1px solid #d8e3f0;text-align:center;">
              <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#64748b;">Código de acesso</p>
              <p style="margin:0;font-size:38px;line-height:1;font-weight:700;letter-spacing:0.28em;color:#0f172a;">${payload.code}</p>
            </div>
            <div style="margin:0 0 22px;">
              <a href="${payload.loginUrl}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">Abrir tela de login</a>
            </div>
            <div style="padding-top:18px;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 8px;font-size:13px;line-height:1.7;color:#475569;">Se você não solicitou este acesso, ignore esta mensagem. Nenhuma alteração será realizada sem a confirmação do código.</p>
              <p style="margin:0;font-size:12px;line-height:1.7;color:#94a3b8;">Mensagem automática de segurança • MOBY SST</p>
              <p style="margin:10px 0 0;font-size:11px;line-height:1.6;color:#cbd5e1;">Desenvolvido por Cristian Barros</p>
            </div>
          </div>
        </div>
      </div>
    `.trim()
  }

  private buildLoginVerificationText(payload: { code: string; recipientName?: string | null; loginUrl: string }) {
    const recipientName = payload.recipientName?.trim() || 'Olá'

    return [
      `${recipientName}, recebemos uma tentativa de acesso à sua conta no MOBY SST.`,
      '',
      `Seu código de acesso é: ${payload.code}`,
      '',
      'Abra a tela de login para concluir a verificação:',
      payload.loginUrl,
      '',
      'Este código expira em 10 minutos.',
    ].join('\n')
  }

  private buildPasswordResetHtml(payload: { code: string; recipientName?: string | null; resetUrl: string }) {
    const recipientName = payload.recipientName?.trim() || 'Olá'

    return `
      <div style="margin:0;padding:32px 20px;background:#f4f8ff;font-family:Arial,sans-serif;color:#0f172a;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d8e3f0;border-radius:20px;overflow:hidden;box-shadow:0 24px 64px rgba(37,99,235,0.12);">
          <div style="padding:32px;background:linear-gradient(160deg,#0f172a 0%,#162544 42%,#214fbf 100%);color:#ffffff;">
            <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.78;">MOBY SST</p>
            <h1 style="margin:0;font-size:28px;line-height:1.1;font-weight:700;">Recuperação de senha</h1>
          </div>
          <div style="padding:32px;">
            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">${recipientName}, recebemos uma solicitação para redefinir a senha da sua conta.</p>
            <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#475569;">Use o código abaixo para continuar a redefinição. Ele expira em 30 minutos e revoga sessões antigas após a troca da senha.</p>
            <div style="margin:0 0 24px;padding:18px 20px;border-radius:14px;background:#f8fbff;border:1px solid #d8e3f0;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;">Código de recuperação</p>
              <p style="margin:0;font-size:34px;line-height:1;font-weight:700;letter-spacing:0.32em;color:#0f172a;">${payload.code}</p>
            </div>
            <div style="margin:0 0 24px;">
              <a href="${payload.resetUrl}" style="display:inline-block;padding:14px 20px;border-radius:10px;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">Abrir tela de redefinição</a>
            </div>
            <p style="margin:0 0 8px;font-size:13px;line-height:1.7;color:#64748b;">Se preferir, abra o link abaixo e informe manualmente o código:</p>
            <p style="margin:0;font-size:13px;line-height:1.7;color:#2563eb;word-break:break-all;">${payload.resetUrl}</p>
          </div>
        </div>
      </div>
    `.trim()
  }

  private buildPasswordResetText(payload: { code: string; recipientName?: string | null; resetUrl: string }) {
    const recipientName = payload.recipientName?.trim() || 'Olá'

    return [
      `${recipientName}, recebemos uma solicitação para redefinir a senha da sua conta no MOBY SST.`,
      '',
      `Seu código de recuperação é: ${payload.code}`,
      '',
      'Acesse o link abaixo para abrir a tela de redefinição:',
      payload.resetUrl,
      '',
      'Este link expira em 30 minutos.',
    ].join('\n')
  }

  private buildInlineAttachment(params: {
    filename: string
    contentId: string
    contentType: string
  }): EmailAttachment | null {
    try {
      let encodedContent = this.inlineAttachmentCache.get(params.filename)

      if (!encodedContent) {
        encodedContent = readFileSync(this.resolveInlineAssetPath(params.filename)).toString('base64')
        this.inlineAttachmentCache.set(params.filename, encodedContent)
      }

      return {
        content: encodedContent,
        filename: params.filename,
        contentId: params.contentId,
        content_id: params.contentId,
        contentType: params.contentType,
        content_type: params.contentType,
      }
    } catch (error: any) {
      this.logger.warn(
        `Inline email asset "${params.filename}" could not be loaded: ${error?.message ?? 'unknown error'}`,
      )
      return null
    }
  }

  private resolveInlineAssetPath(filename: string) {
    const candidatePaths = [
      join(__dirname, 'assets', filename),
      join(process.cwd(), 'dist', 'modules', 'auth', 'assets', filename),
      join(process.cwd(), 'dist', 'src', 'modules', 'auth', 'assets', filename),
      join(process.cwd(), 'src', 'modules', 'auth', 'assets', filename),
    ]

    return candidatePaths.find((candidatePath) => existsSync(candidatePath)) ?? candidatePaths[0]
  }
}
