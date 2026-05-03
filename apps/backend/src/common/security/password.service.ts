import { Injectable } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto'

const SCRYPT_PARAMS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

function scryptAsync(password: string, salt: Buffer, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, SCRYPT_PARAMS, (error, derivedKey) => {
      if (error) reject(error)
      else resolve(derivedKey)
    })
  })
}

@Injectable()
export class PasswordService {
  normalizeEmail(email: string): string {
    return email.trim().toLowerCase()
  }

  async hash(password: string): Promise<string> {
    const salt = randomBytes(16)
    const key = await scryptAsync(password, salt, 64)

    return `$scrypt$v=1$N=${SCRYPT_PARAMS.N},r=${SCRYPT_PARAMS.r},p=${SCRYPT_PARAMS.p}$${salt.toString(
      'base64',
    )}$${key.toString('base64')}`
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    if (storedHash.startsWith('$scrypt$')) {
      return this.verifyScrypt(password, storedHash)
    }

    // Legacy compatibility for hashes created before the access foundation.
    return bcrypt.compare(password, storedHash)
  }

  private async verifyScrypt(password: string, storedHash: string): Promise<boolean> {
    const parts = storedHash.split('$')
    if (parts.length !== 6 || parts[1] !== 'scrypt') return false

    const salt = Buffer.from(parts[4], 'base64')
    const expected = Buffer.from(parts[5], 'base64')
    const derived = await scryptAsync(password, salt, expected.length)

    if (derived.length !== expected.length) return false
    return timingSafeEqual(derived, expected)
  }
}
