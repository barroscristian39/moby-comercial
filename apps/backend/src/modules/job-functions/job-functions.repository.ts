import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { CreateJobFunctionDto } from './dto/create-job-function.dto'
import { UpdateJobFunctionDto } from './dto/update-job-function.dto'

@Injectable()
export class JobFunctionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string | undefined, page: number, perPage: number, unitId?: string, sectorId?: string, search?: string) {
    const where = {
      ...(companyId ? { companyId } : {}),
      deletedAt: null,
      ...(unitId ? { unitId } : {}),
      ...(sectorId ? { sectorId } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.jobFunction.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { name: 'asc' },
      }),
      this.prisma.jobFunction.count({ where }),
    ])

    return { items, total }
  }

  async findById(id: string) {
    return this.prisma.jobFunction.findFirst({ where: { id, deletedAt: null } })
  }

  async findByIdAndCompany(id: string, companyId: string) {
    return this.prisma.jobFunction.findFirst({ where: { id, companyId, deletedAt: null } })
  }

  async create(data: CreateJobFunctionDto) {
    const company = await this.prisma.company.findFirst({
      where: { id: data.companyId, deletedAt: null },
      select: { tenantId: true },
    })
    return this.prisma.jobFunction.create({ data: { ...data, tenantId: company?.tenantId } as any })
  }

  async update(id: string, data: UpdateJobFunctionDto) {
    return this.prisma.jobFunction.update({ where: { id }, data })
  }

  async softDelete(id: string, deletedBy: string) {
    return this.prisma.jobFunction.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy, isActive: false },
    })
  }
}
