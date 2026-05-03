import { PrismaClient, Role } from '@prisma/client'
import { randomBytes, scrypt as scryptCallback } from 'crypto'

const prisma = new PrismaClient()
const SCRYPT_PARAMS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

function scryptAsync(password: string, salt: Buffer, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, SCRYPT_PARAMS, (error, derivedKey) => {
      if (error) reject(error)
      else resolve(derivedKey)
    })
  })
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scryptAsync(password, salt, 64)

  return `$scrypt$v=1$N=${SCRYPT_PARAMS.N},r=${SCRYPT_PARAMS.r},p=${SCRYPT_PARAMS.p}$${salt.toString('base64')}$${key.toString('base64')}`
}

function readBootstrapAdminConfig() {
  const email = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD?.trim()
  const name = process.env.BOOTSTRAP_SUPER_ADMIN_NAME?.trim() || 'Administrador da Plataforma'

  if (!email && !password) return null

  if (!email || !password) {
    throw new Error('BOOTSTRAP_SUPER_ADMIN_EMAIL e BOOTSTRAP_SUPER_ADMIN_PASSWORD devem ser informados juntos.')
  }

  return { email, password, name }
}

async function main() {
  console.log('Running bootstrap seed...')

  const bootstrapAdmin = readBootstrapAdminConfig()

  if (!bootstrapAdmin) {
    console.log('No bootstrap admin configured. Skipping data creation and keeping the database empty.')
    return
  }

  const passwordHash = await hashPassword(bootstrapAdmin.password)
  const admin = await prisma.user.upsert({
    where: { email: bootstrapAdmin.email },
    update: {
      passwordHash,
      role: Role.SUPER_ADMIN,
      tenantId: null,
      companyId: null,
      isActive: true,
      deletedAt: null,
      deletedBy: null,
      name: bootstrapAdmin.name,
    },
    create: {
      email: bootstrapAdmin.email,
      passwordHash,
      name: bootstrapAdmin.name,
      role: Role.SUPER_ADMIN,
      tenantId: null,
      companyId: null,
      isActive: true,
    },
  })

  console.log('Bootstrap super admin ready:', admin.email)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
