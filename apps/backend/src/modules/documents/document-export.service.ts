import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { execFile } from 'child_process'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { promisify } from 'util'
import { assertSafeDocxArchive, UnsafeDocxArchiveError } from './docx-archive-safety'

export type DocumentDownloadFormat = 'pdf' | 'docx'

const execFileAsync = promisify(execFile)
const DOCX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const PDF_CONTENT_TYPE = 'application/pdf'
const WORD_PDF_FORMAT = 17
const DEFAULT_LIBREOFFICE_BIN = process.env.LIBREOFFICE_BIN || 'soffice'

@Injectable()
export class DocumentExportService {
  async buildDownloadFile(params: {
    sourceBuffer: Buffer
    filenameBase: string
    format: DocumentDownloadFormat
  }): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    this.assertSafeSourceDocx(params.sourceBuffer)

    if (params.format === 'docx') {
      return {
        buffer: params.sourceBuffer,
        filename: `${params.filenameBase}.docx`,
        contentType: DOCX_CONTENT_TYPE,
      }
    }

    return {
      buffer: await this.convertDocxToPdf(params.sourceBuffer),
      filename: `${params.filenameBase}.pdf`,
      contentType: PDF_CONTENT_TYPE,
    }
  }

  private async convertDocxToPdf(sourceBuffer: Buffer): Promise<Buffer> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'moby-doc-export-'))
    const inputPath = path.join(tempDir, 'document.docx')
    const outputPath = path.join(tempDir, 'document.pdf')

    try {
      await fs.writeFile(inputPath, sourceBuffer)
      await this.runWordPdfExport(inputPath, outputPath)
      return await fs.readFile(outputPath)
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error

      throw new ServiceUnavailableException({
        error: {
          code: 'PDF_EXPORT_UNAVAILABLE',
          message: 'A exportação em PDF não está disponível neste ambiente no momento.',
          statusCode: 503,
        },
      })
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true })
    }
  }

  private async runWordPdfExport(inputPath: string, outputPath: string) {
    if (process.platform === 'win32') {
      await this.runWindowsWordExport(inputPath, outputPath)
      return
    }

    if (process.platform === 'linux') {
      await this.runLibreOfficeExport(inputPath, outputPath)
      return
    }

    throw new ServiceUnavailableException({
      error: {
        code: 'PDF_EXPORT_UNAVAILABLE',
        message: 'A exportação em PDF não está disponível neste sistema operacional.',
        statusCode: 503,
      },
    })
  }

  private async runWindowsWordExport(inputPath: string, outputPath: string) {

    const script = [
      "$ErrorActionPreference = 'Stop'",
      '$inputPath = $env:INPUT_DOCX_PATH',
      '$outputPath = $env:OUTPUT_PDF_PATH',
      '$word = $null',
      '$doc = $null',
      'try {',
      '  $word = New-Object -ComObject Word.Application',
      '  $word.Visible = $false',
      '  $word.DisplayAlerts = 0',
      '  $doc = $word.Documents.Open($inputPath)',
      `  $doc.SaveAs([ref]$outputPath, [ref]${WORD_PDF_FORMAT})`,
      '} finally {',
      '  if ($doc) { $doc.Close([ref]$false) | Out-Null }',
      '  if ($word) { $word.Quit() | Out-Null }',
      '}',
    ].join('\n')

    const encodedCommand = Buffer.from(script, 'utf16le').toString('base64')

    try {
      await execFileAsync(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encodedCommand],
        {
          timeout: 120000,
          windowsHide: true,
          env: {
            ...process.env,
            INPUT_DOCX_PATH: inputPath,
            OUTPUT_PDF_PATH: outputPath,
          },
        },
      )

      await fs.access(outputPath)
    } catch {
      throw new ServiceUnavailableException({
        error: {
          code: 'PDF_EXPORT_UNAVAILABLE',
          message: 'A exportação em PDF não está disponível neste ambiente no momento.',
          statusCode: 503,
        },
      })
    }
  }

  private async runLibreOfficeExport(inputPath: string, outputPath: string) {
    const outputDir = path.dirname(outputPath)
    const userProfileDir = path.join(outputDir, 'libreoffice-profile')

    await fs.mkdir(userProfileDir, { recursive: true })

    try {
      await execFileAsync(
        DEFAULT_LIBREOFFICE_BIN,
        [
          '--headless',
          '--nologo',
          '--nolockcheck',
          '--nodefault',
          '--nofirststartwizard',
          '--norestore',
          `-env:UserInstallation=file://${userProfileDir.replace(/\\/g, '/')}`,
          '--convert-to',
          'pdf:writer_pdf_Export',
          '--outdir',
          outputDir,
          inputPath,
        ],
        {
          timeout: 120000,
          env: process.env,
        },
      )

      await fs.access(outputPath)
    } catch {
      throw new ServiceUnavailableException({
        error: {
          code: 'PDF_EXPORT_UNAVAILABLE',
          message: 'A exportação em PDF não está disponível neste ambiente no momento.',
          statusCode: 503,
        },
      })
    }
  }

  private assertSafeSourceDocx(sourceBuffer: Buffer) {
    try {
      assertSafeDocxArchive(sourceBuffer)
    } catch (error) {
      if (error instanceof UnsafeDocxArchiveError) {
        throw new BadRequestException({
          error: {
            code: 'INVALID_DOCX_CONTENT',
            message: error.message,
            statusCode: 400,
          },
        })
      }

      throw new BadRequestException({
        error: {
          code: 'INVALID_DOCX_CONTENT',
          message: 'Arquivo DOCX corrompido ou inválido',
          statusCode: 400,
        },
      })
    }
  }
}
