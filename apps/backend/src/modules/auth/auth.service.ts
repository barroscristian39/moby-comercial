import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AuditAction } from '@prisma/client'
import * as crypto from 'crypto'
import { AccessContext, RequestUser, Role } from '@moby/shared'
import { AuthorizationService } from '../../common/authorization/authorization.service'
import { PasswordService } from '../../common/security/password.service'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import { AuthEmailService } from './auth-email.service'
import { AuthRepository } from './auth.repository'
import { AuthResponseEntity } from './entities/auth-response.entity'
import { JwtPayload } from './strategies/jwt.strategy'

type RequestMeta = {
  ip?: string | null
  userAgent?: string | null
}

type LoginVerificationChallenge = {
  requiresTwoFactor: true
  challengeId: string
  email: string
  deliveryHint: string
  message: string
}

@Injectable()
export class AuthService {
  private readonly REFRESH_TOKEN_EXPIRES_DAYS = 7
  private readonly LOGIN_VERIFICATION_EXPIRES_MINUTES = 10
  private readonly LOGIN_VERIFICATION_CODE_LENGTH = 6
  private readonly RESET_TOKEN_EXPIRES_MINUTES = 30
  private readonly RESET_CODE_LENGTH = 6

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
    private readonly authorizationService: AuthorizationService,
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly authEmailService: AuthEmailService,
  ) {}

  async validateUser(email: string, password: string, meta: RequestMeta = {}) {
    return this.withAuthServiceContext(async () => {
      const normalizedEmail = this.passwordService.normalizeEmail(email)
      const user = await this.authRepository.findUserByEmail(normalizedEmail)

      if (!user) {
        await this.auditLoginFailure(null, normalizedEmail, meta)
        return null
      }

      if (!user.isActive) {
        await this.auditLoginFailure(user.tenantId, normalizedEmail, meta)
        return null
      }

      try {
        this.authorizationService.assertTenantIsUsable(user)
      } catch {
        await this.auditLoginFailure(user.tenantId, normalizedEmail, meta)
        return null
      }

      const passwordMatch = await this.passwordService.verify(password, user.passwordHash)
      if (!passwordMatch) {
        await this.auditLoginFailure(user.tenantId, normalizedEmail, meta)
        return null
      }

      if (!user.passwordHash.startsWith('$scrypt$')) {
        await this.prismaService.withTenant(user.tenantId ?? null, user.role, async () => {
          await this.authRepository.updatePasswordHash(user.id, await this.passwordService.hash(password))
        })
      }

      return user
    })
  }

  async validateJwtPayload(payload: JwtPayload): Promise<RequestUser> {
    if (!payload?.sub || payload.typ !== 'access') {
      throw new UnauthorizedException({
        error: { code: 'INVALID_TOKEN', message: 'Token inválido', statusCode: 401 },
      })
    }

    return this.prismaService.withTenant(payload.tenantId ?? null, payload.role, async () => {
      const user = await this.authRepository.findUserById(payload.sub)
      if (!user || !user.isActive) {
        throw new UnauthorizedException({
          error: { code: 'USER_INACTIVE', message: 'Usuário inativo', statusCode: 401 },
        })
      }

      if (user.role !== payload.role || (user.tenantId ?? null) !== payload.tenantId) {
        throw new UnauthorizedException({
          error: { code: 'STALE_TOKEN', message: 'Sessão desatualizada', statusCode: 401 },
        })
      }

      if (user.sessionVersion !== payload.sessionVersion) {
        throw new UnauthorizedException({
          error: { code: 'SESSION_REVOKED', message: 'Sessão revogada', statusCode: 401 },
        })
      }

      this.authorizationService.assertTenantIsUsable(user)
      return this.toRequestUser(user)
    })
  }

  async login(
    user: any,
    meta: RequestMeta = {},
  ): Promise<(AuthResponseEntity & { refreshToken: string }) | LoginVerificationChallenge> {
    if (this.isEmailLoginVerificationEnabled()) {
      return this.createLoginVerificationChallenge(user, meta)
    }

    return this.completeLogin(user, meta)
  }

  async verifyLoginCode(
    challengeId: string,
    code: string,
    meta: RequestMeta = {},
  ): Promise<AuthResponseEntity & { refreshToken: string }> {
    const normalizedChallengeId = challengeId.trim()
    const storedChallenge = await this.withAuthServiceContext(() =>
      this.authRepository.findActiveLoginVerificationCodeById(normalizedChallengeId),
    )

    if (!storedChallenge || !storedChallenge.user || !storedChallenge.user.isActive) {
      throw new UnauthorizedException({
        error: { code: 'INVALID_LOGIN_CODE', message: 'Código inválido ou expirado', statusCode: 401 },
      })
    }

    const user = storedChallenge.user
    const expectedCodeHash = this.hashLoginVerificationCode(normalizedChallengeId, code)

    if (storedChallenge.codeHash !== expectedCodeHash) {
      await this.auditLoginMfaFailure(user, meta, normalizedChallengeId)
      throw new UnauthorizedException({
        error: { code: 'INVALID_LOGIN_CODE', message: 'Código inválido ou expirado', statusCode: 401 },
      })
    }

    try {
      this.authorizationService.assertTenantIsUsable(user)
    } catch {
      await this.auditLoginMfaFailure(user, meta, normalizedChallengeId)
      throw new UnauthorizedException({
        error: { code: 'INVALID_LOGIN_CODE', message: 'Código inválido ou expirado', statusCode: 401 },
      })
    }

    return this.prismaService.withTenant(user.tenantId ?? null, user.role, async () => {
      await this.authRepository.markLoginVerificationCodeUsed(storedChallenge.id)
      await this.authRepository.revokeActiveLoginVerificationCodes(user.id)

      await this.auditService.record({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: AuditAction.LOGIN_MFA_COMPLETE,
        entityType: 'auth',
        entityId: user.id,
        metadata: { email: user.email, challengeId: normalizedChallengeId },
        ip: meta.ip,
        userAgent: meta.userAgent,
      })

      return this.completeLoginWithinTenant(user, meta)
    })
  }

  async resendLoginCode(challengeId: string, meta: RequestMeta = {}): Promise<LoginVerificationChallenge> {
    const normalizedChallengeId = challengeId.trim()
    const storedChallenge = await this.withAuthServiceContext(() =>
      this.authRepository.findActiveLoginVerificationCodeById(normalizedChallengeId),
    )

    if (!storedChallenge || !storedChallenge.user || !storedChallenge.user.isActive) {
      throw new BadRequestException({
        error: { code: 'INVALID_LOGIN_CHALLENGE', message: 'Desafio de verificação inválido ou expirado', statusCode: 400 },
      })
    }

    try {
      this.authorizationService.assertTenantIsUsable(storedChallenge.user)
    } catch {
      throw new BadRequestException({
        error: { code: 'INVALID_LOGIN_CHALLENGE', message: 'Desafio de verificação inválido ou expirado', statusCode: 400 },
      })
    }

    return this.createLoginVerificationChallenge(storedChallenge.user, meta)
  }

  async refresh(rawToken: string, meta: RequestMeta = {}): Promise<AuthResponseEntity & { refreshToken: string }> {
    const tokenHash = this.hashToken(rawToken)
    const storedToken = await this.withAuthServiceContext(() => this.authRepository.findRefreshTokenByHash(tokenHash))

    if (!storedToken) {
      throw new UnauthorizedException({
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token inválido ou expirado', statusCode: 401 },
      })
    }

    const user = storedToken.user
    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        error: { code: 'USER_INACTIVE', message: 'Usuário inativo', statusCode: 401 },
      })
    }

    this.authorizationService.assertTenantIsUsable(user)

    return this.prismaService.withTenant(user.tenantId ?? null, user.role, async () => {
      await this.authRepository.revokeRefreshToken(storedToken.id)
      const response = await this.issueTokens(user)

      await this.auditService.record({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: AuditAction.REFRESH,
        entityType: 'auth',
        entityId: user.id,
        metadata: { email: user.email },
        ip: meta.ip,
        userAgent: meta.userAgent,
      })

      return response
    })
  }

  async logout(currentUser: RequestUser, meta: RequestMeta = {}): Promise<void> {
    await this.authRepository.revokeAllUserRefreshTokens(currentUser.userId)
    await this.authRepository.incrementSessionVersion(currentUser.userId)
    await this.auditService.record({
      tenantId: currentUser.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.LOGOUT,
      entityType: 'auth',
      entityId: currentUser.userId,
      metadata: {},
      ip: meta.ip,
      userAgent: meta.userAgent,
    })
  }

  async forgotPassword(email: string, meta: RequestMeta = {}) {
    const normalizedEmail = this.passwordService.normalizeEmail(email)
    const user = await this.withAuthServiceContext(() => this.authRepository.findUserByEmail(normalizedEmail))
    const response: { message: string } = {
      message: 'Se o e-mail existir, enviaremos instruções para redefinir a senha.',
    }

    if (!user || !user.isActive) return response

    try {
      this.authorizationService.assertTenantIsUsable(user)
    } catch {
      return response
    }

    const rawCode = this.generateResetCode()
    const expiresAt = new Date(Date.now() + this.RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000)

    await this.prismaService.withTenant(user.tenantId ?? null, user.role, async () => {
      await this.authRepository.revokeActivePasswordResetTokens(user.id)
      await this.authRepository.createPasswordResetToken({
        userId: user.id,
        tokenHash: this.hashPasswordResetCode(user.id, rawCode),
        expiresAt,
        ip: meta.ip ?? undefined,
        userAgent: meta.userAgent ?? undefined,
      })

      await this.auditService.record({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: AuditAction.PASSWORD_RESET_REQUEST,
        entityType: 'auth',
        entityId: user.id,
        metadata: { email: normalizedEmail },
        ip: meta.ip,
        userAgent: meta.userAgent,
      })
    })

    await this.authEmailService.sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      code: rawCode,
    })

    return response
  }

  async resetPassword(email: string, code: string, password: string, meta: RequestMeta = {}) {
    const normalizedEmail = this.passwordService.normalizeEmail(email)
    const user = await this.withAuthServiceContext(() => this.authRepository.findUserByEmail(normalizedEmail))

    if (!user || !user.isActive) {
      throw new BadRequestException({
        error: { code: 'INVALID_RESET_CODE', message: 'Código inválido ou expirado', statusCode: 400 },
      })
    }

    try {
      this.authorizationService.assertTenantIsUsable(user)
    } catch {
      throw new BadRequestException({
        error: { code: 'INVALID_RESET_CODE', message: 'Código inválido ou expirado', statusCode: 400 },
      })
    }

    const storedToken = await this.withAuthServiceContext(() =>
      this.authRepository.findPasswordResetTokenByUserIdAndHash(
        user.id,
        this.hashPasswordResetCode(user.id, code),
      ),
    )

    if (!storedToken || !storedToken.user || !storedToken.user.isActive) {
      throw new BadRequestException({
        error: { code: 'INVALID_RESET_CODE', message: 'Código inválido ou expirado', statusCode: 400 },
      })
    }

    await this.prismaService.withTenant(user.tenantId ?? null, user.role, async () => {
      await this.authRepository.updatePasswordHash(
        user.id,
        await this.passwordService.hash(password),
      )
      await this.authRepository.markPasswordResetTokenUsed(storedToken.id)
      await this.authRepository.revokeAllUserRefreshTokens(user.id)
      await this.authRepository.incrementSessionVersion(user.id)

      await this.auditService.record({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: AuditAction.PASSWORD_RESET_COMPLETE,
        entityType: 'auth',
        entityId: user.id,
        metadata: {},
        ip: meta.ip,
        userAgent: meta.userAgent,
      })
    })

    return { message: 'Senha redefinida com sucesso.' }
  }

  async getAccessContext(currentUser: RequestUser): Promise<AccessContext> {
    return this.authorizationService.buildAccessContext(currentUser)
  }

  private async completeLogin(user: any, meta: RequestMeta = {}): Promise<AuthResponseEntity & { refreshToken: string }> {
    return this.prismaService.withTenant(user.tenantId ?? null, user.role, async () =>
      this.completeLoginWithinTenant(user, meta),
    )
  }

  private async completeLoginWithinTenant(
    user: any,
    meta: RequestMeta = {},
  ): Promise<AuthResponseEntity & { refreshToken: string }> {
    const response = await this.issueTokens(user)
    await this.authRepository.updateLastLogin(user.id)
    await this.auditService.record({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: AuditAction.LOGIN,
      entityType: 'auth',
      entityId: user.id,
      metadata: { email: user.email },
      ip: meta.ip,
      userAgent: meta.userAgent,
    })
    return response
  }

  private async createLoginVerificationChallenge(user: any, meta: RequestMeta = {}): Promise<LoginVerificationChallenge> {
    const rawCode = this.generateLoginVerificationCode()
    const challengeId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + this.LOGIN_VERIFICATION_EXPIRES_MINUTES * 60 * 1000)

    await this.prismaService.withTenant(user.tenantId ?? null, user.role, async () => {
      await this.authRepository.revokeActiveLoginVerificationCodes(user.id)
      await this.authRepository.createLoginVerificationCode({
        id: challengeId,
        userId: user.id,
        codeHash: this.hashLoginVerificationCode(challengeId, rawCode),
        expiresAt,
        ip: meta.ip ?? undefined,
        userAgent: meta.userAgent ?? undefined,
      })

      await this.auditService.record({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: AuditAction.LOGIN_MFA_REQUEST,
        entityType: 'auth',
        entityId: user.id,
        metadata: { email: user.email, challengeId },
        ip: meta.ip,
        userAgent: meta.userAgent,
      })
    })

    const deliveryResult = await this.authEmailService.sendLoginVerificationEmail({
      email: user.email,
      name: user.name,
      code: rawCode,
    })

    if (!deliveryResult.delivered) {
      await this.prismaService.withTenant(user.tenantId ?? null, user.role, async () => {
        await this.authRepository.revokeActiveLoginVerificationCodes(user.id)
      })

      throw new ServiceUnavailableException({
        error: {
          code: 'LOGIN_CODE_DELIVERY_FAILED',
          message: 'Nao foi possivel enviar o codigo de verificacao. Tente novamente.',
          statusCode: 503,
        },
      })
    }

    return {
      requiresTwoFactor: true,
      challengeId,
      email: user.email,
      deliveryHint: this.maskEmail(user.email),
      message: 'Enviamos um código de 6 dígitos para o seu e-mail.',
    }
  }

  private async issueTokens(user: any): Promise<AuthResponseEntity & { refreshToken: string }> {
    const requestUser = await this.toRequestUser(user)
    const payload: JwtPayload = {
      sub: user.id,
      typ: 'access',
      tenantId: requestUser.tenantId,
      role: requestUser.role,
      sessionVersion: user.sessionVersion ?? 0,
    }

    const accessToken = this.jwtService.sign(payload, { jwtid: crypto.randomUUID() })
    const refreshToken = await this.generateRefreshToken(user.id)
    const context = this.authorizationService.buildAccessContext(requestUser)

    return {
      accessToken,
      refreshToken,
      context,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: requestUser.tenantId,
        companyId: requestUser.companyId,
        companyIds: requestUser.companyIds,
        unitIds: requestUser.unitIds,
      },
    }
  }

  private async toRequestUser(user: any): Promise<RequestUser> {
    const companyIds = user.companyAccess?.map((access: any) => access.companyId) ?? []
    const unitIds = user.unitAccess?.map((access: any) => access.unitId) ?? []
    const base: RequestUser = {
      userId: user.id,
      tenantId: user.tenantId ?? null,
      companyId: user.companyId ?? companyIds[0] ?? null,
      role: user.role,
      companyIds,
      unitIds,
      permissions: this.authorizationService.permissionsForRole(user.role),
      email: user.email,
      name: user.name,
    }

    return this.authorizationService.expandScopeForAdmin(base)
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const rawToken = crypto.randomBytes(48).toString('hex')
    const tokenHash = this.hashToken(rawToken)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRES_DAYS)

    await this.authRepository.createRefreshToken({ userId, tokenHash, expiresAt })
    return rawToken
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  private hashPasswordResetCode(userId: string, code: string): string {
    return this.hashToken(`${userId}:${code.trim()}`)
  }

  private hashLoginVerificationCode(challengeId: string, code: string): string {
    return this.hashToken(`${challengeId}:${code.trim()}`)
  }

  private generateLoginVerificationCode(): string {
    return this.generateNumericCode(this.LOGIN_VERIFICATION_CODE_LENGTH)
  }

  private generateResetCode(): string {
    return this.generateNumericCode(this.RESET_CODE_LENGTH)
  }

  private generateNumericCode(length: number): string {
    return crypto.randomInt(0, 10 ** length).toString().padStart(length, '0')
  }

  private withAuthServiceContext<T>(handler: () => Promise<T>) {
    return this.prismaService.withTenant(null, 'AUTH_SERVICE', handler)
  }

  private isEmailLoginVerificationEnabled() {
    return process.env.EMAIL_LOGIN_2FA_ENABLED?.trim().toLowerCase() !== 'false'
  }

  private maskEmail(email: string) {
    const [localPart, domain = ''] = email.split('@')
    const domainParts = domain.split('.')
    const domainName = domainParts.shift() ?? ''
    const domainSuffix = domainParts.length ? `.${domainParts.join('.')}` : ''

    const maskedLocal =
      localPart.length <= 2
        ? `${localPart[0] ?? '*'}*`
        : `${localPart.slice(0, 2)}${'*'.repeat(Math.max(localPart.length - 2, 2))}`
    const maskedDomain =
      domainName.length <= 1
        ? '*'
        : `${domainName[0]}${'*'.repeat(Math.max(domainName.length - 1, 2))}`

    return `${maskedLocal}@${maskedDomain}${domainSuffix}`
  }

  private async auditLoginFailure(tenantId: string | null, email: string, meta: RequestMeta) {
    await this.auditService.record({
      tenantId,
      actorUserId: null,
      action: AuditAction.LOGIN_FAILED,
      entityType: 'auth',
      entityId: null,
      metadata: { email },
      ip: meta.ip,
      userAgent: meta.userAgent,
    })
  }

  private async auditLoginMfaFailure(user: { id: string; tenantId: string | null; email: string }, meta: RequestMeta, challengeId: string) {
    await this.auditService.record({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: AuditAction.LOGIN_MFA_FAILED,
      entityType: 'auth',
      entityId: user.id,
      metadata: { email: user.email, challengeId },
      ip: meta.ip,
      userAgent: meta.userAgent,
    })
  }
}
