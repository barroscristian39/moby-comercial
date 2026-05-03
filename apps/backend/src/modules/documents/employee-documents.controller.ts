import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common'
import { Permission, RequestUser } from '@moby/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { DocumentsService } from './documents.service'

@Controller('employees')
export class EmployeeDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @RequirePermissions(Permission.DOCUMENTS_READ)
  @Get(':id/documents')
  listEmployeeDocuments(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.documentsService.listEmployeeDocuments(id, user)
  }
}
