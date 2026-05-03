import { Permission, Role } from './enums'

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    perPage: number
    totalPages: number
  }
}

export interface SingleResponse<T> {
  data: T
}

export interface ApiError {
  error: {
    code: string
    message: string
    statusCode: number
  }
}

export interface MenuItem {
  key: string
  label: string
  href: string
  permission?: Permission
}

export interface RequestUser {
  userId: string
  tenantId: string | null
  companyId: string | null
  role: Role | string
  companyIds: string[]
  unitIds: string[]
  permissions: Permission[]
  email?: string
  name?: string
}

export interface AccessContext {
  user_id: string
  tenant_id: string | null
  role: Role | string
  companies_allowed: string[]
  units_allowed: string[]
  available_permissions: Permission[]
  menus: MenuItem[]
}

export interface AlertSummary {
  episExpired: number
  episExpiring: number
  examsExpired: number
  examsExpiring: number
  trainingsExpired: number
  trainingsExpiring: number
  criticalRisks: number
  overdueActions: number
}
