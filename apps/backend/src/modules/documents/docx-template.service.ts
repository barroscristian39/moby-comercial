import { BadRequestException, Injectable } from '@nestjs/common'

const Docxtemplater = require('docxtemplater')
const PizZip = require('pizzip')

@Injectable()
export class DocxTemplateService {
  extractVariables(templateBuffer: Buffer): string[] {
    try {
      const zip = new PizZip(templateBuffer)
      const variables = new Set<string>()
      const relevantParts = Object.keys(zip.files).filter((name) =>
        /^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/i.test(name),
      )

      for (const partName of relevantParts) {
        const xml = zip.file(partName)?.asText()
        if (!xml) continue

        const text = this.decodeXmlEntities(xml.replace(/<[^>]+>/g, ''))
        const matches = text.matchAll(/\{\{\s*([\p{L}\p{N}\p{M}_.-]+)\s*\}\}/gu)
        for (const match of matches) {
          variables.add(match[1])
        }
      }

      return Array.from(variables).sort((a, b) => a.localeCompare(b))
    } catch {
      throw new BadRequestException({
        error: {
          code: 'DOCX_TEMPLATE_INVALID',
          message: 'Não foi possível ler o DOCX. Envie um arquivo .docx válido.',
          statusCode: 400,
        },
      })
    }
  }

  render(templateBuffer: Buffer, data: Record<string, string>): Buffer {
    try {
      const zip = new PizZip(templateBuffer)
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
        // Missing or null values should render as empty text instead of the literal "undefined".
        nullGetter: () => '',
      })

      doc.render(data)

      return doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      })
    } catch (error: any) {
      throw new BadRequestException({
        error: {
          code: 'DOCX_TEMPLATE_RENDER_FAILED',
          message: this.safeTemplateError(error),
          statusCode: 400,
        },
      })
    }
  }

  private decodeXmlEntities(value: string) {
    return value
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
  }

  private safeTemplateError(error: any) {
    const explanation = error?.properties?.explanation
    if (typeof explanation === 'string' && explanation.length <= 200) {
      return `Falha ao preencher template DOCX: ${explanation}`
    }
    return 'Falha ao preencher template DOCX. Verifique as variáveis {{ }} do arquivo.'
  }
}
