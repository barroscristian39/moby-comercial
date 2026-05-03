import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { CreateSectorDto } from './dto/create-sector.dto'
import { UpdateSectorDto } from './dto/update-sector.dto'

@Injectable()
export class SectorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string | undefined, page: number, perPage: number, unitId?: string, search?: string) {
    const where = {
      ...(companyId ? { companyId } : {}),
      deletedAt: null,
      ...(unitId ? { unitId } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.sector.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { name: 'asc' },
      }),
      this.prisma.sector.count({ where }),
    ])

    return { items, total }
  }

  async findById(id: string) {
    return this.prisma.sector.findFirst({ where: { id, deletedAt: null } })
  }

  async findByIdAndCompany(id: string, companyId: string) {
    return this.prisma.sector.findFirst({ where: { id, companyId, deletedAt: null } })
  }

  async create(data: CreateSectorDto) {
    const company = await this.prisma.company.findFirst({
      where: { id: data.companyId, deletedAt: null },
      select: { tenantId: true },
    })
    return this.prisma.sector.create({ data: { ...data, tenantId: company?.tenantId } as any })
  }

  async update(id: string, data: UpdateSectorDto) {
    return this.prisma.sector.update({ where: { id }, data })
  }

  async softDelete(id: string, deletedBy: string) {
    return this.prisma.sector.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy, isActive: false },
    })
  }
}
