import { AccessContext } from '@moby/shared'

export interface AuthResponseEntity {
  accessToken: string
  user: {
    id: string
    name: string
    email: string
    role: string
    tenantId: string | null
    companyId: string | null
    companyIds: string[]
    unitIds: string[]
  }
  context: AccessContext
}
