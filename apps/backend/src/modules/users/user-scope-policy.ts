export const OPERATIONAL_ROLES = ['TECNICO_SST', 'GESTOR', 'RH', 'CONSULTA'] as const

const OPERATIONAL_ROLE_SET = new Set<string>(OPERATIONAL_ROLES)

export function isOperationalRole(role: string): boolean {
  return OPERATIONAL_ROLE_SET.has(role)
}
