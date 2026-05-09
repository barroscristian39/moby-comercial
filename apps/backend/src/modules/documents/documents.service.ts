import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { AuditAction } from '@prisma/client'
import { RequestUser, Role } from '@moby/shared'
import { randomUUID } from 'crypto'
import { AuditService } from '../audit/audit.service'
import { DocumentDownloadFormat, DocumentExportService } from './document-export.service'
import { GenerateDocumentDto } from './dto/generate-document.dto'
import { UpdateAccidentTemplateDto } from './dto/update-accident-template.dto'
import { UpdateFunctionTemplateDto } from './dto/update-function-template.dto'
import { UploadAccidentTemplateDto } from './dto/upload-accident-template.dto'
import { UploadFunctionTemplateDto } from './dto/upload-function-template.dto'
import { AccidentGeneratedDocumentEntity } from './entities/accident-generated-document.entity'
import { AccidentTemplateEntity } from './entities/accident-template.entity'
import { FunctionTemplateEntity } from './entities/function-template.entity'
import { GeneratedDocumentEntity } from './entities/generated-document.entity'
import { DocumentStorageService } from './document-storage.service'
import { DocumentsRepository } from './documents.repository'
import { DocxTemplateService } from './docx-template.service'

export type UploadedDocxTemplate = {
  filename: string
  mimetype?: string
  buffer: Buffer
}

const MAX_DOCX_BYTES = 10 * 1024 * 1024
const TEMPLATE_VARIABLE_ALIASES: Record<string, string[]> = {
  funcao: ['função'],
  matricula: ['matrícula'],
}

