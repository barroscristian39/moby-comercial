import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { AuthRepository } from './auth.repository'
import { AuthEmailService } from './auth-email.service'
import { LocalStrategy } from './strategies/local.strategy'
import { JwtStrategy } from './strategies/jwt.strategy'
import { AuthorizationModule } from '../../common/authorization/authorization.module'
import { AuditModule } from '../audit/audit.module'

type JwtExpiresIn = number | `${number}${'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'y'}`

const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-secret')
const jwtIssuer = process.env.JWT_ISSUER || 'moby.backend'
const jwtAudience = process.env.JWT_AUDIENCE || 'moby.frontend'
const jwtExpiresIn = (process.env.JWT_EXPIRES_IN || '15m') as JwtExpiresIn

if (!jwtSecret) {
  throw new Error('JWT_SECRET must be defined in production')
}

@Module({
  imports: [
    PassportModule,
    AuthorizationModule,
    AuditModule,
    JwtModule.register({
      secret: jwtSecret,
      signOptions: {
        expiresIn: jwtExpiresIn,
        issuer: jwtIssuer,
        audience: jwtAudience,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, AuthEmailService, LocalStrategy, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
