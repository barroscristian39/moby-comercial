import { Injectable } from '@nestjs/common'
import { Prisma, Role, TenantStatus } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CreateTenantDto } from './dto/create-tenant.dto'
import { UpdateTenantDto } from './dto/update-tenant.dto'

@Injectable()
export class TenantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number, perPage: number, search?: string, status?: TenantStatus) {
    const where: Prisma.TenantWhereInput = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count({ where }),
    ])

    return { items, total }
  }

  findById(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } })
  }

  findBySlug(slug: string) {
    return this.prisma.tenant.findUnique({ where: { slug } })
  }

  findUserByEmail(email: string) {
    return this.prisma.user.findFirst({ where: { email, deletedAt: null } })
  }

  async createWithAdmin(data: CreateTenantDto & { slug: string; passwordHash: string; createdBy: string }) {
    const created = await this.prisma.tenant.create({
      data: {
        name: data.name,
        slug: data.slug,
        status: data.status as TenantStatus,
        plan: data.plan,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: data.isActive,
        users: {
          create: {
            name: data.admin.name,
            email: data.admin.email,
            passwordHash: data.passwordHash,
            role: Role.TENANT_ADMIN,
            isActive: true,
            createdBy: data.createdBy,
          },
        },
      },
      include: {
        users: {
          where: { email: data.admin.email },
          take: 1,
        },
      },
    })

    const { users, ...tenant } = created
    return { tenant, admin: users[0] }
  }

  update(id: string, data: UpdateTenantDto) {
    return this.prisma.tenant.update({
      where: { id },
      data: data as Prisma.TenantUpdateInput,
    })
  }

  updateStatus(id: string, status: TenantStatus, isActive: boolean) {
    return this.prisma.tenant.update({
      where: { id },
      data: { status, isActive },
    })
  }

  async deactivateTenantUsers(tenantId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { user: { tenantId } },
      data: { revokedAt: new Date() },
    })
  }
}
