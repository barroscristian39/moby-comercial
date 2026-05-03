import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'

const AUTH_USER_INCLUDE = {
  tenant: true,
  companyAccess: { select: { companyId: true } },
  unitAccess: { select: { unitId: true } },
} as const

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: AUTH_USER_INCLUDE,
    })
  }

  async findUserById(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: AUTH_USER_INCLUDE,
    })
  }

  async updateLastLogin(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    })
  }

  async updatePasswordHash(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    })
  }

  async createRefreshToken(data: {
    userId: string
    tokenHash: string
    expiresAt: Date
  }) {
    return this.prisma.refreshToken.create({ data })
  }

  async findRefreshTokenByHash(tokenHash: string) {
    return this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: { include: AUTH_USER_INCLUDE } },
    })
  }

  async revokeRefreshToken(id: string) {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    })
  }

  async revokeAllUserRefreshTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  async createPasswordResetToken(data: {
    userId: string
    tokenHash: string
    expiresAt: Date
    ip?: string
    userAgent?: string
  }) {
    return this.prisma.passwordResetToken.create({ data })
  }

  async findPasswordResetTokenByHash(tokenHash: string) {
    return this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: { include: AUTH_USER_INCLUDE } },
    })
  }

  async markPasswordResetTokenUsed(id: string) {
    await this.prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    })
  }
}
