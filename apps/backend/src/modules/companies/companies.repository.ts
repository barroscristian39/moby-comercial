import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { CreateCompanyDto } from './dto/create-company.dto'
import { UpdateCompanyDto } from './dto/update-company.dto'

@Injectable()
export class CompaniesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    tenantId?: string
    companyIds?: string[]
    page: number
    perPage: number
    search?: string
  }) {
    const where: Prisma.CompanyWhereInput = {
      deletedAt: null,
      ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      ...(params.companyIds ? { id: { in: params.companyIds } } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { tradeName: { contains: params.search, mode: 'insensitive' } },
              { cnpj: { contains: params.search } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
        orderBy: { name: 'asc' },
      }),
      this.prisma.company.count({ where }),
    ])

    return { items, total }
  }

  findById(id: string) {
    return this.prisma.company.findFirst({ where: { id, deletedAt: null } })
  }

  findByCnpj(tenantId: string, cnpj: string) {
    return this.prisma.company.findFirst({ where: { tenantId, cnpj, deletedAt: null } })
  }

  findTenantById(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } })
  }

  create(tenantId: string, data: CreateCompanyDto) {
    const { tenantId: _ignored, ...companyData } = data
    return this.prisma.company.create({ data: { ...companyData, tenantId } as any })
  }

  update(id: string, data: UpdateCompanyDto) {
    return this.prisma.company.update({ where: { id }, data })
  }

  softDelete(id: string, deletedBy: string) {
    return this.prisma.company.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy, isActive: false },
    })
  }
}
