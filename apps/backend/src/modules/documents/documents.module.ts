import { Module } from '@nestjs/common'
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

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [
    FunctionTemplatesController,
    AccidentTemplatesController,
    DocumentsController,
    EmployeeDocumentsController,
    AccidentDocumentsController,
  ],
  providers: [DocumentsRepository, DocumentsService, DocumentStorageService, DocumentExportService, DocxTemplateService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
