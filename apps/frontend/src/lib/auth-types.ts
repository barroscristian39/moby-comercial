export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  tenantId: string | null
  companyId: string | null
  companyIds: string[]
  unitIds: string[]
}

export interface AuthAccessContext {
  user_id: string
  tenant_id: string | null
  role: string
  companies_allowed: string[]
  units_allowed: string[]
  available_permissions: string[]
  menus: Array<{
    key: string
    label: string
    href: string
    permission?: string
  }>
}

export interface AuthSessionPayload {
  accessToken: string
  user: AuthUser
  context: AuthAccessContext
}

export interface PendingLoginVerification {
  challengeId: string
  email: string
  deliveryHint: string
  message: string
}

export type AuthLoginResult =
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'verification_required'; verification: PendingLoginVerification }
