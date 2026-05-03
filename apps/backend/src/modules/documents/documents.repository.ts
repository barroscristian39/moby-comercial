import { Injectable } from '@nestjs/common'
import { DocumentAuditAction, GeneratedDocumentStatus, Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'

@Injectable()
export class DocumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findFunctionById(id: string) {
    return this.prisma.jobFunction.findFirst({
      where: { id, deletedAt: null },
      include: {
        functionUnits: { select: { unitId: true } },
      },
    })
  }

  async findCompanyById(id: string) {
    return this.prisma.company.findFirst({
      where: { id, deletedAt: null },
    })
  }

  async maxTemplateVersion(functionId: string, documentType: string) {
    const result = await this.prisma.functionTemplate.aggregate({
      where: {
        jobFunctionId: functionId,
        documentType,
      },
      _max: { version: true },
    })
    return result._max.version ?? 0
  }

  async createTemplate(data: {
    id: string
    tenantId: string
    functionId: string
    documentType: string
    name: string
    filePath: string
    version: number
    variables: string[]
    createdBy: string
  }) {
    await this.prisma.functionTemplate.updateMany({
      where: {
        jobFunctionId: data.functionId,
        documentType: data.documentType,
        isActive: true,
        deletedAt: null,
      },
      data: { isActive: false },
    })

    return this.prisma.functionTemplate.create({
      data: {
        id: data.id,
        tenantId: data.tenantId,
        jobFunctionId: data.functionId,
        documentType: data.documentType,
        name: data.name,
        filePath: data.filePath,
        version: data.version,
        variables: data.variables,
        createdBy: data.createdBy,
        isActive: true,
      },
    })
  }

  async maxAccidentTemplateVersion(companyId: string, documentType: string) {
    const result = await this.prisma.accidentTemplate.aggregate({
      where: {
        companyId,
        documentType,
      },
      _max: { version: true },
    })
    return result._max.version ?? 0
  }

  async createAccidentTemplate(data: {
    id: string
    tenantId: string
    companyId: string
    documentType: string
    name: string
    filePath: string
    version: number
    variables: string[]
    createdBy: string
  }) {
    await this.prisma.accidentTemplate.updateMany({
      where: {
        companyId: data.companyId,
        documentType: data.documentType,
        isActive: true,
        deletedAt: null,
      },
      data: { isActive: false },
    })

    return this.prisma.accidentTemplate.create({
      data: {
        id: data.id,
        tenantId: data.tenantId,
        companyId: data.companyId,
        documentType: data.documentType,
        name: data.name,
        filePath: data.filePath,
        version: data.version,
        variables: data.variables,
        createdBy: data.createdBy,
        isActive: true,
      },
    })
  }

  async findTemplatesByFunction(functionId: string) {
    return this.prisma.functionTemplate.findMany({
      where: {
        jobFunctionId: functionId,
        deletedAt: null,
      },
      orderBy: [
        { documentType: 'asc' },
        { version: 'desc' },
      ],
    })
  }

  async findTemplateById(id: string) {
    return this.prisma.functionTemplate.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })
  }

  async findAccidentTemplatesByCompany(companyId: string) {
    return this.prisma.accidentTemplate.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: [
        { documentType: 'asc' },
        { version: 'desc' },
      ],
    })
  }

  async findAccidentTemplateById(id: string) {
    return this.prisma.accidentTemplate.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    })
  }

  async updateTemplate(id: string, data: { name?: string }) {
    return this.prisma.functionTemplate.update({
      where: { id },
      data,
    })
  }

  async updateAccidentTemplate(id: string, data: { name?: string }) {
    return this.prisma.accidentTemplate.update({
      where: { id },
      data,
    })
  }

  async setTemplateActiveState(
    id: string,
    data: { jobFunctionId: string; documentType: string; isActive: boolean },
  ) {
    if (data.isActive) {
      await this.prisma.functionTemplate.updateMany({
        where: {
          jobFunctionId: data.jobFunctionId,
          documentType: data.documentType,
          deletedAt: null,
          id: { not: id },
        },
        data: { isActive: false },
      })
    }

    return this.prisma.functionTemplate.update({
      where: { id },
      data: { isActive: data.isActive },
    })
  }

  async setAccidentTemplateActiveState(
    id: string,
    data: { companyId: string; documentType: string; isActive: boolean },
  ) {
    if (data.isActive) {
      await this.prisma.accidentTemplate.updateMany({
        where: {
          companyId: data.companyId,
          documentType: data.documentType,
          deletedAt: null,
          id: { not: id },
        },
        data: { isActive: false },
      })
    }

    return this.prisma.accidentTemplate.update({
      where: { id },
      data: { isActive: data.isActive },
    })
  }

  async findLatestTemplateCandidate(functionId: string, documentType: string, excludedTemplateId?: string) {
    return this.prisma.functionTemplate.findFirst({
      where: {
        jobFunctionId: functionId,
        documentType,
        deletedAt: null,
        ...(excludedTemplateId ? { id: { not: excludedTemplateId } } : {}),
      },
      orderBy: { version: 'desc' },
    })
  }

  async findLatestAccidentTemplateCandidate(companyId: string, documentType: string, excludedTemplateId?: string) {
    return this.prisma.accidentTemplate.findFirst({
      where: {
        companyId,
        documentType,
        deletedAt: null,
        ...(excludedTemplateId ? { id: { not: excludedTemplateId } } : {}),
      },
      orderBy: { version: 'desc' },
    })
  }

  async softDeleteTemplate(id: string, userId: string) {
    return this.prisma.functionTemplate.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
        isActive: false,
      },
    })
  }

  async softDeleteAccidentTemplate(id: string, userId: string) {
    return this.prisma.accidentTemplate.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
        isActive: false,
      },
    })
  }

  async findActiveTemplate(functionId: string, documentType: string) {
    return this.prisma.functionTemplate.findFirst({
      where: {
        jobFunctionId: functionId,
        documentType,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { version: 'desc' },
    })
  }

  async findActiveAccidentTemplate(companyId: string, documentType: string) {
    return this.prisma.accidentTemplate.findFirst({
      where: {
        companyId,
        documentType,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { version: 'desc' },
    })
  }

  async findEmployeeForGeneration(employeeId: string) {
    return this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        deletedAt: null,
      },
      include: {
        unit: {
          include: { company: true },
        },
        jobFunction: {
          include: { functionUnits: { select: { unitId: true } } },
        },
      },
    })
  }

  async findAccidentForGeneration(accidentId: string) {
    return this.prisma.accident.findFirst({
      where: {
        id: accidentId,
        deletedAt: null,
      },
      include: {
        company: true,
        unit: true,
        employee: true,
        jobFunction: true,
      },
    })
  }

  async createGeneratedDocument(data: {
    id: string
    tenantId: string
    employeeId: string
    functionId: string
    unitId: string
    templateId: string
    documentType: string
    filePath: string
    generatedBy: string
  }) {
    const document = await this.prisma.generatedDocument.create({
      data: {
        id: data.id,
        tenantId: data.tenantId,
        employeeId: data.employeeId,
        jobFunctionId: data.functionId,
        unitId: data.unitId,
        templateId: data.templateId,
        documentType: data.documentType,
        filePath: data.filePath,
        generatedBy: data.generatedBy,
        status: GeneratedDocumentStatus.ACTIVE,
      },
    })

    await this.prisma.documentAuditLog.create({
      data: {
        tenantId: data.tenantId,
        documentId: document.id,
        action: DocumentAuditAction.CREATED,
        userId: data.generatedBy,
      },
    })

    return document
  }

  async createAccidentGeneratedDocument(data: {
    id: string
    tenantId: string
    companyId: string
    accidentId: string
    employeeId: string
    unitId: string
    templateId: string
    documentType: string
    filePath: string
    generatedBy: string
  }) {
    return this.prisma.accidentGeneratedDocument.create({
      data: {
        id: data.id,
        tenantId: data.tenantId,
        companyId: data.companyId,
        accidentId: data.accidentId,
        employeeId: data.employeeId,
        unitId: data.unitId,
        templateId: data.templateId,
        documentType: data.documentType,
        filePath: data.filePath,
        generatedBy: data.generatedBy,
        status: GeneratedDocumentStatus.ACTIVE,
      },
    })
  }

  async findDocumentsByEmployee(employeeId: string, tenantId?: string) {
    const where: Prisma.GeneratedDocumentWhereInput = {
      employeeId,
      status: GeneratedDocumentStatus.ACTIVE,
      ...(tenantId ? { tenantId } : {}),
    }

    return this.prisma.generatedDocument.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
    })
  }

  async findAccidentDocumentsByAccident(accidentId: string, tenantId?: string) {
    const where: Prisma.AccidentGeneratedDocumentWhereInput = {
      accidentId,
      status: GeneratedDocumentStatus.ACTIVE,
      ...(tenantId ? { tenantId } : {}),
    }

    return this.prisma.accidentGeneratedDocument.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
    })
  }

  async findDocumentById(id: string) {
    return this.prisma.generatedDocument.findFirst({
      where: { id },
      include: {
        employee: true,
      },
    })
  }

  async findAccidentDocumentById(id: string) {
    return this.prisma.accidentGeneratedDocument.findFirst({
      where: { id },
      include: {
        accident: true,
        employee: true,
        company: true,
        unit: true,
      },
    })
  }

  async markDocumentDeleted(id: string, userId: string) {
    const document = await this.prisma.generatedDocument.update({
      where: { id },
      data: {
        status: GeneratedDocumentStatus.DELETED,
        deletedAt: new Date(),
        deletedBy: userId,
      },
    })

    await this.prisma.documentAuditLog.create({
      data: {
        tenantId: document.tenantId,
        documentId: document.id,
        action: DocumentAuditAction.DELETED,
        userId,
      },
    })

    return document
  }

  async markAccidentDocumentDeleted(id: string, userId: string) {
    return this.prisma.accidentGeneratedDocument.update({
      where: { id },
      data: {
        status: GeneratedDocumentStatus.DELETED,
        deletedAt: new Date(),
        deletedBy: userId,
      },
    })
  }
}
