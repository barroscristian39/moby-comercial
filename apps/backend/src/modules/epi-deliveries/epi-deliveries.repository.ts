import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'

@Injectable()
export class EpiDeliveriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    companyId: string | undefined,
    page: number,
    perPage: number,
    employeeId?: string,
    epiItemId?: string,
  ) {
    const where = {
      ...(companyId ? { companyId } : {}),
      deletedAt: null,
      ...(employeeId ? { employeeId } : {}),
      ...(epiItemId  ? { epiItemId }  : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.epiDelivery.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { deliveredAt: 'desc' },
        include: {
          employee: { select: { id: true, name: true } },
          epiItem:  { select: { id: true, name: true, caNumber: true } },
        },
      }),
      this.prisma.epiDelivery.count({ where }),
    ])

    return { items, total }
  }

  async findById(id: string) {
    return this.prisma.epiDelivery.findFirst({
      where: { id, deletedAt: null },
      include: {
        employee: { select: { id: true, name: true } },
        epiItem:  { select: { id: true, name: true, caNumber: true } },
      },
    })
  }

  // Ficha de EPI do colaborador — histórico completo de entregas
  async findByEmployee(employeeId: string, companyId: string | undefined) {
    return this.prisma.epiDelivery.findMany({
      where: { employeeId, ...(companyId ? { companyId } : {}), deletedAt: null },
      orderBy: { deliveredAt: 'desc' },
      include: {
        epiItem: { select: { id: true, name: true, caNumber: true, caExpiry: true } },
      },
    })
  }

  async findByIdAndCompany(id: string, companyId: string) {
    return this.prisma.epiDelivery.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        employee: { select: { id: true, name: true } },
        epiItem:  { select: { id: true, name: true, caNumber: true } },
      },
    })
  }

  async create(data: {
    companyId:        string
    employeeId:       string
    epiItemId:        string
    quantity:         number
    deliveredAt:      Date
    reason:           string
    condition:        string
    deliveredBy?:     string
    notes?:           string
    caNumberSnapshot?: string
  }) {
    const company = await this.prisma.company.findFirst({
      where: { id: data.companyId, deletedAt: null },
      select: { tenantId: true },
    })
    return this.prisma.epiDelivery.create({
      data: { ...data, tenantId: company?.tenantId } as any,
      include: {
        employee: { select: { id: true, name: true } },
        epiItem:  { select: { id: true, name: true, caNumber: true } },
      },
    })
  }

  async createWithStockAdjustment(data: {
    companyId:        string
    employeeId:       string
    epiItemId:        string
    quantity:         number
    deliveredAt:      Date
    reason:           string
    condition:        string
    deliveredBy?:     string
    notes?:           string
    caNumberSnapshot?: string
  }) {
    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.findFirst({
        where: { id: data.companyId, deletedAt: null },
        select: { tenantId: true },
      })

      const stockUpdate = await tx.epiItem.updateMany({
        where: {
          id: data.epiItemId,
          companyId: data.companyId,
          deletedAt: null,
          stockQuantity: { gte: data.quantity },
        },
        data: { stockQuantity: { decrement: data.quantity } },
      })

      if (stockUpdate.count !== 1) {
        throw new Error('INSUFFICIENT_STOCK')
      }

      return tx.epiDelivery.create({
        data: { ...data, tenantId: company?.tenantId } as any,
        include: {
          employee: { select: { id: true, name: true } },
          epiItem:  { select: { id: true, name: true, caNumber: true } },
        },
      })
    })
  }

  async update(id: string, data: Record<string, any>) {
    return this.prisma.epiDelivery.update({
      where: { id },
      data,
      include: {
        employee: { select: { id: true, name: true } },
        epiItem:  { select: { id: true, name: true, caNumber: true } },
      },
    })
  }

  async softDelete(id: string, deletedBy: string) {
    return this.prisma.epiDelivery.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy, isActive: false },
    })
  }
}
