import { deflateRawSync } from 'zlib'

type ZipEntryInput = {
  name: string
  content?: Buffer | string
  compressionMethod?: 0 | 8
  compressedData?: Buffer
  compressedSizeOverride?: number
  uncompressedSizeOverride?: number
}

const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50

export function createMinimalDocxBuffer(options?: {
  documentXml?: string
  additionalEntries?: ZipEntryInput[]
}) {
  const documentXml = options?.documentXml ?? '<w:document><w:body><w:p><w:r><w:t>{{NOME}}</w:t></w:r></w:p></w:body></w:document>'

  return createZipArchive([
    {
      name: '[Content_Types].xml',
      content: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>',
    },
    {
      name: 'word/document.xml',
      content: documentXml,
    },
    ...(options?.additionalEntries ?? []),
  ])
}

export function createZipArchive(entries: ZipEntryInput[]) {
  const localFileSections: Buffer[] = []
  const centralDirectorySections: Buffer[] = []
  let localOffset = 0

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, 'utf8')
    const contentBuffer = Buffer.isBuffer(entry.content)
      ? entry.content
      : Buffer.from(entry.content ?? '', 'utf8')
    const compressionMethod = entry.compressionMethod ?? 0
    const compressedData = entry.compressedData ?? (
      compressionMethod === 8 ? deflateRawSync(contentBuffer) : contentBuffer
    )
    const compressedSize = entry.compressedSizeOverride ?? compressedData.length
    const uncompressedSize = entry.uncompressedSizeOverride ?? contentBuffer.length
    const crc32 = computeCrc32(contentBuffer)

    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(ZIP_LOCAL_FILE_HEADER_SIGNATURE, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0, 6)
    localHeader.writeUInt16LE(compressionMethod, 8)
    localHeader.writeUInt16LE(0, 10)
    localHeader.writeUInt16LE(0, 12)
    localHeader.writeUInt32LE(crc32, 14)
    localHeader.writeUInt32LE(compressedSize, 18)
    localHeader.writeUInt32LE(uncompressedSize, 22)
    localHeader.writeUInt16LE(nameBuffer.length, 26)
    localHeader.writeUInt16LE(0, 28)

    localFileSections.push(localHeader, nameBuffer, compressedData)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(ZIP_CENTRAL_DIRECTORY_SIGNATURE, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0, 8)
    centralHeader.writeUInt16LE(compressionMethod, 10)
    centralHeader.writeUInt16LE(0, 12)
    centralHeader.writeUInt16LE(0, 14)
    centralHeader.writeUInt32LE(crc32, 16)
    centralHeader.writeUInt32LE(compressedSize, 20)
    centralHeader.writeUInt32LE(uncompressedSize, 24)
    centralHeader.writeUInt16LE(nameBuffer.length, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE(0, 38)
    centralHeader.writeUInt32LE(localOffset, 42)

    centralDirectorySections.push(centralHeader, nameBuffer)
    localOffset += localHeader.length + nameBuffer.length + compressedData.length
  }

  const centralDirectory = Buffer.concat(centralDirectorySections)
  const localFiles = Buffer.concat(localFileSections)

  const endOfCentralDirectory = Buffer.alloc(22)
  endOfCentralDirectory.writeUInt32LE(ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE, 0)
  endOfCentralDirectory.writeUInt16LE(0, 4)
  endOfCentralDirectory.writeUInt16LE(0, 6)
  endOfCentralDirectory.writeUInt16LE(entries.length, 8)
  endOfCentralDirectory.writeUInt16LE(entries.length, 10)
  endOfCentralDirectory.writeUInt32LE(centralDirectory.length, 12)
  endOfCentralDirectory.writeUInt32LE(localFiles.length, 16)
  endOfCentralDirectory.writeUInt16LE(0, 20)

  return Buffer.concat([localFiles, centralDirectory, endOfCentralDirectory])
}

function computeCrc32(buffer: Buffer) {
  let crc = 0xffffffff

  for (const value of buffer) {
    crc ^= value
    for (let index = 0; index < 8; index += 1) {
      const lsb = crc & 1
      crc >>>= 1
      if (lsb) {
        crc ^= 0xedb88320
      }
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}
