import { BadRequestException } from '@nestjs/common'
import { createMinimalDocxBuffer, createZipArchive } from './docx-test-helpers'
import { DocumentExportService } from './document-export.service'

describe('DocumentExportService', () => {
  let service: DocumentExportService

  beforeEach(() => {
    service = new DocumentExportService()
  })

  it('retorna DOCX para download quando a origem e segura', async () => {
    const sourceBuffer = createMinimalDocxBuffer()

    await expect(
      service.buildDownloadFile({
        sourceBuffer,
        filenameBase: 'ordem-servico',
        format: 'docx',
      }),
    ).resolves.toEqual({
      buffer: sourceBuffer,
      filename: 'ordem-servico.docx',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
  })

  it('bloqueia DOCX suspeito antes da conversao', async () => {
    const sourceBuffer = createZipArchive([
      { name: '[Content_Types].xml', content: '<Types />' },
      {
        name: 'word/document.xml',
        content: `<w:document>${'A'.repeat(256 * 1024)}</w:document>`,
        compressionMethod: 8,
      },
    ])

    const promise = service.buildDownloadFile({
      sourceBuffer,
      filenameBase: 'ordem-servico',
      format: 'pdf',
    })

    await expect(promise).rejects.toBeInstanceOf(BadRequestException)

    try {
      await promise
    } catch (error) {
      const response = (error as BadRequestException).getResponse() as {
        error?: { code?: string; message?: string }
      }

      expect(response.error?.code).toBe('INVALID_DOCX_CONTENT')
      expect(response.error?.message).toContain('compressão suspeita')
    }
  })
})
