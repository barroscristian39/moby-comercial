import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common'
import { FastifyReply } from 'fastify'
import { Permission, RequestUser, Role } from '@moby/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ManualAudit } from '../../common/decorators/manual-audit.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodPipe } from '../../common/pipes/zod.pipe'
import {
  EmitSstLegalDocumentDto,
  EmitSstLegalDocumentSchema,
  ListSstLegalDocumentsDto,
  ListSstLegalDocumentsSchema,
} from './dto/emit-sst-legal-document.dto'
import { SstLegalDocumentsService } from './sst-legal-documents.service'

@ManualAudit()
@Controller('documents/legal')
export class SstLegalDocumentsController {
  constructor(private readonly legalDocumentsService: SstLegalDocumentsService) {}

  @RequirePermissions(Permission.DOCUMENTS_READ)
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(ListSstLegalDocumentsSchema)) query: ListSstLegalDocumentsDto,
  ) {
    const { page, perPage, companyId, unitId, documentType, status, search } = query
    return this.legalDocumentsService.findAll(user, { page, perPage }, {
      companyId,
      unitId,
      documentType,
      status,
      search,
    })
  }

  @RequirePermissions(Permission.DOCUMENTS_READ)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.legalDocumentsService.findOne(id, user)
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.TECNICO_SST)
  @RequirePermissions(Permission.DOCUMENTS_WRITE)
  @Post('emit')
  emit(
    @Body(new ZodPipe(EmitSstLegalDocumentSchema)) dto: EmitSstLegalDocumentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.legalDocumentsService.emit(dto, user)
  }

  @RequirePermissions(Permission.DOCUMENTS_READ)
  @Get(':id/download')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Res() reply: FastifyReply,
  ) {
    const file = await this.legalDocumentsService.getHtmlFile(id, user)
    return reply
      .header('Content-Type', file.contentType)
      .header('Content-Disposition', `attachment; filename="${file.filename}"`)
      .header('Content-Length', String(file.buffer.length))
      .send(file.buffer)
  }
}
