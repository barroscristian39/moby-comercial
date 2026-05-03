import type { Tenant } from '@/lib/api/tenants.api'
import type { UserRole } from '@/lib/api/users.api'

export const ROLE_LABELS_PT_BR: Record<UserRole, string> = {
  SUPER_ADMIN: 'Administrador da Plataforma',
  TENANT_ADMIN: 'Administrador do Ambiente',
  TECNICO_SST: 'Técnico de SST',
  GESTOR: 'Gestor',
  RH: 'RH',
  CONSULTA: 'Consulta',
}

export const TENANT_STATUS_LABELS_PT_BR: Record<Tenant['status'], string> = {
  ACTIVE: 'Ativo',
  TRIAL: 'Teste',
  SUSPENDED: 'Suspenso',
  CANCELED: 'Cancelado',
}

export function getRoleLabelPtBr(role: UserRole) {
  return ROLE_LABELS_PT_BR[role]
}

export function getTenantStatusLabelPtBr(status: Tenant['status']) {
  return TENANT_STATUS_LABELS_PT_BR[status]
}
