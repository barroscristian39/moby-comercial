import { AuditAction, Prisma } from '@prisma/client'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/database/prisma.service'
import { AuditService } from '../src/modules/audit/audit.service'
import {
  auditUserScope,
  UserScopeAuditRecord,
  UserScopeIssueCode,
  UserScopeRemediationPlan,
} from '../src/modules/users/user-scope-remediation'

const USER_SCOPE_INCLUDE = {
  company: {
    select: {
      id: true,
      tenantId: true,
      deletedAt: true,
    },
  },
  companyAccess: {
    select: {
      companyId: true,
      company: {
        select: {
          id: true,
          tenantId: true,
          deletedAt: true,
        },
      },
    },
  },
  unitAccess: {
    select: {
      unitId: true,
      unit: {
        select: {
          id: true,
          tenantId: true,
          companyId: true,
          deletedAt: true,
        },
      },
    },
  },
} satisfies Prisma.UserInclude

type ScriptOptions = {
  apply: boolean
  deactivateUnscopedOperational: boolean
}

async function bootstrap() {
  const options = parseArgs(process.argv.slice(2))
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false })

  try {
    const prisma = app.get(PrismaService)
    const auditService = app.get(AuditService)

    const users = (await prisma.user.findMany({
      where: { deletedAt: null },
      include: USER_SCOPE_INCLUDE,
      orderBy: { createdAt: 'asc' },
    })) as UserScopeAuditRecord[]

    let inconsistentUsers = 0
    let autoApplicableUsers = 0
    let appliedUsers = 0
    let manualReviewUsers = 0
    const issueCounts = new Map<UserScopeIssueCode, number>()

    for (const user of users) {
      const plan = auditUserScope(user, {
        deactivateUnscopedOperational: options.deactivateUnscopedOperational,
      })

      if (!plan.issues.length) {
        continue
      }

      inconsistentUsers += 1
      registerIssueCounts(issueCounts, plan)
      if (plan.canAutoApply) {
        autoApplicableUsers += 1
      }
      if (plan.manualReviewReasons.length) {
        manualReviewUsers += 1
      }

      printPlan(user, plan, options.apply ? 'APPLY' : 'DRY-RUN')

      if (options.apply && plan.canAutoApply) {
        await applyPlan(prisma, auditService, user, plan)
        appliedUsers += 1
      }
    }

    console.log('')
    console.log('[User Scope Audit] Resumo')
    console.log(`- Usuarios analisados: ${users.length}`)
    console.log(`- Usuarios inconsistentes: ${inconsistentUsers}`)
    console.log(`- Usuarios com correcao automatica segura: ${autoApplicableUsers}`)
    console.log(`- Usuarios que exigem revisao manual: ${manualReviewUsers}`)
    console.log(`- Usuarios efetivamente corrigidos: ${appliedUsers}`)

    if (issueCounts.size) {
      console.log('- Distribuicao de inconsistencias:')
      for (const [issue, count] of Array.from(issueCounts.entries()).sort(([left], [right]) => left.localeCompare(right))) {
        console.log(`  - ${issue}: ${count}`)
      }
    }

    if (!options.apply) {
      console.log('')
      console.log('[User Scope Audit] Execucao em dry-run. Nenhuma alteracao foi persistida.')
      console.log('[User Scope Audit] Para aplicar correcoes seguras, rode com --apply.')
      console.log(
        '[User Scope Audit] Para desativar automaticamente usuarios operacionais sem empresa valida, adicione --deactivate-unscoped-operational.',
      )
    }
  } finally {
    await app.close()
  }
}

function parseArgs(argv: string[]): ScriptOptions {
  return {
    apply: argv.includes('--apply'),
    deactivateUnscopedOperational: argv.includes('--deactivate-unscoped-operational'),
  }
}

