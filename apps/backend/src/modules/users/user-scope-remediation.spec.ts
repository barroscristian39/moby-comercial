import { Role } from '@prisma/client'
import { auditUserScope, UserScopeAuditRecord } from './user-scope-remediation'

function makeUser(overrides: Partial<UserScopeAuditRecord> = {}): UserScopeAuditRecord {
  return {
    id: 'user-1',
    email: 'user@example.com',
    role: Role.CONSULTA,
    tenantId: 'tenant-1',
    companyId: null,
    isActive: true,
    company: null,
    companyAccess: [],
    unitAccess: [],
    ...overrides,
  }
}

describe('auditUserScope', () => {
  it('restaura escopo explícito operacional a partir da empresa primária válida', () => {
    const plan = auditUserScope(
      makeUser({
        role: Role.CONSULTA,
        companyId: 'company-1',
        company: { id: 'company-1', tenantId: 'tenant-1', deletedAt: null },
        unitAccess: [
          {
            unitId: 'unit-1',
            unit: { id: 'unit-1', tenantId: 'tenant-1', companyId: 'company-1', deletedAt: null },
          },
        ],
      }),
    )

    expect(plan.issues).toContain('OPERATIONAL_SCOPE_RESTORED_FROM_PRIMARY_COMPANY')
    expect(plan.desiredState.companyIds).toEqual(['company-1'])
    expect(plan.desiredState.companyId).toBe('company-1')
    expect(plan.desiredState.unitIds).toEqual(['unit-1'])
    expect(plan.canAutoApply).toBe(true)
  })

  it('remove escopos fora do tenant e realinha a empresa primária operacional', () => {
    const plan = auditUserScope(
      makeUser({
        role: Role.GESTOR,
        companyId: 'company-2',
        company: { id: 'company-2', tenantId: 'tenant-2', deletedAt: null },
        companyAccess: [
          {
            companyId: 'company-1',
            company: { id: 'company-1', tenantId: 'tenant-1', deletedAt: null },
          },
          {
            companyId: 'company-2',
            company: { id: 'company-2', tenantId: 'tenant-2', deletedAt: null },
          },
        ],
        unitAccess: [
          {
            unitId: 'unit-1',
            unit: { id: 'unit-1', tenantId: 'tenant-1', companyId: 'company-1', deletedAt: null },
          },
          {
            unitId: 'unit-2',
            unit: { id: 'unit-2', tenantId: 'tenant-2', companyId: 'company-2', deletedAt: null },
          },
        ],
      }),
    )

    expect(plan.issues).toEqual(
      expect.arrayContaining([
        'COMPANY_SCOPE_OUTSIDE_TENANT_REMOVED',
        'PRIMARY_COMPANY_OUTSIDE_TENANT_REMOVED',
        'PRIMARY_COMPANY_REALIGNED',
        'UNIT_SCOPE_OUTSIDE_TENANT_REMOVED',
      ]),
    )
    expect(plan.desiredState.companyIds).toEqual(['company-1'])
    expect(plan.desiredState.companyId).toBe('company-1')
    expect(plan.desiredState.unitIds).toEqual(['unit-1'])
    expect(plan.canAutoApply).toBe(true)
  })

  it('manda para revisão manual quando usuário operacional fica sem empresa explícita', () => {
    const plan = auditUserScope(
      makeUser({
        role: Role.RH,
        unitAccess: [
          {
            unitId: 'unit-1',
            unit: { id: 'unit-1', tenantId: 'tenant-1', companyId: 'company-1', deletedAt: null },
          },
        ],
      }),
    )

    expect(plan.issues).toContain('OPERATIONAL_USER_WITHOUT_COMPANY_SCOPE')
    expect(plan.manualReviewReasons).toContain('OPERATIONAL_USER_WITHOUT_COMPANY_SCOPE')
    expect(plan.canAutoApply).toBe(false)
  })

  it('pode desativar com segurança usuário operacional sem empresa quando a flag é usada', () => {
    const plan = auditUserScope(
      makeUser({
        role: Role.TECNICO_SST,
      }),
      { deactivateUnscopedOperational: true },
    )

    expect(plan.issues).toEqual(
      expect.arrayContaining(['OPERATIONAL_USER_WITHOUT_COMPANY_SCOPE', 'OPERATIONAL_USER_DEACTIVATED']),
    )
    expect(plan.desiredState.isActive).toBe(false)
    expect(plan.canAutoApply).toBe(true)
  })

  it('infere tenant e limpa escopo explícito desnecessário do tenant admin', () => {
    const plan = auditUserScope(
      makeUser({
        role: Role.TENANT_ADMIN,
        tenantId: null,
        companyId: 'company-1',
        company: { id: 'company-1', tenantId: 'tenant-1', deletedAt: null },
        companyAccess: [
          {
            companyId: 'company-1',
            company: { id: 'company-1', tenantId: 'tenant-1', deletedAt: null },
          },
        ],
        unitAccess: [
          {
            unitId: 'unit-1',
            unit: { id: 'unit-1', tenantId: 'tenant-1', companyId: 'company-1', deletedAt: null },
          },
        ],
      }),
    )

    expect(plan.issues).toEqual(expect.arrayContaining(['TENANT_ID_INFERRED', 'TENANT_ADMIN_EXPLICIT_SCOPE_CLEARED']))
    expect(plan.desiredState.tenantId).toBe('tenant-1')
    expect(plan.desiredState.companyIds).toEqual([])
    expect(plan.desiredState.unitIds).toEqual([])
    expect(plan.desiredState.companyId).toBe('company-1')
    expect(plan.canAutoApply).toBe(true)
  })

  it('zera escopo residual de super admin', () => {
    const plan = auditUserScope(
      makeUser({
        role: Role.SUPER_ADMIN,
        tenantId: 'tenant-1',
        companyId: 'company-1',
        company: { id: 'company-1', tenantId: 'tenant-1', deletedAt: null },
        companyAccess: [
          {
            companyId: 'company-1',
            company: { id: 'company-1', tenantId: 'tenant-1', deletedAt: null },
          },
        ],
        unitAccess: [
          {
            unitId: 'unit-1',
            unit: { id: 'unit-1', tenantId: 'tenant-1', companyId: 'company-1', deletedAt: null },
          },
        ],
      }),
    )

    expect(plan.issues).toContain('SUPER_ADMIN_SCOPE_CLEARED')
    expect(plan.desiredState).toEqual({
      tenantId: null,
      companyId: null,
      companyIds: [],
      unitIds: [],
      isActive: true,
    })
    expect(plan.canAutoApply).toBe(true)
  })
})
