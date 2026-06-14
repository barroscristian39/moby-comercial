import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { AuditAction, SstLegalDocumentStatus, SstLegalDocumentType } from '@prisma/client'
import { PaginationDto, RequestUser, Role } from '@moby/shared'
import { randomUUID } from 'crypto'
import { AuthorizationService } from '../../common/authorization/authorization.service'
import { AuditService } from '../audit/audit.service'
import { EmitSstLegalDocumentDto } from './dto/emit-sst-legal-document.dto'
import { SstLegalDocumentEntity } from './entities/sst-legal-document.entity'
import { SstLegalDocumentsRepository } from './sst-legal-documents.repository'

const DOCUMENT_TYPE_LABELS: Record<SstLegalDocumentType, string> = {
  PGR: 'Programa de Gerenciamento de Riscos',
  PCMSO: 'Programa de Controle Medico de Saude Ocupacional',
  LTCAT: 'Laudo Tecnico das Condicoes Ambientais do Trabalho',
  LIP: 'Laudo de Insalubridade e Periculosidade',
}

@Injectable()
export class SstLegalDocumentsService {
  constructor(
    private readonly legalDocumentsRepository: SstLegalDocumentsRepository,
    private readonly authorizationService: AuthorizationService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    currentUser: RequestUser,
    pagination: PaginationDto,
    filters: {
      companyId?: string
      unitId?: string
      documentType?: string
      status?: string
      search?: string
    },
  ) {
    if (filters.companyId) await this.authorizationService.assertCompanyAccess(currentUser, filters.companyId)
    if (filters.unitId) await this.authorizationService.assertUnitAccess(currentUser, filters.unitId)

    const scope = this.resolveScope(currentUser)
    const { items, total } = await this.legalDocumentsRepository.findAll({
      ...scope,
      ...filters,
      page: pagination.page,
      perPage: pagination.perPage,
    })

    return {
      data: items.map((item) => this.mapToEntity(item)),
      meta: {
        total,
        page: pagination.page,
        perPage: pagination.perPage,
        totalPages: Math.ceil(total / pagination.perPage),
      },
    }
  }

  async findOne(id: string, currentUser: RequestUser) {
    const document = await this.findInUserScope(id, currentUser)
    return { data: this.mapToEntity(document) }
  }

  async emit(dto: EmitSstLegalDocumentDto, currentUser: RequestUser) {
    const company = await this.legalDocumentsRepository.findCompanyById(dto.companyId)
    if (!company || !company.isActive) {
      throw new NotFoundException({
        error: { code: 'COMPANY_NOT_FOUND', message: 'Empresa não encontrada', statusCode: 404 },
      })
    }

    await this.authorizationService.assertCompanyAccess(currentUser, company.id)

    const unit = dto.unitId ? await this.legalDocumentsRepository.findUnitById(dto.unitId) : null
    if (dto.unitId && (!unit || !unit.isActive || unit.companyId !== company.id)) {
      throw new NotFoundException({
        error: { code: 'UNIT_NOT_FOUND', message: 'Unidade não encontrada para a empresa informada', statusCode: 404 },
      })
    }

    if (unit) await this.authorizationService.assertUnitAccess(currentUser, unit.id)

    const documentType = dto.documentType as SstLegalDocumentType
    const unitId = unit?.id ?? null
    const version = (await this.legalDocumentsRepository.maxVersion(company.id, unitId, documentType)) + 1
    const stats = await this.legalDocumentsRepository.getEmissionStats({
      companyId: company.id,
      unitId: unit?.id,
    })
    const title = dto.title?.trim() || `${dto.documentType} - ${company.tradeName ?? company.name}${unit ? ` - ${unit.name}` : ''}`
    const contentHtml = this.buildHtml({
      title,
      documentType,
      version,
      company,
      unit,
      summary: dto.summary,
      effectiveFrom: dto.effectiveFrom,
      effectiveUntil: dto.effectiveUntil,
      generatedByName: currentUser.name ?? currentUser.email ?? currentUser.userId,
      stats,
    })

    await this.legalDocumentsRepository.supersedeActive(company.id, unitId, documentType)

    const document = await this.legalDocumentsRepository.create({
      id: randomUUID(),
      tenantId: company.tenantId,
      companyId: company.id,
      unitId,
      documentType,
      title,
      version,
      status: SstLegalDocumentStatus.ACTIVE,
      summary: dto.summary,
      contentHtml,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
      effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : null,
      generatedBy: currentUser.userId,
    })

    await this.auditService.record({
      tenantId: document.tenantId,
      actorUserId: currentUser.userId,
      action: AuditAction.CREATE,
      entityType: 'sst_legal_documents',
      entityId: document.id,
      metadata: {
        companyId: document.companyId,
        unitId: document.unitId,
        documentType: document.documentType,
        version: document.version,
      },
    })

    return { data: this.mapToEntity(document) }
  }

