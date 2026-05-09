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
  Query,
  Req,
  Res,
} from '@nestjs/common'
import { FastifyReply } from 'fastify'
import { z } from 'zod'
import {
  AccidentSeverity,
  AccidentStatus,
  AccidentType,
  PaginationSchema,
  Permission,
  RequestUser,
} from '@moby/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ManualAudit } from '../../common/decorators/manual-audit.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { ZodPipe } from '../../common/pipes/zod.pipe'
import { AccidentsService } from './accidents.service'
import { CreateAccidentDto, CreateAccidentSchema } from './dto/create-accident.dto'
import {
  UploadAccidentEvidenceDto,
  UploadAccidentEvidenceSchema,
} from './dto/upload-accident-evidence.dto'
import { UpdateAccidentDto, UpdateAccidentSchema } from './dto/update-accident.dto'

const AccidentQuerySchema = PaginationSchema.extend({
  tenantId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  status: z.nativeEnum(AccidentStatus).optional(),
  severity: z.nativeEnum(AccidentSeverity).optional(),
  accidentType: z.nativeEnum(AccidentType).optional(),
  fromDate: z.string().trim().optional(),
  toDate: z.string().trim().optional(),
})

@ManualAudit()
@Controller('accidents')
export class AccidentsController {
  constructor(private readonly accidentsService: AccidentsService) {}

  @RequirePermissions(Permission.ACCIDENTS_READ)
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(AccidentQuerySchema)) query: z.infer<typeof AccidentQuerySchema>,
  ) {
    const {
      page,
      perPage,
      tenantId,
      companyId,
      unitId,
      employeeId,
      search,
      status,
      severity,
      accidentType,
      fromDate,
      toDate,
    } = query

    return this.accidentsService.findAll(
      user,
      { page, perPage },
      { tenantId, companyId, unitId, employeeId, search, status, severity, accidentType, fromDate, toDate },
    )
  }

  @RequirePermissions(Permission.ACCIDENTS_READ)
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.accidentsService.findOne(id, user)
  }

  @RequirePermissions(Permission.ACCIDENTS_READ)
  @Get(':id/conclusion-report')
  getConclusionReport(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.accidentsService.getConclusionReport(id, user)
  }

  @RequirePermissions(Permission.ACCIDENTS_READ)
  @Get(':id/evidences')
  listEvidences(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.accidentsService.listEvidences(id, user)
  }

  @RequirePermissions(Permission.ACCIDENTS_WRITE)
  @Post()
  create(
    @Body(new ZodPipe(CreateAccidentSchema)) dto: CreateAccidentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.accidentsService.create(dto, user)
  }

  @RequirePermissions(Permission.ACCIDENTS_WRITE)
  @Post(':id/evidences')
  async uploadEvidence(
    @Param('id', ParseUUIDPipe) id: string,
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
        error: { code: 'ACCIDENT_EVIDENCE_FILE_REQUIRED', message: 'Arquivo obrigatório', statusCode: 400 },
      })
    }

    const dto = this.parseEvidenceMultipartFields(part.fields)
    const buffer = await part.toBuffer()

    return this.accidentsService.uploadEvidence(
      id,
      dto,
      {
        filename: part.filename,
        mimetype: part.mimetype,
        buffer,
      },
      user,
    )
  }

  @RequirePermissions(Permission.ACCIDENTS_WRITE)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(UpdateAccidentSchema)) dto: UpdateAccidentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.accidentsService.update(id, dto, user)
  }

  @RequirePermissions(Permission.ACCIDENTS_READ)
  @Get(':id/evidences/:evidenceId/download')
  async downloadEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('evidenceId', ParseUUIDPipe) evidenceId: string,
    @CurrentUser() user: RequestUser,
    @Res() reply: FastifyReply,
  ) {
    const file = await this.accidentsService.getEvidenceFile(id, evidenceId, user)
    return reply
      .header('Content-Type', file.contentType)
      .header('Content-Disposition', `attachment; filename="${file.filename}"`)
      .header('Content-Length', String(file.buffer.length))
      .send(file.buffer)
  }

  @RequirePermissions(Permission.ACCIDENTS_WRITE)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.accidentsService.remove(id, user)
    return null
  }

  @RequirePermissions(Permission.ACCIDENTS_WRITE)
  @Delete(':id/evidences/:evidenceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('evidenceId', ParseUUIDPipe) evidenceId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.accidentsService.deleteEvidence(id, evidenceId, user)
    return null
  }

  private parseEvidenceMultipartFields(fields: Record<string, any>): UploadAccidentEvidenceDto {
    const parsed = UploadAccidentEvidenceSchema.safeParse({
      evidenceType: this.fieldValue(fields, 'evidenceType'),
      notes: this.fieldValue(fields, 'notes'),
    })

    if (!parsed.success) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_ACCIDENT_EVIDENCE_UPLOAD',
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
