const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50
const ZIP64_SENTINEL_16 = 0xffff
const ZIP64_SENTINEL_32 = 0xffffffff
const MIN_EOCD_SIZE = 22
const MAX_EOCD_SEARCH_WINDOW = 65557

const MAX_DOCX_ENTRY_COUNT = 512
const MAX_DOCX_TOTAL_UNCOMPRESSED_BYTES = 40 * 1024 * 1024
const MAX_DOCX_SINGLE_ENTRY_UNCOMPRESSED_BYTES = 20 * 1024 * 1024
const MAX_DOCX_TOTAL_COMPRESSION_RATIO = 120
const MAX_DOCX_ENTRY_COMPRESSION_RATIO = 150
const MIN_RATIO_CHECK_BYTES = 64 * 1024

const REQUIRED_DOCX_ENTRIES = new Set(['[Content_Types].xml', 'word/document.xml'])
const ALLOWED_COMPRESSION_METHODS = new Set([0, 8])

export class UnsafeDocxArchiveError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsafeDocxArchiveError'
  }
}

export type DocxArchiveInspection = {
  entryCount: number
  totalCompressedBytes: number
  totalUncompressedBytes: number
  entries: Array<{
    name: string
    compressedSize: number
    uncompressedSize: number
    compressionMethod: number
    isDirectory: boolean
  }>
}

