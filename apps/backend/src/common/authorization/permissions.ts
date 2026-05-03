import { MenuItem, Permission, Role } from '@moby/shared'

export const ALL_PERMISSIONS: Permission[] = Object.values(Permission)

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  [Role.SUPER_ADMIN]: ALL_PERMISSIONS,
  [Role.TENANT_ADMIN]: [
    Permission.USERS_READ,
    Permission.USERS_WRITE,
    Permission.USER_SCOPE_WRITE,
    Permission.COMPANIES_READ,
    Permission.COMPANIES_WRITE,
    Permission.UNITS_READ,
    Permission.UNITS_WRITE,
    Permission.EMPLOYEES_READ,
    Permission.EMPLOYEES_WRITE,
    Permission.RISKS_READ,
    Permission.RISKS_WRITE,
    Permission.ACCIDENTS_READ,
    Permission.ACCIDENTS_WRITE,
    Permission.EPI_READ,
    Permission.EPI_WRITE,
    Permission.EXAMS_READ,
    Permission.EXAMS_WRITE,
    Permission.TRAININGS_READ,
    Permission.TRAININGS_WRITE,
    Permission.DOCUMENTS_READ,
    Permission.DOCUMENTS_WRITE,
    Permission.REPORTS_READ,
    Permission.AUDIT_READ,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_WRITE,
  ],
  [Role.TECNICO_SST]: [
    Permission.COMPANIES_READ,
    Permission.UNITS_READ,
    Permission.EMPLOYEES_READ,
    Permission.RISKS_READ,
    Permission.RISKS_WRITE,
    Permission.ACCIDENTS_READ,
    Permission.ACCIDENTS_WRITE,
    Permission.EPI_READ,
    Permission.EPI_WRITE,
    Permission.EXAMS_READ,
    Permission.TRAININGS_READ,
    Permission.TRAININGS_WRITE,
    Permission.DOCUMENTS_READ,
    Permission.DOCUMENTS_WRITE,
    Permission.REPORTS_READ,
  ],
  [Role.GESTOR]: [
    Permission.COMPANIES_READ,
    Permission.UNITS_READ,
    Permission.EMPLOYEES_READ,
    Permission.ACCIDENTS_READ,
    Permission.RISKS_READ,
    Permission.EPI_READ,
    Permission.EXAMS_READ,
    Permission.TRAININGS_READ,
    Permission.DOCUMENTS_READ,
    Permission.REPORTS_READ,
  ],
  [Role.RH]: [
    Permission.COMPANIES_READ,
    Permission.UNITS_READ,
    Permission.EMPLOYEES_READ,
    Permission.EMPLOYEES_WRITE,
    Permission.ACCIDENTS_READ,
    Permission.ACCIDENTS_WRITE,
    Permission.EXAMS_READ,
    Permission.EXAMS_WRITE,
    Permission.TRAININGS_READ,
    Permission.TRAININGS_WRITE,
    Permission.DOCUMENTS_READ,
    Permission.REPORTS_READ,
  ],
  [Role.CONSULTA]: [
    Permission.COMPANIES_READ,
    Permission.UNITS_READ,
    Permission.EMPLOYEES_READ,
    Permission.ACCIDENTS_READ,
    Permission.RISKS_READ,
    Permission.EPI_READ,
    Permission.EXAMS_READ,
    Permission.TRAININGS_READ,
    Permission.DOCUMENTS_READ,
    Permission.REPORTS_READ,
  ],
}

const PLATFORM_MENUS: MenuItem[] = [
  { key: 'platform-dashboard', label: 'Dashboard da Plataforma', href: '/dashboard/plataforma', permission: Permission.PLATFORM_DASHBOARD_VIEW },
  { key: 'tenants', label: 'Clientes / Ambientes', href: '/dashboard/tenants', permission: Permission.TENANTS_READ },
  { key: 'admins', label: 'Administradores', href: '/dashboard/administradores', permission: Permission.USERS_READ },
  { key: 'subscriptions', label: 'Assinaturas', href: '/dashboard/assinaturas', permission: Permission.TENANTS_READ },
  { key: 'audit', label: 'Auditoria', href: '/dashboard/auditoria', permission: Permission.AUDIT_READ },
  { key: 'settings', label: 'Configurações', href: '/dashboard/configuracoes', permission: Permission.SETTINGS_READ },
]

const TENANT_MENUS: MenuItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { key: 'companies', label: 'Empresas', href: '/dashboard/empresas', permission: Permission.COMPANIES_READ },
  { key: 'units', label: 'Unidades', href: '/dashboard/unidades', permission: Permission.UNITS_READ },
  { key: 'users', label: 'Usuários', href: '/dashboard/usuarios', permission: Permission.USERS_READ },
  { key: 'profiles', label: 'Perfis/Permissões', href: '/dashboard/perfis', permission: Permission.USER_SCOPE_WRITE },
  { key: 'employees', label: 'Colaboradores', href: '/dashboard/colaboradores', permission: Permission.EMPLOYEES_READ },
  { key: 'accidents', label: 'Acidentes', href: '/dashboard/acidentes', permission: Permission.ACCIDENTS_READ },
  { key: 'gro', label: 'GRO', href: '/dashboard/gro', permission: Permission.RISKS_READ },
  { key: 'epi', label: 'EPI', href: '/dashboard/epi', permission: Permission.EPI_READ },
  { key: 'exams', label: 'Exames', href: '/dashboard/exames', permission: Permission.EXAMS_READ },
  { key: 'trainings', label: 'Treinamentos', href: '/dashboard/treinamentos', permission: Permission.TRAININGS_READ },
  { key: 'documents', label: 'Documentos', href: '/dashboard/documentos', permission: Permission.DOCUMENTS_READ },
  { key: 'reports', label: 'Relatórios', href: '/dashboard/relatorios', permission: Permission.REPORTS_READ },
]

export function permissionsForRole(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

export function menusForRole(role: string): MenuItem[] {
  const permissions = new Set(permissionsForRole(role))
  const source = role === Role.SUPER_ADMIN ? PLATFORM_MENUS : TENANT_MENUS

  return source.filter((item) => !item.permission || permissions.has(item.permission))
}
