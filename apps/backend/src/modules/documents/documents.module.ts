import { Module } from '@nestjs/common'
import { AuthorizationModule } from '../../common/authorization/authorization.module'
import { PrismaModule } from '../../database/prisma.module'
import { AuditModule } from '../audit/audit.module'
import { AccidentDocumentsController } from './accident-documents.controller'
import { AccidentTemplatesController } from './accident-templates.controller'
import { DocumentExportService } from './document-export.service'
import { DocumentStorageService } from './document-storage.service'
import { DocumentsController } from './documents.controller'
import { DocumentsRepository } from './documents.repository'
import { DocumentsService } from './documents.service'
import { DocxTemplateService } from './docx-template.service'
import { EmployeeDocumentsController } from './employee-documents.controller'
import { FunctionTemplatesController } from './function-templates.controller'
import { SstLegalDocumentsController } from './sst-legal-documents.controller'
import { SstLegalDocumentsRepository } from './sst-legal-documents.repository'
import { SstLegalDocumentsService } from './sst-legal-documents.service'

@Module({
  imports: [PrismaModule, AuditModule, AuthorizationModule],
  controllers: [
    FunctionTemplatesController,
    AccidentTemplatesController,
    DocumentsController,
    SstLegalDocumentsController,
    EmployeeDocumentsController,
    AccidentDocumentsController,
  ],
  providers: [
    DocumentsRepository,
    DocumentsService,
    SstLegalDocumentsRepository,
    SstLegalDocumentsService,
    DocumentStorageService,
    DocumentExportService,
    DocxTemplateService,
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
