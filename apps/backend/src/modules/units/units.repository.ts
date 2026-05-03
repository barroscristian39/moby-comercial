import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CreateUnitDto } from './dto/create-unit.dto'
import { UpdateUnitDto } from './dto/update-unit.dto'

@Injectable()
export class UnitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    tenantId?: string
    companyId?: string
    unitIds?: string[]
    page: number
    perPage: number
    search?: string
  }) {
    const where: Prisma.UnitWhereInput = {
      deletedAt: null,
      ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      ...(params.companyId ? { companyId: params.companyId } : {}),
      ...(params.unitIds ? { id: { in: params.unitIds } } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { addressCity: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
        orderBy: { name: 'asc' },
      }),
      this.prisma.unit.count({ where }),
    ])

    return { items, total }
  }

  findById(id: string) {
    return this.prisma.unit.findFirst({ where: { id, deletedAt: null } })
  }

  findCompanyById(id: string) {
    return this.prisma.company.findFirst({ where: { id, deletedAt: null } })
  }

  create(tenantId: string, data: CreateUnitDto) {
    return this.prisma.unit.create({ data: { ...data, tenantId } as any })
  }

  update(id: string, data: UpdateUnitDto) {
    return this.prisma.unit.update({ where: { id }, data })
  }

  softDelete(id: string, deletedBy: string) {
    return this.prisma.unit.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy, isActive: false },
    })
  }
}
