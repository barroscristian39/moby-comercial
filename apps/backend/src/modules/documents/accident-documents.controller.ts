import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common'
import { FastifyReply } from 'fastify'
import { Permission, RequestUser, Role } from '@moby/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ManualAudit } from '../../common/decorators/manual-audit.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodPipe } from '../../common/pipes/zod.pipe'
import {
  DownloadGeneratedDocumentQueryDto,
  DownloadGeneratedDocumentQuerySchema,
} from './dto/download-generated-document.dto'
import { GenerateDocumentDto, GenerateDocumentSchema } from './dto/generate-document.dto'
import { DocumentsService } from './documents.service'

@ManualAudit()
@Controller()
export class AccidentDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.TECNICO_SST)
  @RequirePermissions(Permission.DOCUMENTS_WRITE)
  @Post('accidents/:id/documents/generate')
  generate(
    @Param('id', ParseUUIDPipe) accidentId: string,
    @Body(new ZodPipe(GenerateDocumentSchema)) dto: GenerateDocumentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.documentsService.generateForAccident(accidentId, dto, user)
  }

  @RequirePermissions(Permission.DOCUMENTS_READ)
  @Get('accidents/:id/documents')
  listAccidentDocuments(
    @Param('id', ParseUUIDPipe) accidentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.documentsService.listAccidentDocuments(accidentId, user)
  }

  @RequirePermissions(Permission.DOCUMENTS_READ)
  @Get('accident-documents/:id/download')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new ZodPipe(DownloadGeneratedDocumentQuerySchema)) query: DownloadGeneratedDocumentQueryDto,
    @CurrentUser() user: RequestUser,
    @Res() reply: FastifyReply,
  ) {
    const file = await this.documentsService.getAccidentGeneratedDocumentFile(id, user, query.format)
    return reply
      .header('Content-Type', file.contentType)
      .header('Content-Disposition', `attachment; filename="${file.filename}"`)
      .header('Content-Length', String(file.buffer.length))
      .send(file.buffer)
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @RequirePermissions(Permission.DOCUMENTS_WRITE)
  @Delete('accident-documents/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.documentsService.deleteAccidentGeneratedDocument(id, user)
    return null
  }
}