const ACCIDENT_TEMPLATE_VARIABLE_ALIASES: Record<string, string[]> = {
  funcao: ['função'],
  matricula: ['matrícula'],
  descricao_acidente: ['descrição_acidente'],
  numero_cat: ['número_cat'],
  conclusao: ['conclusão'],
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly documentsRepository: DocumentsRepository,
    private readonly storageService: DocumentStorageService,
    private readonly documentExportService: DocumentExportService,
    private readonly docxTemplateService: DocxTemplateService,
    private readonly auditService: AuditService,
  ) {}

  async uploadFunctionTemplate(
    functionId: string,
    dto: UploadFunctionTemplateDto,
    file: UploadedDocxTemplate,
    currentUser: RequestUser,
  ): Promise<{ data: FunctionTemplateEntity }> {
    this.assertAdmin(currentUser)
    this.assertTemplateUpload(file)

    const jobFunction = await this.getFunctionOrThrow(functionId)
    this.assertTenantAccess(currentUser, jobFunction.tenantId)

    const version = (await this.documentsRepository.maxTemplateVersion(functionId, dto.documentType)) + 1
    const variables = this.docxTemplateService.extractVariables(file.buffer)
    const templateId = randomUUID()
    const template = await this.documentsRepository.createTemplate({
      id: templateId,
      tenantId: jobFunction.tenantId,
      functionId,
      documentType: dto.documentType,
      name: dto.name ?? file.filename.replace(/\.docx$/i, ''),
      fileContent: file.buffer,
      version,
      variables,
      createdBy: currentUser.userId,
    })

    await this.auditService.record({
      tenantId: jobFunction.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.CREATE,
      entityType: 'function_templates',
      entityId: template.id,
      metadata: {
        functionId,
        documentType: template.documentType,
        version: template.version,
        variables,
        originalFilename: file.filename,
      },
    })

    return { data: this.mapTemplate(template) }
  }

  async listFunctionTemplates(functionId: string, currentUser: RequestUser) {
    const jobFunction = await this.getFunctionOrThrow(functionId)
    this.assertTenantAccess(currentUser, jobFunction.tenantId)

    const templates = await this.documentsRepository.findTemplatesByFunction(functionId)
    return { data: templates.map(this.mapTemplate) }
  }

  async updateFunctionTemplate(
    functionId: string,
    templateId: string,
    dto: UpdateFunctionTemplateDto,
    currentUser: RequestUser,
  ): Promise<{ data: FunctionTemplateEntity }> {
    this.assertAdmin(currentUser)

    const jobFunction = await this.getFunctionOrThrow(functionId)
    this.assertTenantAccess(currentUser, jobFunction.tenantId)

    const template = await this.getTemplateOrThrow(templateId, functionId)
    let updatedTemplate = template

    if (dto.name !== undefined && dto.name !== updatedTemplate.name) {
      updatedTemplate = await this.documentsRepository.updateTemplate(templateId, { name: dto.name })

      await this.auditService.record({
        tenantId: updatedTemplate.tenantId,
        actorUserId: currentUser.userId,
        action: AuditAction.UPDATE,
        entityType: 'function_templates',
        entityId: updatedTemplate.id,
        metadata: {
          functionId,
          documentType: updatedTemplate.documentType,
          version: updatedTemplate.version,
          previousName: template.name,
          newName: updatedTemplate.name,
        },
      })
    }

    if (dto.isActive !== undefined && dto.isActive !== updatedTemplate.isActive) {
      const previousIsActive = updatedTemplate.isActive
      updatedTemplate = await this.documentsRepository.setTemplateActiveState(templateId, {
        jobFunctionId: updatedTemplate.jobFunctionId,
        documentType: updatedTemplate.documentType,
        isActive: dto.isActive,
      })

      await this.auditService.record({
        tenantId: updatedTemplate.tenantId,
        actorUserId: currentUser.userId,
        action: dto.isActive ? AuditAction.ACTIVATE : AuditAction.DEACTIVATE,
        entityType: 'function_templates',
        entityId: updatedTemplate.id,
        metadata: {
          functionId,
          documentType: updatedTemplate.documentType,
          version: updatedTemplate.version,
          previousIsActive,
          newIsActive: updatedTemplate.isActive,
        },
      })
    }

    return { data: this.mapTemplate(updatedTemplate) }
  }

  async deleteFunctionTemplate(functionId: string, templateId: string, currentUser: RequestUser): Promise<void> {
    this.assertAdmin(currentUser)

    const jobFunction = await this.getFunctionOrThrow(functionId)
    this.assertTenantAccess(currentUser, jobFunction.tenantId)

    const template = await this.getTemplateOrThrow(templateId, functionId)
    const replacementTemplate = template.isActive
      ? await this.documentsRepository.findLatestTemplateCandidate(functionId, template.documentType, template.id)
      : null

    await this.documentsRepository.softDeleteTemplate(templateId, currentUser.userId)

    if (replacementTemplate) {
      await this.documentsRepository.setTemplateActiveState(replacementTemplate.id, {
        jobFunctionId: replacementTemplate.jobFunctionId,
        documentType: replacementTemplate.documentType,
        isActive: true,
      })
    }

    await this.auditService.record({
      tenantId: template.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.DELETE,
      entityType: 'function_templates',
      entityId: template.id,
      metadata: {
        functionId,
        documentType: template.documentType,
        version: template.version,
        deletedTemplateName: template.name,
        replacementTemplateId: replacementTemplate?.id ?? null,
      },
    })
  }

  async uploadAccidentTemplate(
    companyId: string,
    dto: UploadAccidentTemplateDto,
    file: UploadedDocxTemplate,
    currentUser: RequestUser,
  ): Promise<{ data: AccidentTemplateEntity }> {
    this.assertAdmin(currentUser)
    this.assertTemplateUpload(file)

    const company = await this.getCompanyOrThrow(companyId)
    this.assertCompanyAccess(currentUser, company)

    const version = (await this.documentsRepository.maxAccidentTemplateVersion(companyId, dto.documentType)) + 1
    const variables = this.docxTemplateService.extractVariables(file.buffer)
    const templateId = randomUUID()
    const template = await this.documentsRepository.createAccidentTemplate({
      id: templateId,
      tenantId: company.tenantId,
      companyId,
      documentType: dto.documentType,
      name: dto.name ?? file.filename.replace(/\.docx$/i, ''),
      fileContent: file.buffer,
      version,
      variables,
      createdBy: currentUser.userId,
    })

    await this.auditService.record({
      tenantId: company.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.CREATE,
      entityType: 'accident_templates',
      entityId: template.id,
      metadata: {
        companyId,
        documentType: template.documentType,
        version: template.version,
        variables,
        originalFilename: file.filename,
      },
    })

    return { data: this.mapAccidentTemplate(template) }
  }

  async listAccidentTemplates(companyId: string, currentUser: RequestUser) {
    const company = await this.getCompanyOrThrow(companyId)
    this.assertCompanyAccess(currentUser, company)

    const templates = await this.documentsRepository.findAccidentTemplatesByCompany(companyId)
    return { data: templates.map(this.mapAccidentTemplate) }
  }

  async updateAccidentTemplate(
    companyId: string,
    templateId: string,
    dto: UpdateAccidentTemplateDto,
    currentUser: RequestUser,
  ): Promise<{ data: AccidentTemplateEntity }> {
    this.assertAdmin(currentUser)

    const company = await this.getCompanyOrThrow(companyId)
    this.assertCompanyAccess(currentUser, company)

    const template = await this.getAccidentTemplateOrThrow(templateId, companyId)
    let updatedTemplate = template

    if (dto.name !== undefined && dto.name !== updatedTemplate.name) {
      updatedTemplate = await this.documentsRepository.updateAccidentTemplate(templateId, { name: dto.name })

      await this.auditService.record({
        tenantId: updatedTemplate.tenantId,
        actorUserId: currentUser.userId,
        action: AuditAction.UPDATE,
        entityType: 'accident_templates',
        entityId: updatedTemplate.id,
        metadata: {
          companyId,
          documentType: updatedTemplate.documentType,
          version: updatedTemplate.version,
          previousName: template.name,
          newName: updatedTemplate.name,
        },
      })
    }

    if (dto.isActive !== undefined && dto.isActive !== updatedTemplate.isActive) {
      const previousIsActive = updatedTemplate.isActive
      updatedTemplate = await this.documentsRepository.setAccidentTemplateActiveState(templateId, {
        companyId: updatedTemplate.companyId,
        documentType: updatedTemplate.documentType,
        isActive: dto.isActive,
      })

      await this.auditService.record({
        tenantId: updatedTemplate.tenantId,
        actorUserId: currentUser.userId,
        action: dto.isActive ? AuditAction.ACTIVATE : AuditAction.DEACTIVATE,
        entityType: 'accident_templates',
        entityId: updatedTemplate.id,
        metadata: {
          companyId,
          documentType: updatedTemplate.documentType,
          version: updatedTemplate.version,
          previousIsActive,
          newIsActive: updatedTemplate.isActive,
        },
      })
    }

    return { data: this.mapAccidentTemplate(updatedTemplate) }
  }

  async deleteAccidentTemplate(companyId: string, templateId: string, currentUser: RequestUser): Promise<void> {
    this.assertAdmin(currentUser)

    const company = await this.getCompanyOrThrow(companyId)
    this.assertCompanyAccess(currentUser, company)

    const template = await this.getAccidentTemplateOrThrow(templateId, companyId)
    const replacementTemplate = template.isActive
      ? await this.documentsRepository.findLatestAccidentTemplateCandidate(companyId, template.documentType, template.id)
      : null

    await this.documentsRepository.softDeleteAccidentTemplate(templateId, currentUser.userId)

    if (replacementTemplate) {
      await this.documentsRepository.setAccidentTemplateActiveState(replacementTemplate.id, {
        companyId,
        documentType: replacementTemplate.documentType,
        isActive: true,
      })
    }

    await this.auditService.record({
      tenantId: template.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.DELETE,
      entityType: 'accident_templates',
      entityId: template.id,
      metadata: {
        companyId,
        documentType: template.documentType,
        version: template.version,
        deletedTemplateName: template.name,
        replacementTemplateId: replacementTemplate?.id ?? null,
      },
    })
  }

  async generateForEmployee(
    employeeId: string,
    dto: GenerateDocumentDto,
    currentUser: RequestUser,
  ): Promise<{ data: GeneratedDocumentEntity }> {
    this.assertCanGenerate(currentUser)
    const employee = await this.getEmployeeOrThrow(employeeId)
    this.assertEmployeeAccess(currentUser, employee)
    this.assertFunctionIsLinkedToEmployeeUnit(employee)

    const template = dto.templateId
      ? await this.documentsRepository.findTemplateById(dto.templateId)
      : await this.documentsRepository.findActiveTemplate(employee.jobFunctionId, dto.documentType)

    if (!template || template.tenantId !== employee.tenantId || template.jobFunctionId !== employee.jobFunctionId) {
      throw new NotFoundException({
        error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template ativo não encontrado para a função', statusCode: 404 },
      })
    }

    if (!template.isActive || template.documentType !== dto.documentType) {
      this.deny('Template informado não está ativo para o tipo de documento solicitado')
    }

    const templateBuffer = await this.resolveStoredBuffer(template, 'TEMPLATE_CONTENT_NOT_FOUND', 'Template sem conteúdo disponível')
    const outputBuffer = this.docxTemplateService.render(templateBuffer, this.buildTemplateData(employee))
    const documentId = randomUUID()

    const document = await this.documentsRepository.createGeneratedDocument({
      id: documentId,
      tenantId: employee.tenantId,
      employeeId: employee.id,
      functionId: employee.jobFunctionId,
      unitId: employee.unitId,
      templateId: template.id,
      documentType: dto.documentType,
      fileContent: outputBuffer,
      generatedBy: currentUser.userId,
    })

    await this.auditService.record({
      tenantId: employee.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.CREATE,
      entityType: 'generated_documents',
      entityId: document.id,
      metadata: {
        employeeId: employee.id,
        functionId: employee.jobFunctionId,
        unitId: employee.unitId,
        templateId: template.id,
        documentType: dto.documentType,
      },
    })

    return { data: this.mapGeneratedDocument(document) }
  }

  async generateForAccident(
    accidentId: string,
    dto: GenerateDocumentDto,
    currentUser: RequestUser,
  ): Promise<{ data: AccidentGeneratedDocumentEntity }> {
    this.assertCanGenerate(currentUser)

    const accident = await this.getAccidentForGenerationOrThrow(accidentId)
    this.assertAccidentAccess(currentUser, accident)

    const template = dto.templateId
      ? await this.documentsRepository.findAccidentTemplateById(dto.templateId)
      : await this.documentsRepository.findActiveAccidentTemplate(accident.companyId, dto.documentType)

    if (!template || template.tenantId !== accident.tenantId || template.companyId !== accident.companyId) {
      throw new NotFoundException({
        error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template ativo não encontrado para a empresa', statusCode: 404 },
      })
    }

    if (!template.isActive || template.documentType !== dto.documentType) {
      this.deny('Template informado não está ativo para o tipo de documento solicitado')
    }

    const templateBuffer = await this.resolveStoredBuffer(template, 'TEMPLATE_CONTENT_NOT_FOUND', 'Template sem conteúdo disponível')
    const outputBuffer = this.docxTemplateService.render(templateBuffer, this.buildAccidentTemplateData(accident))
    const documentId = randomUUID()

    const document = await this.documentsRepository.createAccidentGeneratedDocument({
      id: documentId,
      tenantId: accident.tenantId,
      companyId: accident.companyId,
      accidentId: accident.id,
      employeeId: accident.employeeId,
      unitId: accident.unitId,
      templateId: template.id,
      documentType: dto.documentType,
      fileContent: outputBuffer,
      generatedBy: currentUser.userId,
    })

    await this.auditService.record({
      tenantId: accident.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.CREATE,
      entityType: 'accident_generated_documents',
      entityId: document.id,
      metadata: {
        accidentId: accident.id,
        companyId: accident.companyId,
        employeeId: accident.employeeId,
        unitId: accident.unitId,
        templateId: template.id,
        documentType: dto.documentType,
      },
    })

    return { data: this.mapAccidentGeneratedDocument(document) }
  }

  async getGeneratedDocumentFile(
    id: string,
    currentUser: RequestUser,
    format: DocumentDownloadFormat = 'pdf',
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const document = await this.documentsRepository.findDocumentById(id)
    if (!document || document.status === 'DELETED') {
      throw new NotFoundException({
        error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado', statusCode: 404 },
      })
    }

    this.assertTenantAccess(currentUser, document.tenantId)
    this.assertEmployeeAccess(currentUser, document.employee)
    this.assertDownloadFormatAccess(currentUser, format)

    const sourceBuffer = await this.resolveStoredBuffer(
      document,
      'DOCUMENT_CONTENT_NOT_FOUND',
      'Documento sem conteúdo disponível',
    )
    const employeeName = this.toFilenamePart(document.employee?.name ?? 'colaborador')
    const documentType = this.toFilenamePart(document.documentType)
    const filenameBase = `${documentType}-${employeeName}-${document.id}`

    return this.documentExportService.buildDownloadFile({
      sourceBuffer,
      filenameBase,
      format,
    })
  }

  async getAccidentGeneratedDocumentFile(
    id: string,
    currentUser: RequestUser,
    format: DocumentDownloadFormat = 'pdf',
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const document = await this.documentsRepository.findAccidentDocumentById(id)
    if (!document || document.status === 'DELETED') {
      throw new NotFoundException({
        error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado', statusCode: 404 },
      })
    }

    this.assertTenantAccess(currentUser, document.tenantId)
    this.assertAccidentAccess(currentUser, document.accident)
    this.assertDownloadFormatAccess(currentUser, format)

    const sourceBuffer = await this.resolveStoredBuffer(
      document,
      'DOCUMENT_CONTENT_NOT_FOUND',
      'Documento sem conteúdo disponível',
    )
    const employeeName = this.toFilenamePart(document.employee?.name ?? 'colaborador')
    const documentType = this.toFilenamePart(document.documentType)
    const accidentCode = this.toFilenamePart(document.accident?.code ?? document.id)
    const filenameBase = `${documentType}-${accidentCode}-${employeeName}`

    return this.documentExportService.buildDownloadFile({
      sourceBuffer,
      filenameBase,
      format,
    })
  }

  async listEmployeeDocuments(employeeId: string, currentUser: RequestUser) {
    const employee = await this.getEmployeeOrThrow(employeeId)
    this.assertEmployeeAccess(currentUser, employee)

    const tenantId = currentUser.role === Role.SUPER_ADMIN ? employee.tenantId : currentUser.tenantId ?? undefined
    const documents = await this.documentsRepository.findDocumentsByEmployee(employeeId, tenantId)
    return { data: documents.map(this.mapGeneratedDocument) }
  }

  async listAccidentDocuments(accidentId: string, currentUser: RequestUser) {
    const accident = await this.getAccidentForGenerationOrThrow(accidentId)
    this.assertAccidentAccess(currentUser, accident)

    const tenantId = currentUser.role === Role.SUPER_ADMIN ? accident.tenantId : currentUser.tenantId ?? undefined
    const documents = await this.documentsRepository.findAccidentDocumentsByAccident(accidentId, tenantId)
    return { data: documents.map(this.mapAccidentGeneratedDocument) }
  }

  async deleteGeneratedDocument(id: string, currentUser: RequestUser): Promise<void> {
    this.assertAdmin(currentUser)
    const document = await this.documentsRepository.findDocumentById(id)
    if (!document) {
      throw new NotFoundException({
        error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado', statusCode: 404 },
      })
    }

    this.assertTenantAccess(currentUser, document.tenantId)
    this.assertEmployeeAccess(currentUser, document.employee)

    if (document.status === 'DELETED') return

    const deleted = await this.documentsRepository.markDocumentDeleted(id, currentUser.userId)
    await this.auditService.record({
      tenantId: deleted.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.DELETE,
      entityType: 'generated_documents',
      entityId: deleted.id,
      metadata: {
        employeeId: deleted.employeeId,
        functionId: deleted.jobFunctionId,
        unitId: deleted.unitId,
        templateId: deleted.templateId,
        documentType: deleted.documentType,
      },
    })
  }

  async deleteAccidentGeneratedDocument(id: string, currentUser: RequestUser): Promise<void> {
    this.assertAdmin(currentUser)
    const document = await this.documentsRepository.findAccidentDocumentById(id)
    if (!document) {
      throw new NotFoundException({
        error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado', statusCode: 404 },
      })
    }

    this.assertTenantAccess(currentUser, document.tenantId)
    this.assertAccidentAccess(currentUser, document.accident)

    if (document.status === 'DELETED') return

    const deleted = await this.documentsRepository.markAccidentDocumentDeleted(id, currentUser.userId)
    await this.auditService.record({
      tenantId: deleted.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.DELETE,
      entityType: 'accident_generated_documents',
      entityId: deleted.id,
      metadata: {
        accidentId: deleted.accidentId,
        companyId: deleted.companyId,
        employeeId: deleted.employeeId,
        unitId: deleted.unitId,
        templateId: deleted.templateId,
        documentType: deleted.documentType,
      },
    })
  }

  private assertTemplateUpload(file: UploadedDocxTemplate) {
    if (!file?.buffer?.length) {
      throw new BadRequestException({
        error: { code: 'DOCX_FILE_REQUIRED', message: 'Arquivo DOCX obrigatório', statusCode: 400 },
      })
    }

    if (file.buffer.length > MAX_DOCX_BYTES) {
      throw new BadRequestException({
        error: { code: 'DOCX_TOO_LARGE', message: 'Template DOCX deve ter no máximo 10MB', statusCode: 400 },
      })
    }

    this.storageService.assertValidDocx(file.buffer, file.filename, file.mimetype)
  }

  private async resolveStoredBuffer(
    record: { fileContent?: Uint8Array | Buffer | null; filePath?: string | null },
    errorCode: string,
    message: string,
  ) {
    if (record.fileContent?.length) {
      return Buffer.from(record.fileContent)
    }

    if (record.filePath) {
      return this.storageService.readLegacyBuffer(record.filePath)
    }

    throw new NotFoundException({
      error: { code: errorCode, message, statusCode: 404 },
    })
  }

  private async getFunctionOrThrow(functionId: string) {
    const jobFunction = await this.documentsRepository.findFunctionById(functionId)
    if (!jobFunction) {
      throw new NotFoundException({
        error: { code: 'FUNCTION_NOT_FOUND', message: 'Função não encontrada', statusCode: 404 },
      })
    }
    return jobFunction
  }

  private async getCompanyOrThrow(companyId: string) {
    const company = await this.documentsRepository.findCompanyById(companyId)
    if (!company) {
      throw new NotFoundException({
        error: { code: 'COMPANY_NOT_FOUND', message: 'Empresa não encontrada', statusCode: 404 },
      })
    }
    return company
  }

  private async getTemplateOrThrow(templateId: string, functionId: string) {
    const template = await this.documentsRepository.findTemplateById(templateId)
    if (!template || template.jobFunctionId !== functionId) {
      throw new NotFoundException({
        error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template não encontrado para a função', statusCode: 404 },
      })
    }
    return template
  }

  private async getAccidentTemplateOrThrow(templateId: string, companyId: string) {
    const template = await this.documentsRepository.findAccidentTemplateById(templateId)
    if (!template || template.companyId !== companyId) {
      throw new NotFoundException({
        error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template não encontrado para a empresa', statusCode: 404 },
      })
    }
    return template
  }

  private async getEmployeeOrThrow(employeeId: string) {
    const employee = await this.documentsRepository.findEmployeeForGeneration(employeeId)
    if (!employee) {
      throw new NotFoundException({
        error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Colaborador não encontrado', statusCode: 404 },
      })
    }
    return employee
  }

  private async getAccidentForGenerationOrThrow(accidentId: string) {
    const accident = await this.documentsRepository.findAccidentForGeneration(accidentId)
    if (!accident) {
      throw new NotFoundException({
        error: { code: 'ACCIDENT_NOT_FOUND', message: 'Acidente não encontrado', statusCode: 404 },
      })
    }
    return accident
  }

  private assertAdmin(currentUser: RequestUser) {
    if (currentUser.role === Role.SUPER_ADMIN || currentUser.role === Role.TENANT_ADMIN) return
    this.deny('Apenas administradores podem executar esta operação')
  }

  private assertCanGenerate(currentUser: RequestUser) {
    if (
      currentUser.role === Role.SUPER_ADMIN ||
      currentUser.role === Role.TENANT_ADMIN ||
      currentUser.role === Role.TECNICO_SST
    ) return

    this.deny('Apenas administradores e técnicos de segurança podem emitir documentos')
  }

  private assertDownloadFormatAccess(currentUser: RequestUser, format: DocumentDownloadFormat) {
    if (format !== 'docx') return

    if (
      currentUser.role === Role.SUPER_ADMIN ||
      currentUser.role === Role.TENANT_ADMIN ||
      currentUser.role === Role.TECNICO_SST
    ) return

    this.deny('O download em Word é permitido apenas para administradores e técnicos de segurança')
  }

  private assertTenantAccess(currentUser: RequestUser, tenantId: string) {
    if (currentUser.role === Role.SUPER_ADMIN) return
    if (!currentUser.tenantId || currentUser.tenantId !== tenantId) {
      this.deny('Acesso fora do ambiente autenticado')
    }
  }

  private assertCompanyAccess(currentUser: RequestUser, company: { tenantId: string; id: string }) {
    this.assertTenantAccess(currentUser, company.tenantId)
    if (currentUser.role === Role.SUPER_ADMIN || currentUser.role === Role.TENANT_ADMIN) return

    if (currentUser.companyIds?.length && !currentUser.companyIds.includes(company.id)) {
      this.deny('Empresa fora do escopo permitido')
    }
  }

  private assertEmployeeAccess(currentUser: RequestUser, employee: any) {
    this.assertTenantAccess(currentUser, employee.tenantId)
    if (currentUser.role === Role.SUPER_ADMIN || currentUser.role === Role.TENANT_ADMIN) return

    if (!currentUser.unitIds?.includes(employee.unitId)) {
      this.deny('Colaborador fora do escopo de unidade permitido')
    }
  }

  private assertAccidentAccess(currentUser: RequestUser, accident: any) {
    this.assertTenantAccess(currentUser, accident.tenantId)
    if (currentUser.role === Role.SUPER_ADMIN || currentUser.role === Role.TENANT_ADMIN) return

    if (currentUser.companyIds?.length && !currentUser.companyIds.includes(accident.companyId)) {
      this.deny('Acidente fora do escopo de empresa permitido')
    }

    if (currentUser.unitIds?.length && !currentUser.unitIds.includes(accident.unitId)) {
      this.deny('Acidente fora do escopo de unidade permitido')
    }
  }

  private assertFunctionIsLinkedToEmployeeUnit(employee: any) {
    const linkedUnitIds = employee.jobFunction?.functionUnits?.map((link: any) => link.unitId) ?? []
    const hasExplicitLink = linkedUnitIds.includes(employee.unitId)
    const hasLegacyLink = employee.jobFunction?.unitId === employee.unitId

    if (!hasExplicitLink && !hasLegacyLink) {
      this.deny('A função do colaborador não está vinculada à unidade do colaborador')
    }
  }

  private buildTemplateData(employee: any): Record<string, string> {
    const now = new Date()
    const company = employee.unit?.company
    const baseData = {
      nome: employee.name ?? '',
      cpf: employee.cpf ?? '',
      matricula: employee.registration ?? '',
      funcao: employee.jobFunction?.name ?? '',
      cbo: employee.jobFunction?.cbo ?? '',
      unidade: employee.unit?.name ?? '',
      empresa: company?.tradeName ?? company?.name ?? '',
      cnpj_empresa: company?.cnpj ?? '',
      data_emissao: this.formatDate(now),
      data_admissao: this.formatDate(employee.admissionDate),
    }

    return this.withTemplateAliases(baseData, TEMPLATE_VARIABLE_ALIASES)
  }

  private buildAccidentTemplateData(accident: any): Record<string, string> {
    const occurredAt = new Date(accident.occurredAt)
    const reportedAt = new Date(accident.reportedAt)
    const investigationStartedAt = accident.investigationStartedAt ? new Date(accident.investigationStartedAt) : null
    const closureDate = accident.closureDate ? new Date(accident.closureDate) : null
    const company = accident.company
    const employee = accident.employee
    const jobFunction = accident.jobFunction

    const baseData = {
      codigo_acidente: accident.code ?? '',
      empresa: company?.tradeName ?? company?.name ?? '',
      cnpj_empresa: company?.cnpj ?? '',
      unidade: accident.unit?.name ?? '',
      nome: employee?.name ?? '',
      colaborador: employee?.name ?? '',
      cpf: employee?.cpf ?? '',
      matricula: employee?.registration ?? '',
      funcao: jobFunction?.name ?? '',
      data_ocorrencia: this.formatDate(occurredAt),
      hora_ocorrencia: this.formatTime(occurredAt),
      data_registro: this.formatDate(reportedAt),
      hora_registro: this.formatTime(reportedAt),
      local: accident.location ?? '',
      tipo_acidente: this.getAccidentTypeLabel(accident.accidentType),
      gravidade: this.getAccidentSeverityLabel(accident.severity),
      status: this.getAccidentStatusLabel(accident.status),
      descricao_acidente: accident.description ?? '',
      parte_atingida: accident.injuredBodyPart ?? '',
      atendimento_medico: accident.medicalCareProvided ? 'Sim' : 'Não',
      afastamento: accident.leaveRequired ? 'Sim' : 'Não',
      dias_afastamento: String(accident.leaveDays ?? 0),
      cat_emitida: accident.catIssued ? 'Sim' : 'Não',
      numero_cat: accident.catNumber ?? '',
      testemunhas: accident.witnesses ?? '',
      acoes_imediatas: accident.immediateActions ?? '',
      investigador: accident.investigatorName ?? '',
      data_inicio_investigacao: investigationStartedAt ? this.formatDate(investigationStartedAt) : '',
      causa_imediata: accident.immediateCause ?? '',
      causa_raiz: accident.rootCause ?? '',
      fatores_contribuintes: accident.contributingFactors ?? '',
      acoes_corretivas: accident.correctiveActions ?? '',
      medidas_preventivas: accident.preventiveMeasures ?? '',
      notas_gestao: accident.managerNotes ?? '',
      recomendacoes: accident.recommendations ?? '',
      conclusao: accident.conclusionSummary ?? '',
      data_encerramento: closureDate ? this.formatDate(closureDate) : '',
      data_emissao: this.formatDate(new Date()),
    }

    return this.withTemplateAliases(baseData, ACCIDENT_TEMPLATE_VARIABLE_ALIASES)
  }

  private formatDate(value: Date | string | null | undefined) {
    if (!value) return ''
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(value))
  }

  private formatTime(value: Date | string | null | undefined) {
    if (!value) return ''
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  }

  private formatDateTime(value: Date | string | null | undefined) {
    if (!value) return ''
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value))
  }

  private toFilenamePart(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 80) || 'documento'
  }

  private withTemplateAliases(data: Record<string, string>, aliasesMap: Record<string, string[]>) {
    return Object.entries(data).reduce<Record<string, string>>((accumulator, [key, value]) => {
      const aliases = [key, ...(aliasesMap[key] ?? [])]

      for (const alias of aliases) {
        accumulator[alias] = value
        accumulator[alias.toUpperCase()] = value
      }

      return accumulator
    }, {})
  }

  private mapTemplate(template: any): FunctionTemplateEntity {
    return {
      id: template.id,
      tenantId: template.tenantId,
      functionId: template.jobFunctionId,
      documentType: template.documentType,
      name: template.name,
      version: template.version,
      variables: Array.isArray(template.variables) ? template.variables.map(String) : [],
      isActive: template.isActive,
      createdBy: template.createdBy,
      createdAt: template.createdAt,
    }
  }

  private mapGeneratedDocument(document: any): GeneratedDocumentEntity {
    return {
      id: document.id,
      tenantId: document.tenantId,
      employeeId: document.employeeId,
      functionId: document.jobFunctionId,
      unitId: document.unitId,
      templateId: document.templateId,
      documentType: document.documentType,
      generatedBy: document.generatedBy,
      generatedAt: document.generatedAt,
      status: document.status,
    }
  }

  private mapAccidentTemplate(template: any): AccidentTemplateEntity {
    return {
      id: template.id,
      tenantId: template.tenantId,
      companyId: template.companyId,
      documentType: template.documentType,
      name: template.name,
      version: template.version,
      variables: Array.isArray(template.variables) ? template.variables.map(String) : [],
      isActive: template.isActive,
      createdBy: template.createdBy,
      createdAt: template.createdAt,
    }
  }

  private mapAccidentGeneratedDocument(document: any): AccidentGeneratedDocumentEntity {
    return {
      id: document.id,
      tenantId: document.tenantId,
      companyId: document.companyId,
      accidentId: document.accidentId,
      employeeId: document.employeeId,
      unitId: document.unitId,
      templateId: document.templateId,
      documentType: document.documentType,
      generatedBy: document.generatedBy,
      generatedAt: document.generatedAt,
      status: document.status,
    }
  }

  private getAccidentTypeLabel(value: string | null | undefined) {
    const labels: Record<string, string> = {
      TYPICAL: 'Acidente típico',
      COMMUTE: 'Acidente de trajeto',
      OCCUPATIONAL_DISEASE: 'Doença ocupacional',
      NEAR_MISS: 'Quase acidente',
    }

    return value ? (labels[value] ?? value) : ''
  }

  private getAccidentSeverityLabel(value: string | null | undefined) {
    const labels: Record<string, string> = {
      MINOR: 'Leve',
      MODERATE: 'Moderado',
      SERIOUS: 'Grave',
      FATAL: 'Fatal',
    }

    return value ? (labels[value] ?? value) : ''
  }

  private getAccidentStatusLabel(value: string | null | undefined) {
    const labels: Record<string, string> = {
      REPORTED: 'Registrado',
      UNDER_INVESTIGATION: 'Em investigação',
      ACTION_PLAN_DEFINED: 'Plano de ação definido',
      CLOSED: 'Encerrado',
    }

    return value ? (labels[value] ?? value) : ''
  }

  private deny(message: string): never {
    throw new ForbiddenException({
      error: { code: 'FORBIDDEN', message, statusCode: 403 },
    })
  }
}
