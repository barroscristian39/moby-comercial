import { Role } from '@prisma/client'
import { isOperationalRole } from './user-scope-policy'

type CompanyScopeRef = {
  id: string
  tenantId: string
  deletedAt: Date | null
}

type UnitScopeRef = {
  id: string
  tenantId: string
  companyId: string
  deletedAt: Date | null
}

export type UserScopeAuditRecord = {
  id: string
  email: string
  role: Role | string
  tenantId: string | null
  companyId: string | null
  isActive: boolean
  company: CompanyScopeRef | null
  companyAccess: Array<{
    companyId: string
    company: CompanyScopeRef | null
  }>
  unitAccess: Array<{
    unitId: string
    unit: UnitScopeRef | null
  }>
}

export type UserScopeIssueCode =
  | 'SUPER_ADMIN_SCOPE_CLEARED'
  | 'TENANT_ID_INFERRED'
  | 'TENANT_ID_REQUIRED'
  | 'TENANT_ID_AMBIGUOUS'
  | 'PRIMARY_COMPANY_OUTSIDE_TENANT_REMOVED'
  | 'PRIMARY_COMPANY_REALIGNED'
  | 'COMPANY_SCOPE_OUTSIDE_TENANT_REMOVED'
  | 'UNIT_SCOPE_OUTSIDE_TENANT_REMOVED'
  | 'UNIT_SCOPE_OUTSIDE_ALLOWED_COMPANIES_REMOVED'
  | 'TENANT_ADMIN_EXPLICIT_SCOPE_CLEARED'
  | 'OPERATIONAL_SCOPE_RESTORED_FROM_PRIMARY_COMPANY'
  | 'OPERATIONAL_USER_WITHOUT_COMPANY_SCOPE'
  | 'OPERATIONAL_USER_DEACTIVATED'
  | 'UNKNOWN_ROLE'

export type UserScopeRemediationOptions = {
  deactivateUnscopedOperational?: boolean
}

export type UserScopeState = {
  tenantId: string | null
  companyId: string | null
  companyIds: string[]
  unitIds: string[]
  isActive: boolean
}

export type UserScopeRemediationPlan = {
  issues: UserScopeIssueCode[]
  manualReviewReasons: UserScopeIssueCode[]
  hasChanges: boolean
  canAutoApply: boolean
  shouldInvalidateSessions: boolean
  currentState: UserScopeState
  desiredState: UserScopeState
}