function registerIssueCounts(issueCounts: Map<UserScopeIssueCode, number>, plan: UserScopeRemediationPlan) {
  for (const issue of plan.issues) {
    issueCounts.set(issue, (issueCounts.get(issue) ?? 0) + 1)
  }
}

function printPlan(
  user: Pick<UserScopeAuditRecord, 'id' | 'email' | 'role'>,
  plan: UserScopeRemediationPlan,
  mode: 'DRY-RUN' | 'APPLY',
) {
  console.log(
    `[User Scope Audit][${mode}] ${user.email} (${user.role}) -> ${plan.issues.join(', ')}`,
  )
  console.log(
    `  estado atual: tenant=${plan.currentState.tenantId ?? 'null'} company=${plan.currentState.companyId ?? 'null'} companies=[${plan.currentState.companyIds.join(', ')}] units=[${plan.currentState.unitIds.join(', ')}] active=${plan.currentState.isActive}`,
  )
  console.log(
    `  estado alvo: tenant=${plan.desiredState.tenantId ?? 'null'} company=${plan.desiredState.companyId ?? 'null'} companies=[${plan.desiredState.companyIds.join(', ')}] units=[${plan.desiredState.unitIds.join(', ')}] active=${plan.desiredState.isActive}`,
  )

  if (plan.manualReviewReasons.length) {
    console.log(`  revisao manual: ${plan.manualReviewReasons.join(', ')}`)
  }
}

async function applyPlan(
  prisma: PrismaService,
  auditService: AuditService,
  user: UserScopeAuditRecord,
  plan: UserScopeRemediationPlan,
) {
  await prisma.$transaction(async (tx) => {
    if (!sameIds(plan.currentState.companyIds, plan.desiredState.companyIds)) {
      await tx.userCompanyAccess.deleteMany({ where: { userId: user.id } })

      if (plan.desiredState.companyIds.length) {
        await tx.userCompanyAccess.createMany({
          data: plan.desiredState.companyIds.map((companyId) => ({ userId: user.id, companyId })),
          skipDuplicates: true,
        })
      }
    }

    if (!sameIds(plan.currentState.unitIds, plan.desiredState.unitIds)) {
      await tx.userUnitAccess.deleteMany({ where: { userId: user.id } })

      if (plan.desiredState.unitIds.length) {
        await tx.userUnitAccess.createMany({
          data: plan.desiredState.unitIds.map((unitId) => ({ userId: user.id, unitId })),
          skipDuplicates: true,
        })
      }
    }

    const userData: Prisma.UserUncheckedUpdateInput = {}

    if (plan.currentState.tenantId !== plan.desiredState.tenantId) {
      userData.tenantId = plan.desiredState.tenantId
    }

    if (plan.currentState.companyId !== plan.desiredState.companyId) {
      userData.companyId = plan.desiredState.companyId
    }

    if (plan.currentState.isActive !== plan.desiredState.isActive) {
      userData.isActive = plan.desiredState.isActive
    }

    if (plan.shouldInvalidateSessions) {
      userData.sessionVersion = { increment: 1 }
    }

    if (Object.keys(userData).length) {
      await tx.user.update({
        where: { id: user.id },
        data: userData,
      })
    }

    if (plan.shouldInvalidateSessions) {
      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      })
    }
  })

  await auditService.record({
    tenantId: plan.desiredState.tenantId,
    actorUserId: null,
    action:
      plan.currentState.isActive && !plan.desiredState.isActive
        ? AuditAction.USER_DEACTIVATED
        : AuditAction.USER_PERMISSION_CHANGED,
    entityType: 'users',
    entityId: user.id,
    metadata: {
      source: 'scripts/audit-user-scopes.ts',
      issues: plan.issues,
      manualReviewReasons: plan.manualReviewReasons,
      previous: plan.currentState,
      next: plan.desiredState,
    },
  })
}

function sameIds(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}

bootstrap().catch((error) => {
  console.error('[User Scope Audit] Falha ao auditar/remediar usuários:', error)
  process.exit(1)
})
