import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { CorsMiddleware } from './common/middleware/cors.middleware'

import { PrismaModule } from './database/prisma.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { AuditInterceptor } from './common/interceptors/audit.interceptor'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { RolesGuard } from './common/guards/roles.guard'
import { PermissionsGuard } from './common/guards/permissions.guard'
import { ScopeGuard } from './common/guards/scope.guard'
import { AuthorizationModule } from './common/authorization/authorization.module'

import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { CompaniesModule } from './modules/companies/companies.module'
import { UnitsModule } from './modules/units/units.module'
import { SectorsModule } from './modules/sectors/sectors.module'
import { JobFunctionsModule } from './modules/job-functions/job-functions.module'
import { FunctionsModule } from './modules/functions/functions.module'
import { EmployeesModule } from './modules/employees/employees.module'
import { AccidentsModule } from './modules/accidents/accidents.module'
import { DocumentsModule } from './modules/documents/documents.module'
import { RisksModule } from './modules/risks/risks.module'
import { GroModule } from './modules/gro/gro.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'
import { EpiItemsModule } from './modules/epi-items/epi-items.module'
import { EpiDeliveriesModule } from './modules/epi-deliveries/epi-deliveries.module'
import { AuditModule } from './modules/audit/audit.module'
import { TenantsModule } from './modules/tenants/tenants.module'
import { SetupModule } from './modules/setup/setup.module'
import { NotificationsModule } from './modules/notifications/notifications.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthorizationModule,
    SetupModule,
    AuthModule,
    AuditModule,
    TenantsModule,
    UsersModule,
    NotificationsModule,
    CompaniesModule,
    UnitsModule,
    SectorsModule,
    JobFunctionsModule,
    FunctionsModule,
    EmployeesModule,
    AccidentsModule,
    DocumentsModule,
    RisksModule,
    GroModule,
    DashboardModule,
    EpiItemsModule,
    EpiDeliveriesModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: ScopeGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorsMiddleware).forRoutes('*path')
  }
}
