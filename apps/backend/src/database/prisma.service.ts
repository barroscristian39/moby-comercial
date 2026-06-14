import { AsyncLocalStorage } from 'async_hooks'
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Prisma, PrismaClient } from '@prisma/client'

type PrismaModelDelegateName =
  | 'tenant'
  | 'company'
  | 'unit'
  | 'sector'
  | 'jobFunction'
  | 'functionUnit'
  | 'employee'
  | 'risk'
  | 'accident'
  | 'accidentEvidence'
  | 'functionTemplate'
  | 'generatedDocument'
  | 'accidentTemplate'
  | 'accidentGeneratedDocument'
  | 'documentAuditLog'
  | 'user'
  | 'notification'
  | 'userCompanyAccess'
  | 'userUnitAccess'
  | 'refreshToken'
  | 'loginVerificationCode'
  | 'passwordResetToken'
  | 'epiItem'
  | 'epiDelivery'
  | 'occupationalExam'
  | 'training'
  | 'auditLog'

type PrismaRequestContext = {
  tenantId: string | null
  role: string
  client?: Prisma.TransactionClient
}

type PrismaTransactionArg = Parameters<PrismaClient['$transaction']>[0]
type PrismaTransactionOptions = Parameters<PrismaClient['$transaction']>[1]

const MODEL_DELEGATES: PrismaModelDelegateName[] = [
  'tenant',
  'company',
  'unit',
  'sector',
  'jobFunction',
  'functionUnit',
  'employee',
  'risk',
  'accident',
  'accidentEvidence',
  'functionTemplate',
  'generatedDocument',
  'accidentTemplate',
  'accidentGeneratedDocument',
  'documentAuditLog',
  'user',
  'notification',
  'userCompanyAccess',
  'userUnitAccess',
  'refreshToken',
  'loginVerificationCode',
  'passwordResetToken',
  'epiItem',
  'epiDelivery',
  'occupationalExam',
  'training',
  'auditLog',
]

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly requestContext = new AsyncLocalStorage<PrismaRequestContext>()
  private readonly rootDelegates = new Map<PrismaModelDelegateName, unknown>()
  private readonly rootTransaction: PrismaClient['$transaction']
  private readonly rlsRoleIdentifier = this.resolveRlsRoleIdentifier()

  constructor() {
    super()

    this.rootTransaction = this.$transaction.bind(this)
    this.bindDelegatesToContext()
    this.bindTransactionToContext()
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }

  async setTenantContext(tenantId: string | null, role: string): Promise<void> {
    const currentContext = this.requestContext.getStore()
    if (!currentContext?.client) {
      throw new Error('setTenantContext requires an active Prisma request context. Use runWithRequestContext() or withTenant() instead.')
    }

    await this.applyTenantContext(currentContext.client, tenantId, role)
  }

  async runWithRequestContext<T>(
    params: { tenantId: string | null; role: string },
    handler: () => Promise<T>,
  ): Promise<T> {
    const currentContext = this.requestContext.getStore()

    if (currentContext?.client) {
      return this.requestContext.run({ ...currentContext, ...params }, handler)
    }

    return this.rootTransaction(async (tx) => {
      await this.applyTenantContext(tx, params.tenantId, params.role)
      return this.requestContext.run({ ...params, client: tx }, handler)
    }) as Promise<T>
  }

  async withTenant<T>(
    tenantId: string | null,
    role: string,
    fn: (tx: PrismaService) => Promise<T>,
  ): Promise<T> {
    return this.runWithRequestContext({ tenantId, role }, () => fn(this))
  }

  softDelete(model: string, id: string, deletedBy: string) {
    return (this as any)[model].update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
        isActive: false,
      },
    })
  }

  private bindDelegatesToContext() {
    for (const delegateName of MODEL_DELEGATES) {
      this.rootDelegates.set(delegateName, (this as any)[delegateName])

      Object.defineProperty(this, delegateName, {
        configurable: true,
        enumerable: true,
        get: () => {
          const client = this.getContextClient() as any
          return client === this.getRawClient()
            ? this.rootDelegates.get(delegateName)
            : client[delegateName]
        },
      })
    }
  }

  private bindTransactionToContext() {
    Object.defineProperty(this, '$transaction', {
      configurable: true,
      writable: true,
      value: this.runContextualTransaction.bind(this),
    })
  }

  private async runContextualTransaction<T>(
    arg: PrismaTransactionArg | ((tx: Prisma.TransactionClient) => Promise<T>),
    options?: PrismaTransactionOptions,
  ): Promise<T> {
    if (typeof arg !== 'function') {
      return this.rootTransaction(arg as any, options as any) as Promise<T>
    }

    const transactionHandler = arg as (tx: Prisma.TransactionClient) => Promise<T>

    const currentContext = this.requestContext.getStore()
    if (currentContext?.client) {
      return transactionHandler(currentContext.client)
    }

    return this.rootTransaction(async (tx) => {
      if (currentContext?.role) {
        await this.applyTenantContext(tx, currentContext.tenantId, currentContext.role)
      }

      const nextContext: PrismaRequestContext = currentContext
        ? { ...currentContext, client: tx }
        : { tenantId: null, role: '', client: tx }

      return this.requestContext.run(nextContext, () => transactionHandler(tx))
    }, options as PrismaTransactionOptions) as Promise<T>
  }

  private getContextClient(): Prisma.TransactionClient | PrismaClient {
    return this.requestContext.getStore()?.client ?? this.getRawClient()
  }

  private getRawClient(): PrismaClient {
    return this as PrismaClient
  }

  private async applyTenantContext(
    client:
      | Pick<PrismaClient, '$executeRaw' | '$executeRawUnsafe'>
      | Pick<Prisma.TransactionClient, '$executeRaw' | '$executeRawUnsafe'>,
    tenantId: string | null,
    role: string,
  ) {
    await client.$executeRawUnsafe(`SET LOCAL ROLE ${this.rlsRoleIdentifier}`)
    await client.$executeRawUnsafe('SET LOCAL row_security = on')
    await client.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId ?? ''}, true)`
    await client.$executeRaw`SELECT set_config('app.current_user_role', ${role}, true)`
  }

  private resolveRlsRoleIdentifier() {
    const role = (process.env.DATABASE_RLS_ROLE ?? 'moby_app').trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(role)) {
      throw new Error(`Invalid DATABASE_RLS_ROLE: ${role}`)
    }

    return `"${role}"`
  }
}
