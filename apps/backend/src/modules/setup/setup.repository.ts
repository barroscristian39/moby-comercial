import { Injectable } from '@nestjs/common'
import { Role } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'

@Injectable()
export class SetupRepository {
  constructor(private readonly prisma: PrismaService) {}

  countUsers() {
    return this.prisma.user.count({
      where: { deletedAt: null },
    })
  }

  async createBootstrapSuperAdmin(data: {
    name: string
    email: string
    passwordHash: string
  }) {
    const existingUsers = await this.prisma.user.count({
      where: { deletedAt: null },
    })

    if (existingUsers > 0) return null

    return this.prisma.user.create({
      data: {
        tenantId: null,
        companyId: null,
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        role: Role.SUPER_ADMIN,
        isActive: true,
      },
    })
  }
}
