import { assertSafeDocxArchive, UnsafeDocxArchiveError } from './docx-archive-safety'
import { createMinimalDocxBuffer, createZipArchive } from './docx-test-helpers'

describe('assertSafeDocxArchive', () => {
  it('aceita um DOCX minimo com as partes esperadas', () => {
    const inspection = assertSafeDocxArchive(createMinimalDocxBuffer())

    expect(inspection.entryCount).toBe(2)
    expect(inspection.entries.map((entry) => entry.name)).toEqual([
      '[Content_Types].xml',
      'word/document.xml',
    ])
  })

  it('bloqueia caminhos internos com traversal', () => {
    const archive = createMinimalDocxBuffer({
      additionalEntries: [{ name: '../segredo.txt', content: 'boom' }],
    })

    expect(() => assertSafeDocxArchive(archive)).toThrow(UnsafeDocxArchiveError)
    expect(() => assertSafeDocxArchive(archive)).toThrow('caminho interno inválido')
  })

  it('bloqueia DOCX com compressao suspeita', () => {
    const archive = createZipArchive([
      { name: '[Content_Types].xml', content: '<Types />' },
      {
        name: 'word/document.xml',
        content: `<w:document>${'A'.repeat(256 * 1024)}</w:document>`,
        compressionMethod: 8,
      },
    ])

    expect(() => assertSafeDocxArchive(archive)).toThrow(UnsafeDocxArchiveError)
    expect(() => assertSafeDocxArchive(archive)).toThrow('compressão suspeita')
  })

  it('bloqueia DOCX sem a estrutura minima esperada', () => {
    const archive = createZipArchive([
      { name: '[Content_Types].xml', content: '<Types />' },
    ])

    expect(() => assertSafeDocxArchive(archive)).toThrow(UnsafeDocxArchiveError)
    expect(() => assertSafeDocxArchive(archive)).toThrow('sem estrutura esperada')
  })
})
