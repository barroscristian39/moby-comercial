import { ConflictException, Injectable } from '@nestjs/common'
import { Role } from '@moby/shared'
import { PasswordService } from '../../common/security/password.service'
import { PrismaService } from '../../database/prisma.service'
import { BootstrapSetupDto } from './dto/bootstrap-setup.dto'
import { BootstrapAdminEntity } from './entities/bootstrap-admin.entity'
import { BootstrapStatusEntity } from './entities/bootstrap-status.entity'
import { SetupRepository } from './setup.repository'

@Injectable()
export class SetupService {
  constructor(
    private readonly setupRepository: SetupRepository,
    private readonly passwordService: PasswordService,
    private readonly prismaService: PrismaService,
  ) {}

  async getStatus(): Promise<{ data: BootstrapStatusEntity }> {
    const totalUsers = await this.prismaService.withTenant(null, 'BOOTSTRAP_SERVICE', () =>
      this.setupRepository.countUsers(),
    )

    return {
      data: {
        requiresBootstrap: totalUsers === 0,
      },
    }
  }

  async bootstrap(dto: BootstrapSetupDto): Promise<{ data: BootstrapAdminEntity }> {
    try {
      const passwordHash = await this.passwordService.hash(dto.password)
      const admin = await this.prismaService.withTenant(null, 'BOOTSTRAP_SERVICE', () =>
        this.setupRepository.createBootstrapSuperAdmin({
          name: dto.name.trim(),
          email: this.passwordService.normalizeEmail(dto.email),
          passwordHash,
        }),
      )

      if (!admin) {
        throw this.bootstrapAlreadyCompletedException()
      }

      return {
        data: this.mapAdmin(admin),
      }
    } catch (error: any) {
      if (error instanceof ConflictException) throw error
      if (error?.code === 'P2034') {
        throw this.bootstrapAlreadyCompletedException()
      }
      throw error
    }
  }

  private bootstrapAlreadyCompletedException() {
    return new ConflictException({
      error: {
        code: 'BOOTSTRAP_ALREADY_COMPLETED',
        message: 'O primeiro acesso já foi configurado para este ambiente.',
        statusCode: 409,
      },
    })
  }

  private mapAdmin(admin: {
    id: string
    name: string
    email: string
    role: string
  }): BootstrapAdminEntity {
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role as Role,
    }
  }
}
