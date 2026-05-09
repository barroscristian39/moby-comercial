import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/database/prisma.service'
import { DocumentStorageService } from '../src/modules/documents/document-storage.service'

async function backfillRecords<T extends { id: string; filePath: string | null; fileContent: Uint8Array | null }>(
  label: string,
  records: T[],
  update: (id: string, buffer: Buffer) => Promise<void>,
  storageService: DocumentStorageService,
) {
  let migrated = 0
  let skipped = 0

  for (const record of records) {
    if (record.fileContent?.length || !record.filePath) {
      skipped += 1
      continue
    }

    try {
      const buffer = await storageService.readLegacyBuffer(record.filePath)
      await update(record.id, buffer)
      migrated += 1
    } catch (error) {
      skipped += 1
      console.warn(`[Backfill] ${label} ${record.id} nao migrado: ${(error as Error).message}`)
    }
  }

  console.log(`[Backfill] ${label}: ${migrated} migrados, ${skipped} ignorados`)
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false })

  try {
    const prisma = app.get(PrismaService)
    const storageService = app.get(DocumentStorageService)

    await backfillRecords(
      'function_templates',
      await prisma.functionTemplate.findMany({
        where: {
          fileContent: null,
          filePath: { not: null },
        },
        select: { id: true, filePath: true, fileContent: true },
      }),
      async (id, buffer) => {
        await prisma.functionTemplate.update({
          where: { id },
          data: { fileContent: buffer, filePath: null },
        })
      },
      storageService,
    )

    await backfillRecords(
      'accident_templates',
      await prisma.accidentTemplate.findMany({
        where: {
          fileContent: null,
          filePath: { not: null },
        },
        select: { id: true, filePath: true, fileContent: true },
      }),
      async (id, buffer) => {
        await prisma.accidentTemplate.update({
          where: { id },
          data: { fileContent: buffer, filePath: null },
        })
      },
      storageService,
    )

    await backfillRecords(
      'generated_documents',
      await prisma.generatedDocument.findMany({
        where: {
          fileContent: null,
          filePath: { not: null },
        },
        select: { id: true, filePath: true, fileContent: true },
      }),
      async (id, buffer) => {
        await prisma.generatedDocument.update({
          where: { id },
          data: { fileContent: buffer, filePath: null },
        })
      },
      storageService,
    )

    await backfillRecords(
      'accident_generated_documents',
      await prisma.accidentGeneratedDocument.findMany({
        where: {
          fileContent: null,
          filePath: { not: null },
        },
        select: { id: true, filePath: true, fileContent: true },
      }),
      async (id, buffer) => {
        await prisma.accidentGeneratedDocument.update({
          where: { id },
          data: { fileContent: buffer, filePath: null },
        })
      },
      storageService,
    )
  } finally {
    await app.close()
  }
}

bootstrap().catch((error) => {
  console.error('[Backfill] Falha ao migrar documentos para o banco:', error)
  process.exit(1)
})
