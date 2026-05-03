import { Module } from '@nestjs/common'
import { PrismaModule } from '../../database/prisma.module'
import { AuthorizationRepository } from './authorization.repository'
import { AuthorizationService } from './authorization.service'
import { PasswordService } from '../security/password.service'

@Module({
  imports: [PrismaModule],
  providers: [AuthorizationRepository, AuthorizationService, PasswordService],
  exports: [AuthorizationService, PasswordService],
})
export class AuthorizationModule {}
