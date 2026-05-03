import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'

@Injectable()
export class AuthorizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findTenantById(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } })
  }

  findCompanyScope(companyId: string) {
    return this.prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { id: true, tenantId: true, isActive: true },
    })
  }

  findUnitScope(unitId: string) {
    return this.prisma.unit.findFirst({
      where: { id: unitId, deletedAt: null },
      select: { id: true, tenantId: true, companyId: true, isActive: true },
    })
  }

  async listCompanyIdsForTenant(tenantId: string): Promise<string[]> {
    const companies = await this.prisma.company.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      select: { id: true },
    })
    return companies.map((company) => company.id)
  }

  async listUnitIdsForTenant(tenantId: string): Promise<string[]> {
    const units = await this.prisma.unit.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      select: { id: true },
    })
    return units.map((unit) => unit.id)
  }

  async listAllCompanyIds(): Promise<string[]> {
    const companies = await this.prisma.company.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true },
    })
    return companies.map((company) => company.id)
  }

  async listAllUnitIds(): Promise<string[]> {
    const units = await this.prisma.unit.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true },
    })
    return units.map((unit) => unit.id)
  }

  async countCompaniesOutsideTenant(tenantId: string, companyIds: string[]): Promise<number> {
    if (!companyIds.length) return 0
    return this.prisma.company.count({
      where: {
        id: { in: companyIds },
        OR: [{ tenantId: { not: tenantId } }, { deletedAt: { not: null } }],
      },
    })
  }

  async countUnitsOutsideTenant(tenantId: string, unitIds: string[]): Promise<number> {
    if (!unitIds.length) return 0
    return this.prisma.unit.count({
      where: {
        id: { in: unitIds },
        OR: [{ tenantId: { not: tenantId } }, { deletedAt: { not: null } }],
      },
    })
  }

  async countUnitsOutsideCompanies(companyIds: string[], unitIds: string[]): Promise<number> {
    if (!unitIds.length || !companyIds.length) return unitIds.length
    return this.prisma.unit.count({
      where: {
        id: { in: unitIds },
        companyId: { notIn: companyIds },
      },
    })
  }
}
