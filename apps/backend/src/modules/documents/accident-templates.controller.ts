import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common'
import { Permission, RequestUser, Role } from '@moby/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ManualAudit } from '../../common/decorators/manual-audit.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodPipe } from '../../common/pipes/zod.pipe'
import {
  UpdateAccidentTemplateDto,
  UpdateAccidentTemplateSchema,
} from './dto/update-accident-template.dto'
import {
  UploadAccidentTemplateDto,
  UploadAccidentTemplateSchema,
} from './dto/upload-accident-template.dto'
import { DocumentsService } from './documents.service'

@ManualAudit()
@Controller('companies/:companyId/accident-templates')
export class AccidentTemplatesController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @RequirePermissions(Permission.DOCUMENTS_WRITE)
  @Post()
  async uploadTemplate(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: any,
    @CurrentUser() user: RequestUser,
  ) {
    const part = await request.file({
      limits: {
        files: 1,
        fileSize: 10 * 1024 * 1024,
      },
    })

    if (!part) {
      throw new BadRequestException({
        error: { code: 'DOCX_FILE_REQUIRED', message: 'Arquivo DOCX obrigatório', statusCode: 400 },
      })
    }

    const dto = this.parseMultipartFields(part.fields)
    const buffer = await part.toBuffer()

    return this.documentsService.uploadAccidentTemplate(
      companyId,
      dto,
      {
        filename: part.filename,
        mimetype: part.mimetype,
        buffer,
      },
      user,
    )
  }

  @RequirePermissions(Permission.DOCUMENTS_READ)
  @Get()
  listTemplates(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.documentsService.listAccidentTemplates(companyId, user)
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @RequirePermissions(Permission.DOCUMENTS_WRITE)
  @Patch(':templateId')
  updateTemplate(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body(new ZodPipe(UpdateAccidentTemplateSchema)) dto: UpdateAccidentTemplateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.documentsService.updateAccidentTemplate(companyId, templateId, dto, user)
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN)
  @RequirePermissions(Permission.DOCUMENTS_WRITE)
  @Delete(':templateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.documentsService.deleteAccidentTemplate(companyId, templateId, user)
    return null
  }

  private parseMultipartFields(fields: Record<string, any>): UploadAccidentTemplateDto {
    const parsed = UploadAccidentTemplateSchema.safeParse({
      documentType: this.fieldValue(fields, 'documentType'),
      name: this.fieldValue(fields, 'name'),
    })

    if (!parsed.success) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_TEMPLATE_UPLOAD',
          message: parsed.error.issues[0]?.message ?? 'Payload inválido',
          statusCode: 400,
        },
      })
    }

    return parsed.data
  }

  private fieldValue(fields: Record<string, any>, name: string): string | undefined {
    const field = fields?.[name]
    const value = Array.isArray(field) ? field[0]?.value : field?.value
    return value === undefined || value === null || value === '' ? undefined : String(value)
  }
}
