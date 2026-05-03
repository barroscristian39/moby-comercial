import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { CreateEpiItemDto } from './dto/create-epi-item.dto'

@Injectable()
export class EpiItemsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    companyId: string | undefined,
    page: number,
    perPage: number,
    search?: string,
    isActive?: boolean,
  ) {
    const where = {
      ...(companyId ? { companyId } : {}),
      deletedAt: null,
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { name:         { contains: search, mode: 'insensitive' as const } },
              { caNumber:     { contains: search, mode: 'insensitive' as const } },
              { manufacturer: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.epiItem.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { name: 'asc' },
      }),
      this.prisma.epiItem.count({ where }),
    ])

    return { items, total }
  }

  async findById(id: string) {
    return this.prisma.epiItem.findFirst({ where: { id, deletedAt: null } })
  }

  async findByIdAndCompany(id: string, companyId: string) {
    return this.prisma.epiItem.findFirst({ where: { id, companyId, deletedAt: null } })
  }

  async create(data: Omit<CreateEpiItemDto, 'caExpiry'> & { caExpiry?: Date }) {
    const company = await this.prisma.company.findFirst({
      where: { id: data.companyId, deletedAt: null },
      select: { tenantId: true },
    })
    return this.prisma.epiItem.create({ data: { ...data, tenantId: company?.tenantId } as any })
  }

  async update(id: string, data: Record<string, any>) {
    return this.prisma.epiItem.update({ where: { id }, data })
  }

  // Incrementa ou decrementa estoque de forma atômica
  async adjustStock(id: string, delta: number) {
    return this.prisma.epiItem.update({
      where: { id },
      data: { stockQuantity: { increment: delta } },
    })
  }

  async softDelete(id: string, deletedBy: string) {
    return this.prisma.epiItem.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy, isActive: false },
    })
  }
}
