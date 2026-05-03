import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AuditAction } from '@prisma/client'
import * as crypto from 'crypto'
import { AccessContext, RequestUser, Role } from '@moby/shared'
import { AuthorizationService } from '../../common/authorization/authorization.service'
import { PasswordService } from '../../common/security/password.service'
import { PrismaService } from '../../database/prisma.service'
import { AuditService } from '../audit/audit.service'
import { AuthRepository } from './auth.repository'
import { AuthResponseEntity } from './entities/auth-response.entity'
import { JwtPayload } from './strategies/jwt.strategy'

type RequestMeta = {
  ip?: string | null
  userAgent?: string | null
}

@Injectable()
export class AuthService {
  private readonly REFRESH_TOKEN_EXPIRES_DAYS = 7
  private readonly RESET_TOKEN_EXPIRES_MINUTES = 30

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
    private readonly authorizationService: AuthorizationService,
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
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
        throw new UnauthorizedException({
          error: { code: 'USER_INACTIVE', message: 'Usuário inativo', statusCode: 401 },
        })
      }

      this.authorizationService.assertTenantIsUsable(user)

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

      this.authorizationService.assertTenantIsUsable(user)
      return this.toRequestUser(user)
    })
  }

  async login(user: any, meta: RequestMeta = {}): Promise<AuthResponseEntity & { refreshToken: string }> {
    return this.prismaService.withTenant(user.tenantId ?? null, user.role, async () => {
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
    })
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
    const response: { message: string; devResetToken?: string } = {
      message: 'Se o e-mail existir, enviaremos instruções para redefinir a senha.',
    }

    if (!user || !user.isActive) return response

    try {
      this.authorizationService.assertTenantIsUsable(user)
    } catch {
      return response
    }

    const rawToken = crypto.randomBytes(48).toString('hex')
    const expiresAt = new Date(Date.now() + this.RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000)

    await this.prismaService.withTenant(user.tenantId ?? null, user.role, async () => {
      await this.authRepository.createPasswordResetToken({
        userId: user.id,
        tokenHash: this.hashToken(rawToken),
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

    if (process.env.NODE_ENV !== 'production') {
      response.devResetToken = rawToken
    }

    return response
  }

  async resetPassword(rawToken: string, password: string, meta: RequestMeta = {}) {
    const storedToken = await this.withAuthServiceContext(() =>
      this.authRepository.findPasswordResetTokenByHash(this.hashToken(rawToken)),
    )

    if (!storedToken || !storedToken.user || !storedToken.user.isActive) {
      throw new BadRequestException({
        error: { code: 'INVALID_RESET_TOKEN', message: 'Token inválido ou expirado', statusCode: 400 },
      })
    }

    this.authorizationService.assertTenantIsUsable(storedToken.user)

    await this.prismaService.withTenant(storedToken.user.tenantId ?? null, storedToken.user.role, async () => {
      await this.authRepository.updatePasswordHash(
        storedToken.user.id,
        await this.passwordService.hash(password),
      )
      await this.authRepository.markPasswordResetTokenUsed(storedToken.id)
      await this.authRepository.revokeAllUserRefreshTokens(storedToken.user.id)

      await this.auditService.record({
        tenantId: storedToken.user.tenantId,
        actorUserId: storedToken.user.id,
        action: AuditAction.PASSWORD_RESET_COMPLETE,
        entityType: 'auth',
        entityId: storedToken.user.id,
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

  private async issueTokens(user: any): Promise<AuthResponseEntity & { refreshToken: string }> {
    const requestUser = await this.toRequestUser(user)
    const payload: JwtPayload = {
      sub: user.id,
      typ: 'access',
      tenantId: requestUser.tenantId,
      role: requestUser.role,
    }

    const accessToken = this.jwtService.sign(payload)
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

  private withAuthServiceContext<T>(handler: () => Promise<T>) {
    return this.prismaService.withTenant(null, 'AUTH_SERVICE', handler)
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
}
