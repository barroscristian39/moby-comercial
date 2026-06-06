import { BadRequestException, Injectable } from '@nestjs/common'
import * as fs from 'fs/promises'
import * as path from 'path'
import { assertSafeDocxArchive, UnsafeDocxArchiveError } from './docx-archive-safety'

const PizZip = require('pizzip')

@Injectable()
export class DocumentStorageService {
  private readonly root = path.resolve(
    process.env.PRIVATE_STORAGE_ROOT ?? path.join(process.cwd(), 'storage', 'private'),
  )

  async readLegacyBuffer(relativePath: string): Promise<Buffer> {
    const absolutePath = this.resolvePrivatePath(relativePath)
    return fs.readFile(absolutePath)
  }

  assertValidDocx(buffer: Buffer, filename: string, mimetype?: string) {
    const lowerName = filename.toLowerCase()
    const allowedMimeTypes = new Set([
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream',
      'application/zip',
    ])

    if (!lowerName.endsWith('.docx')) {
      this.invalidUpload('Apenas arquivos .docx são aceitos')
    }

    if (mimetype && !allowedMimeTypes.has(mimetype)) {
      this.invalidUpload('Tipo de arquivo inválido para template DOCX')
    }

    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      this.invalidUpload('Arquivo DOCX inválido')
    }

    try {
      assertSafeDocxArchive(buffer)
      const zip = new PizZip(buffer)
      if (!zip.file('[Content_Types].xml') || !zip.file('word/document.xml')) {
        this.invalidUpload('Arquivo DOCX sem estrutura esperada')
      }
    } catch (error) {
      if (error instanceof UnsafeDocxArchiveError) {
        this.invalidUpload(error.message)
      }
      this.invalidUpload('Arquivo DOCX corrompido ou inválido')
    }
  }

  private resolvePrivatePath(relativePath: string) {
    const normalized = this.toStoragePath(relativePath)
    const absolutePath = path.resolve(this.root, normalized)
    const rootWithSeparator = this.root.endsWith(path.sep) ? this.root : `${this.root}${path.sep}`

    if (absolutePath !== this.root && !absolutePath.startsWith(rootWithSeparator)) {
      throw new Error('Invalid storage path')
    }

    return absolutePath
  }

  private toStoragePath(relativePath: string) {
    return relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  }

  private invalidUpload(message: string): never {
    throw new BadRequestException({
      error: { code: 'INVALID_DOCX_UPLOAD', message, statusCode: 400 },
    })
  }
}