  async getHtmlFile(id: string, currentUser: RequestUser) {
    const document = await this.findInUserScope(id, currentUser)
    return {
      filename: `${document.documentType.toLowerCase()}-v${document.version}-${document.id}.html`,
      contentType: 'text/html; charset=utf-8',
      buffer: Buffer.from(document.contentHtml, 'utf-8'),
    }
  }

  private async findInUserScope(id: string, currentUser: RequestUser) {
    const scope = this.resolveScope(currentUser)
    const document = currentUser.role === Role.SUPER_ADMIN
      ? await this.legalDocumentsRepository.findById(id)
      : await this.legalDocumentsRepository.findByIdInScope(id, scope)

    if (!document) {
      throw new NotFoundException({
        error: { code: 'SST_LEGAL_DOCUMENT_NOT_FOUND', message: 'Documento SST não encontrado', statusCode: 404 },
      })
    }

    return document
  }

  private resolveScope(currentUser: RequestUser) {
    if (currentUser.role === Role.SUPER_ADMIN) return {}
    if (!currentUser.tenantId) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Usuário sem ambiente associado', statusCode: 403 },
      })
    }

    return {
      tenantId: currentUser.tenantId,
      companyIds: this.authorizationService.resolveCompanyScope(currentUser),
      unitIds: this.authorizationService.resolveUnitScope(currentUser),
    }
  }

  private mapToEntity(document: any): SstLegalDocumentEntity {
    return {
      id: document.id,
      tenantId: document.tenantId,
      companyId: document.companyId,
      unitId: document.unitId,
      companyName: document.company?.tradeName ?? document.company?.name,
      unitName: document.unit?.name ?? null,
      documentType: document.documentType,
      title: document.title,
      version: document.version,
      status: document.status,
      summary: document.summary,
      effectiveFrom: document.effectiveFrom,
      effectiveUntil: document.effectiveUntil,
      generatedBy: document.generatedBy,
      generatorName: document.generator?.name,
      generatedAt: document.generatedAt,
    }
  }

  private buildHtml(input: {
    title: string
    documentType: SstLegalDocumentType
    version: number
    company: any
    unit: any | null
    summary?: string
    effectiveFrom?: string
    effectiveUntil?: string
    generatedByName: string
    stats: {
      employees: number
      activeRisks: number
      criticalRisks: number
      activeEpiItems: number
      expiredEpiItems: number
      examsDue: number
      trainingsDue: number
      risksByType: Array<{ key: string; count: number }>
      risksByLevel: Array<{ key: string; count: number }>
    }
  }) {
    const issuedAt = new Intl.DateTimeFormat('pt-BR').format(new Date())
    const riskRows = input.stats.risksByType.map((item) => `<tr><td>${escapeHtml(item.key)}</td><td>${item.count}</td></tr>`).join('')
    const levelRows = input.stats.risksByLevel.map((item) => `<tr><td>${escapeHtml(item.key)}</td><td>${item.count}</td></tr>`).join('')

    return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.title)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #172033; margin: 40px; line-height: 1.45; }
    header { border-bottom: 3px solid #1d4ed8; padding-bottom: 18px; margin-bottom: 28px; }
    h1 { margin: 0 0 8px; font-size: 26px; color: #0f2b66; }
    h2 { margin-top: 28px; color: #173b7a; font-size: 18px; }
    .meta, .muted { color: #64748b; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 22px 0; }
    .card { border: 1px solid #dbe4f0; border-radius: 8px; padding: 14px; background: #f8fbff; }
    .card strong { display: block; font-size: 24px; color: #0f2b66; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #dbe4f0; padding: 9px; text-align: left; }
    th { background: #eef5ff; color: #173b7a; }
    footer { margin-top: 40px; border-top: 1px solid #dbe4f0; padding-top: 16px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <header>
    <p class="meta">MOBY SST · ${escapeHtml(DOCUMENT_TYPE_LABELS[input.documentType])} · Versão ${input.version}</p>
    <h1>${escapeHtml(input.title)}</h1>
    <p>${escapeHtml(input.company.tradeName ?? input.company.name)} · CNPJ ${escapeHtml(input.company.cnpj)}</p>
    <p class="muted">${input.unit ? `Unidade: ${escapeHtml(input.unit.name)}` : 'Abrangência: empresa completa'}</p>
  </header>

  <section>
    <h2>Identificação e Vigência</h2>
    <p>Emitido em ${issuedAt} por ${escapeHtml(input.generatedByName)}.</p>
    <p>Vigência: ${escapeHtml(input.effectiveFrom ?? 'não informada')} até ${escapeHtml(input.effectiveUntil ?? 'não informada')}.</p>
    <p>${escapeHtml(input.summary || 'Documento emitido a partir dos dados ocupacionais disponíveis no MOBY no momento da emissão.')}</p>
  </section>

  <section>
    <h2>Indicadores do Escopo</h2>
    <div class="grid">
      <div class="card"><strong>${input.stats.employees}</strong>Colaboradores ativos</div>
      <div class="card"><strong>${input.stats.activeRisks}</strong>Riscos ativos</div>
      <div class="card"><strong>${input.stats.criticalRisks}</strong>Riscos críticos</div>
      <div class="card"><strong>${input.stats.activeEpiItems}</strong>EPIs no catálogo</div>
    </div>
    <div class="grid">
      <div class="card"><strong>${input.stats.expiredEpiItems}</strong>EPIs com CA vencido</div>
      <div class="card"><strong>${input.stats.examsDue}</strong>Exames vencidos</div>
      <div class="card"><strong>${input.stats.trainingsDue}</strong>Treinamentos vencidos</div>
      <div class="card"><strong>${input.version}</strong>Versão documental</div>
    </div>
  </section>

  <section>
    <h2>Riscos por Tipo</h2>
    <table><thead><tr><th>Tipo</th><th>Quantidade</th></tr></thead><tbody>${riskRows || '<tr><td colspan="2">Sem riscos ativos registrados.</td></tr>'}</tbody></table>
  </section>

  <section>
    <h2>Riscos por Nível</h2>
    <table><thead><tr><th>Nível</th><th>Quantidade</th></tr></thead><tbody>${levelRows || '<tr><td colspan="2">Sem riscos ativos registrados.</td></tr>'}</tbody></table>
  </section>

  <section>
    <h2>Diretrizes do Documento</h2>
    <p>Este documento consolida evidências e indicadores para apoiar a gestão de conformidade SST. A versão emitida é imutável e novas revisões devem gerar nova versão.</p>
  </section>

  <footer>
    Documento gerado pelo MOBY. Revise tecnicamente antes de uso legal externo, assinatura ou protocolo.
  </footer>
</body>
</html>`
  }
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