export function assertSafeDocxArchive(buffer: Buffer): DocxArchiveInspection {
  const eocdOffset = findEndOfCentralDirectory(buffer)
  const commentLength = buffer.readUInt16LE(eocdOffset + 20)
  const eocdLength = MIN_EOCD_SIZE + commentLength

  if (eocdOffset + eocdLength > buffer.length) {
    throw new UnsafeDocxArchiveError('Arquivo DOCX corrompido ou inválido')
  }

  const diskNumber = buffer.readUInt16LE(eocdOffset + 4)
  const centralDirectoryDisk = buffer.readUInt16LE(eocdOffset + 6)
  const entryCountOnDisk = buffer.readUInt16LE(eocdOffset + 8)
  const totalEntryCount = buffer.readUInt16LE(eocdOffset + 10)
  const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12)
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16)

  if (
    diskNumber !== 0 ||
    centralDirectoryDisk !== 0 ||
    entryCountOnDisk !== totalEntryCount
  ) {
    throw new UnsafeDocxArchiveError('Arquivo DOCX usa um formato ZIP não suportado')
  }

  if (
    entryCountOnDisk === ZIP64_SENTINEL_16 ||
    totalEntryCount === ZIP64_SENTINEL_16 ||
    centralDirectorySize === ZIP64_SENTINEL_32 ||
    centralDirectoryOffset === ZIP64_SENTINEL_32
  ) {
    throw new UnsafeDocxArchiveError('Arquivo DOCX grande demais para validação segura')
  }

  if (totalEntryCount <= 0 || totalEntryCount > MAX_DOCX_ENTRY_COUNT) {
    throw new UnsafeDocxArchiveError('Arquivo DOCX com estrutura excessiva ou suspeita')
  }

  if (
    centralDirectoryOffset < 0 ||
    centralDirectorySize <= 0 ||
    centralDirectoryOffset + centralDirectorySize > eocdOffset
  ) {
    throw new UnsafeDocxArchiveError('Arquivo DOCX corrompido ou inválido')
  }

  const entries: DocxArchiveInspection['entries'] = []
  const discoveredRequiredEntries = new Set<string>()
  let pointer = centralDirectoryOffset
  let totalCompressedBytes = 0
  let totalUncompressedBytes = 0

  for (let index = 0; index < totalEntryCount; index += 1) {
    if (pointer + 46 > buffer.length || buffer.readUInt32LE(pointer) !== ZIP_CENTRAL_DIRECTORY_SIGNATURE) {
      throw new UnsafeDocxArchiveError('Arquivo DOCX corrompido ou inválido')
    }

    const compressionMethod = buffer.readUInt16LE(pointer + 10)
    const compressedSize = buffer.readUInt32LE(pointer + 20)
    const uncompressedSize = buffer.readUInt32LE(pointer + 24)
    const filenameLength = buffer.readUInt16LE(pointer + 28)
    const extraLength = buffer.readUInt16LE(pointer + 30)
    const commentLength = buffer.readUInt16LE(pointer + 32)

    if (
      compressedSize === ZIP64_SENTINEL_32 ||
      uncompressedSize === ZIP64_SENTINEL_32
    ) {
      throw new UnsafeDocxArchiveError('Arquivo DOCX grande demais para validação segura')
    }

    const entrySize = 46 + filenameLength + extraLength + commentLength
    if (
      filenameLength <= 0 ||
      pointer + entrySize > centralDirectoryOffset + centralDirectorySize
    ) {
      throw new UnsafeDocxArchiveError('Arquivo DOCX corrompido ou inválido')
    }

    const rawName = buffer.toString('utf8', pointer + 46, pointer + 46 + filenameLength)
    const normalizedName = normalizeArchiveEntryName(rawName)
    const isDirectory = normalizedName.endsWith('/')

    if (!normalizedName) {
      throw new UnsafeDocxArchiveError('Arquivo DOCX com caminho interno inválido')
    }

    if (
      compressedSize < 0 ||
      uncompressedSize < 0 ||
      uncompressedSize > MAX_DOCX_SINGLE_ENTRY_UNCOMPRESSED_BYTES
    ) {
      throw new UnsafeDocxArchiveError('Arquivo DOCX contém partes grandes demais para processamento seguro')
    }

    if (!isDirectory && !ALLOWED_COMPRESSION_METHODS.has(compressionMethod)) {
      throw new UnsafeDocxArchiveError('Arquivo DOCX usa compressão ZIP não suportada')
    }

    if (compressedSize === 0 && uncompressedSize > 0 && !isDirectory) {
      throw new UnsafeDocxArchiveError('Arquivo DOCX com metadados ZIP inconsistentes')
    }

    if (
      !isDirectory &&
      uncompressedSize >= MIN_RATIO_CHECK_BYTES &&
      compressedSize > 0 &&
      uncompressedSize / compressedSize > MAX_DOCX_ENTRY_COMPRESSION_RATIO
    ) {
      throw new UnsafeDocxArchiveError('Arquivo DOCX com compressão suspeita foi bloqueado')
    }

    totalCompressedBytes += compressedSize
    totalUncompressedBytes += uncompressedSize

    if (totalUncompressedBytes > MAX_DOCX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new UnsafeDocxArchiveError('Arquivo DOCX descompacta conteúdo demais para processamento seguro')
    }

    entries.push({
      name: normalizedName,
      compressedSize,
      uncompressedSize,
      compressionMethod,
      isDirectory,
    })

    if (REQUIRED_DOCX_ENTRIES.has(normalizedName)) {
      discoveredRequiredEntries.add(normalizedName)
    }

    pointer += entrySize
  }

  if (pointer !== centralDirectoryOffset + centralDirectorySize) {
    throw new UnsafeDocxArchiveError('Arquivo DOCX corrompido ou inválido')
  }

  if (
    totalCompressedBytes > 0 &&
    totalUncompressedBytes >= MIN_RATIO_CHECK_BYTES &&
    totalUncompressedBytes / totalCompressedBytes > MAX_DOCX_TOTAL_COMPRESSION_RATIO
  ) {
    throw new UnsafeDocxArchiveError('Arquivo DOCX com compressão suspeita foi bloqueado')
  }

  for (const requiredEntry of REQUIRED_DOCX_ENTRIES) {
    if (!discoveredRequiredEntries.has(requiredEntry)) {
      throw new UnsafeDocxArchiveError('Arquivo DOCX sem estrutura esperada')
    }
  }

  return {
    entryCount: entries.length,
    totalCompressedBytes,
    totalUncompressedBytes,
    entries,
  }
}

function findEndOfCentralDirectory(buffer: Buffer) {
  const searchStart = Math.max(0, buffer.length - MAX_EOCD_SEARCH_WINDOW)

  for (let offset = buffer.length - MIN_EOCD_SIZE; offset >= searchStart; offset -= 1) {
    if (offset + MIN_EOCD_SIZE > buffer.length) continue
    if (buffer.readUInt32LE(offset) === ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      return offset
    }
  }

  throw new UnsafeDocxArchiveError('Arquivo DOCX corrompido ou inválido')
}

function normalizeArchiveEntryName(entryName: string) {
  const normalizedName = entryName.replace(/\\/g, '/')

  if (
    !normalizedName ||
    normalizedName.startsWith('/') ||
    /^[a-zA-Z]:/.test(normalizedName) ||
    normalizedName.split('/').some((segment) => segment === '..')
  ) {
    throw new UnsafeDocxArchiveError('Arquivo DOCX com caminho interno inválido')
  }

  return normalizedName
}
