jest.mock('docxtemplater', () => jest.fn())
jest.mock('pizzip', () => jest.fn())

import { createMinimalDocxBuffer } from './docx-test-helpers'
import { DocxTemplateService } from './docx-template.service'

const Docxtemplater = require('docxtemplater')
const PizZip = require('pizzip')

describe('DocxTemplateService', () => {
  let service: DocxTemplateService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new DocxTemplateService()
  })

  it('extrai variáveis com caracteres acentuados do template', () => {
    PizZip.mockImplementation(() => ({
      files: { 'word/document.xml': {} },
      file: (name: string) => (
        name === 'word/document.xml'
          ? { asText: () => '<w:t>{{FUNÇÃO}}</w:t><w:t>{{NOME}}</w:t>' }
          : undefined
      ),
    }))

    const variables = service.extractVariables(
      createMinimalDocxBuffer({
        documentXml: '<w:document><w:body><w:t>{{FUNÇÃO}}</w:t><w:t>{{NOME}}</w:t></w:body></w:document>',
      }),
    )

    expect(variables).toEqual(['FUNÇÃO', 'NOME'])
  })

  it('configura variáveis ausentes para renderizar vazio em vez de undefined', () => {
    const render = jest.fn()
    const generate = jest.fn().mockReturnValue(Buffer.from('rendered'))

    PizZip.mockImplementation(() => ({}))
    Docxtemplater.mockImplementation((_zip: unknown, options: { nullGetter?: () => string }) => {
      expect(options.nullGetter?.()).toBe('')

      return {
        render,
        getZip: () => ({ generate }),
      }
    })

    const output = service.render(createMinimalDocxBuffer(), { nome: 'João Silva' })

    expect(render).toHaveBeenCalledWith({ nome: 'João Silva' })
    expect(generate).toHaveBeenCalledWith({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })
    expect(output).toEqual(Buffer.from('rendered'))
  })
})