export function auditUserScope(
  user: UserScopeAuditRecord,
  options: UserScopeRemediationOptions = {},
): UserScopeRemediationPlan {
  const issues = new Set<UserScopeIssueCode>()
  const manualReviewReasons = new Set<UserScopeIssueCode>()

  const currentState: UserScopeState = {
    tenantId: user.tenantId ?? null,
    companyId: user.companyId ?? null,
    companyIds: unique(user.companyAccess.map((access) => access.companyId)),
    unitIds: unique(user.unitAccess.map((access) => access.unitId)),
    isActive: user.isActive,
  }

  if (user.role === Role.SUPER_ADMIN) {
    if (
      currentState.tenantId !== null ||
      currentState.companyId !== null ||
      currentState.companyIds.length > 0 ||
      currentState.unitIds.length > 0
    ) {
      issues.add('SUPER_ADMIN_SCOPE_CLEARED')
    }

    const desiredState: UserScopeState = {
      tenantId: null,
      companyId: null,
      companyIds: [],
      unitIds: [],
      isActive: user.isActive,
    }

    return finalizePlan(currentState, desiredState, issues, manualReviewReasons)
  }

  let targetTenantId = user.tenantId ?? null
  if (!targetTenantId) {
    const inferredTenantIds = inferTenantIds(user)
    if (inferredTenantIds.length === 1) {
      targetTenantId = inferredTenantIds[0]
      issues.add('TENANT_ID_INFERRED')
    } else if (inferredTenantIds.length === 0) {
      issues.add('TENANT_ID_REQUIRED')
      manualReviewReasons.add('TENANT_ID_REQUIRED')
    } else {
      issues.add('TENANT_ID_AMBIGUOUS')
      manualReviewReasons.add('TENANT_ID_AMBIGUOUS')
    }
  }

  if (user.role === Role.TENANT_ADMIN) {
    const desiredState: UserScopeState = {
      tenantId: targetTenantId,
      companyId: isValidPrimaryCompany(user.company, targetTenantId) ? user.company!.id : null,
      companyIds: [],
      unitIds: [],
      isActive: user.isActive,
    }

    if (currentState.companyIds.length > 0 || currentState.unitIds.length > 0) {
      issues.add('TENANT_ADMIN_EXPLICIT_SCOPE_CLEARED')
    }

    if (currentState.companyId && desiredState.companyId === null) {
      issues.add('PRIMARY_COMPANY_OUTSIDE_TENANT_REMOVED')
    }

    return finalizePlan(currentState, desiredState, issues, manualReviewReasons)
  }

  if (!isOperationalRole(String(user.role))) {
    issues.add('UNKNOWN_ROLE')
    manualReviewReasons.add('UNKNOWN_ROLE')
    return finalizePlan(currentState, currentState, issues, manualReviewReasons)
  }

  const desiredState: UserScopeState = {
    tenantId: targetTenantId,
    companyId: null,
    companyIds: [],
    unitIds: [],
    isActive: user.isActive,
  }

  if (!targetTenantId) {
    return finalizePlan(currentState, desiredState, issues, manualReviewReasons)
  }

  const validCompanyIds = unique(
    user.companyAccess
      .filter((access) => access.company && access.company.deletedAt === null && access.company.tenantId === targetTenantId)
      .map((access) => access.companyId),
  )

  if (validCompanyIds.length !== currentState.companyIds.length) {
    issues.add('COMPANY_SCOPE_OUTSIDE_TENANT_REMOVED')
  }

  const validPrimaryCompanyId = isValidPrimaryCompany(user.company, targetTenantId) ? user.company!.id : null
  if (currentState.companyId && validPrimaryCompanyId === null) {
    issues.add('PRIMARY_COMPANY_OUTSIDE_TENANT_REMOVED')
  }

  let desiredCompanyIds = validCompanyIds
  if (!desiredCompanyIds.length && validPrimaryCompanyId) {
    desiredCompanyIds = [validPrimaryCompanyId]
    issues.add('OPERATIONAL_SCOPE_RESTORED_FROM_PRIMARY_COMPANY')
  }

  if (desiredCompanyIds.length) {
    desiredState.companyIds = desiredCompanyIds
    desiredState.companyId =
      validPrimaryCompanyId && desiredCompanyIds.includes(validPrimaryCompanyId)
        ? validPrimaryCompanyId
        : desiredCompanyIds[0]

    if ((currentState.companyId ?? null) !== desiredState.companyId) {
      issues.add('PRIMARY_COMPANY_REALIGNED')
    }
  } else {
    issues.add('OPERATIONAL_USER_WITHOUT_COMPANY_SCOPE')

    if (options.deactivateUnscopedOperational) {
      desiredState.isActive = false
      issues.add('OPERATIONAL_USER_DEACTIVATED')
    } else {
      manualReviewReasons.add('OPERATIONAL_USER_WITHOUT_COMPANY_SCOPE')
    }
  }

  const validUnitIds = unique(
    user.unitAccess
      .filter((access) => access.unit && access.unit.deletedAt === null && access.unit.tenantId === targetTenantId)
      .filter((access) => desiredState.companyIds.includes(access.unit!.companyId))
      .map((access) => access.unitId),
  )

  const currentUnitsInsideTenant = user.unitAccess.filter(
    (access) => access.unit && access.unit.deletedAt === null && access.unit.tenantId === targetTenantId,
  )
  if (currentUnitsInsideTenant.length !== currentState.unitIds.length) {
    issues.add('UNIT_SCOPE_OUTSIDE_TENANT_REMOVED')
  }
  if (validUnitIds.length !== currentUnitsInsideTenant.length) {
    issues.add('UNIT_SCOPE_OUTSIDE_ALLOWED_COMPANIES_REMOVED')
  }

  desiredState.unitIds = validUnitIds

  return finalizePlan(currentState, desiredState, issues, manualReviewReasons)
}

function finalizePlan(
  currentState: UserScopeState,
  desiredState: UserScopeState,
  issueSet: Set<UserScopeIssueCode>,
  manualReviewSet: Set<UserScopeIssueCode>,
): UserScopeRemediationPlan {
  const issues = Array.from(issueSet)
  const manualReviewReasons = Array.from(manualReviewSet)
  const hasChanges =
    currentState.tenantId !== desiredState.tenantId ||
    currentState.companyId !== desiredState.companyId ||
    currentState.isActive !== desiredState.isActive ||
    !sameIds(currentState.companyIds, desiredState.companyIds) ||
    !sameIds(currentState.unitIds, desiredState.unitIds)

  return {
    issues,
    manualReviewReasons,
    hasChanges,
    canAutoApply: manualReviewReasons.length === 0 && hasChanges,
    shouldInvalidateSessions: hasChanges,
    currentState,
    desiredState,
  }
}

function inferTenantIds(user: UserScopeAuditRecord): string[] {
  const tenantIds = new Set<string>()

  if (user.company?.tenantId) {
    tenantIds.add(user.company.tenantId)
  }

  for (const access of user.companyAccess) {
    if (access.company?.tenantId) {
      tenantIds.add(access.company.tenantId)
    }
  }

  for (const access of user.unitAccess) {
    if (access.unit?.tenantId) {
      tenantIds.add(access.unit.tenantId)
    }
  }

  return Array.from(tenantIds)
}

function isValidPrimaryCompany(
  company: CompanyScopeRef | null,
  tenantId: string | null,
): company is CompanyScopeRef {
  return Boolean(company && tenantId && company.deletedAt === null && company.tenantId === tenantId)
}

function sameIds(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}

function unique(ids: string[]) {
  return Array.from(new Set(ids)).sort()
}
