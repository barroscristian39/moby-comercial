import { Injectable } from '@nestjs/common'
import { Prisma, Role } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'

const USER_INCLUDE = {
  companyAccess: { select: { companyId: true } },
  unitAccess: { select: { unitId: true } },
} as const

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    tenantId?: string | null
    page: number
    perPage: number
    search?: string
  }) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(params.tenantId !== undefined ? { tenantId: params.tenantId } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { email: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: USER_INCLUDE,
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ])

    return { items, total }
  }

  findById(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: USER_INCLUDE,
    })
  }

  findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    })
  }

  findTenantById(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } })
  }

  async create(data: {
    tenantId: string | null
    email: string
    passwordHash: string
    name: string
    role: Role
    isActive: boolean
    createdBy: string
    companyIds: string[]
    unitIds: string[]
  }) {
    const primaryCompanyId = data.companyIds[0] ?? null

    return this.prisma.user.create({
      data: {
        tenantId: data.tenantId,
        companyId: primaryCompanyId,
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name,
        role: data.role,
        isActive: data.isActive,
        createdBy: data.createdBy,
        companyAccess: data.companyIds.length
          ? { create: data.companyIds.map((companyId) => ({ companyId })) }
          : undefined,
        unitAccess: data.unitIds.length
          ? { create: data.unitIds.map((unitId) => ({ unitId })) }
          : undefined,
      },
      include: USER_INCLUDE,
    })
  }

  async update(
    id: string,
    data: {
      name?: string
      role?: Role
      isActive?: boolean
      companyIds?: string[]
      unitIds?: string[]
    },
  ) {
    const { companyIds, unitIds, ...userData } = data

    return this.prisma.$transaction(async (tx) => {
      if (companyIds !== undefined) {
        await tx.userCompanyAccess.deleteMany({ where: { userId: id } })
        if (companyIds.length) {
          await tx.userCompanyAccess.createMany({
            data: companyIds.map((companyId) => ({ userId: id, companyId })),
            skipDuplicates: true,
          })
        }
        ;(userData as any).companyId = companyIds[0] ?? null
      }

      if (unitIds !== undefined) {
        await tx.userUnitAccess.deleteMany({ where: { userId: id } })
        if (unitIds.length) {
          await tx.userUnitAccess.createMany({
            data: unitIds.map((unitId) => ({ userId: id, unitId })),
            skipDuplicates: true,
          })
        }
      }

      return tx.user.update({
        where: { id },
        data: userData,
        include: USER_INCLUDE,
      })
    })
  }

  async softDelete(id: string, deletedBy: string) {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy, isActive: false },
    })
  }

  async revokeRefreshTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }
}
