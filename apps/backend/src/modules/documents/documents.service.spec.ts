import { ForbiddenException } from '@nestjs/common'
import { Permission, RequestUser, Role } from '@moby/shared'
import { DocumentsService } from './documents.service'

describe('DocumentsService', () => {
  const repository = {
    findFunctionById: jest.fn(),
    maxTemplateVersion: jest.fn(),
    createTemplate: jest.fn(),
    findTemplatesByFunction: jest.fn(),
    findTemplateById: jest.fn(),
    findActiveTemplate: jest.fn(),
    findEmployeeForGeneration: jest.fn(),
    createGeneratedDocument: jest.fn(),
    findDocumentsByEmployee: jest.fn(),
    findDocumentById: jest.fn(),
    markDocumentDeleted: jest.fn(),
  }
  const storage = {
    readLegacyBuffer: jest.fn(),
    assertValidDocx: jest.fn(),
  }
  const exportService = {
    buildDownloadFile: jest.fn(),
  }
  const docx = { render: jest.fn() }
  const authorization = {
    assertCompanyInScope: jest.fn((user: RequestUser, companyId: string, message = 'Empresa fora do escopo permitido') => {
      if (!user.companyIds.includes(companyId) && user.companyId !== companyId) {
        throw new ForbiddenException({
          error: { code: 'FORBIDDEN_SCOPE', message, statusCode: 403 },
        })
      }
    }),
    assertUnitInScope: jest.fn((user: RequestUser, unitId: string, message = 'Unidade fora do escopo permitido') => {
      if (!user.unitIds.includes(unitId)) {
        throw new ForbiddenException({
          error: { code: 'FORBIDDEN_SCOPE', message, statusCode: 403 },
        })
      }
    }),
  }
  const audit = { record: jest.fn() }

  let service: DocumentsService

  const scopedUser: RequestUser = {
    userId: 'user-1',
    tenantId: 'tenant-1',
    companyId: 'company-1',
    role: Role.TECNICO_SST,
    companyIds: ['company-1'],
    unitIds: ['unit-1'],
    permissions: [Permission.DOCUMENTS_READ, Permission.DOCUMENTS_WRITE],
  }

  const employee = {
    id: 'employee-1',
    tenantId: 'tenant-1',
    unitId: 'unit-1',
    jobFunctionId: 'function-1',
    name: 'João Silva',
    cpf: '12345678900',
    registration: 'MAT-001',
    admissionDate: new Date('2024-01-10T00:00:00.000Z'),
    unit: {
      id: 'unit-1',
      name: 'Unidade Centro',
      company: { id: 'company-1', name: 'Empresa SST', tradeName: null, cnpj: '12345678000199' },
    },
    jobFunction: {
      id: 'function-1',
      name: 'Soldador',
      unitId: null,
      functionUnits: [{ unitId: 'unit-1' }],
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    service = new DocumentsService(
      repository as any,
      storage as any,
      exportService as any,
      docx as any,
      authorization as any,
      audit as any,
    )
  })

  it('gera documento usando a unidade do colaborador e o template ativo da função', async () => {
    repository.findEmployeeForGeneration.mockResolvedValue(employee)
    repository.findActiveTemplate.mockResolvedValue({
      id: 'template-1',
      tenantId: 'tenant-1',
      jobFunctionId: 'function-1',
      documentType: 'OS',
      isActive: true,
      fileContent: Buffer.from('template'),
    })
    docx.render.mockReturnValue(Buffer.from('rendered'))
    repository.createGeneratedDocument.mockResolvedValue({
      id: 'document-1',
      tenantId: 'tenant-1',
      employeeId: 'employee-1',
      jobFunctionId: 'function-1',
      unitId: 'unit-1',
      templateId: 'template-1',
      documentType: 'OS',
      generatedBy: 'user-1',
      generatedAt: new Date(),
      status: 'ACTIVE',
    })

    const result = await service.generateForEmployee('employee-1', { documentType: 'OS' }, scopedUser)

    expect(result.data.unitId).toBe('unit-1')
    expect(repository.createGeneratedDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        employeeId: 'employee-1',
        functionId: 'function-1',
        unitId: 'unit-1',
        templateId: 'template-1',
        fileContent: Buffer.from('rendered'),
      }),
    )
    expect(docx.render).toHaveBeenCalledWith(
      Buffer.from('template'),
      expect.objectContaining({
        nome: 'João Silva',
        NOME: 'João Silva',
        cpf: '12345678900',
        CPF: '12345678900',
        matricula: 'MAT-001',
        MATRICULA: 'MAT-001',
        funcao: 'Soldador',
        'função': 'Soldador',
        'FUNÇÃO': 'Soldador',
        unidade: 'Unidade Centro',
        empresa: 'Empresa SST',
      }),
    )
  })

  it('nega geração quando o usuário não tem acesso à unidade do colaborador', async () => {
    repository.findEmployeeForGeneration.mockResolvedValue(employee)

    await expect(
      service.generateForEmployee(
        'employee-1',
        { documentType: 'OS' },
        { ...scopedUser, unitIds: ['unit-2'] },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('nega geração quando a função não está vinculada à unidade do colaborador', async () => {
    repository.findEmployeeForGeneration.mockResolvedValue({
      ...employee,
      jobFunction: { ...employee.jobFunction, functionUnits: [] },
    })

    await expect(
      service.generateForEmployee('employee-1', { documentType: 'OS' }, scopedUser),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('nega exclusão de documento para usuário operacional', async () => {
    await expect(
      service.deleteGeneratedDocument('document-1', scopedUser),
    ).rejects.toBeInstanceOf(ForbiddenException)
    expect(repository.findDocumentById).not.toHaveBeenCalled()
  })

  it('permite download em PDF para usuário de consulta com acesso ao colaborador', async () => {
    repository.findDocumentById.mockResolvedValue({
      id: 'document-1',
      tenantId: 'tenant-1',
      employee,
      documentType: 'ORDEM_SERVICO',
      fileContent: Buffer.from('docx'),
      status: 'ACTIVE',
    })
    exportService.buildDownloadFile.mockResolvedValue({
      buffer: Buffer.from('pdf'),
      filename: 'ordem-servico-document-1.pdf',
      contentType: 'application/pdf',
    })

    const result = await service.getGeneratedDocumentFile(
      'document-1',
      { ...scopedUser, role: Role.CONSULTA },
      'pdf',
    )

    expect(exportService.buildDownloadFile).toHaveBeenCalledWith({
      sourceBuffer: Buffer.from('docx'),
      filenameBase: expect.stringContaining('document-1'),
      format: 'pdf',
    })
    expect(result.contentType).toBe('application/pdf')
  })

  it('nega download em Word para usuário sem perfil administrativo ou técnico', async () => {
    repository.findDocumentById.mockResolvedValue({
      id: 'document-1',
      tenantId: 'tenant-1',
      employee,
      documentType: 'ORDEM_SERVICO',
      fileContent: Buffer.from('docx'),
      status: 'ACTIVE',
    })

    await expect(
      service.getGeneratedDocumentFile('document-1', { ...scopedUser, role: Role.CONSULTA }, 'docx'),
    ).rejects.toBeInstanceOf(ForbiddenException)

    expect(exportService.buildDownloadFile).not.toHaveBeenCalled()
  })
})
