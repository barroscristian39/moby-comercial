import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { JobFunctionsRepository } from './job-functions.repository'
import { CreateJobFunctionDto } from './dto/create-job-function.dto'
import { UpdateJobFunctionDto } from './dto/update-job-function.dto'
import { JobFunctionEntity } from './entities/job-function.entity'
import { RequestUser, Role, PaginationDto } from '@moby/shared'

@Injectable()
export class JobFunctionsService {
  constructor(private readonly jobFunctionsRepository: JobFunctionsRepository) {}

  async findAll(
    currentUser: RequestUser,
    pagination: PaginationDto,
    unitId?: string,
    sectorId?: string,
    search?: string,
    requestedCompanyId?: string,
  ) {
    const companyId = this.resolveCompanyId(currentUser, requestedCompanyId)

    const { items, total } = await this.jobFunctionsRepository.findAll(
      companyId,
      pagination.page,
      pagination.perPage,
      unitId,
      sectorId,
      search,
    )

    return {
      data: items.map(this.mapToEntity),
      meta: {
        total,
        page: pagination.page,
        perPage: pagination.perPage,
        totalPages: Math.ceil(total / pagination.perPage),
      },
    }
  }

  async findOne(id: string, currentUser: RequestUser): Promise<{ data: JobFunctionEntity }> {
    const companyId = this.resolveCompanyId(currentUser)
    const jobFunction = currentUser.role === Role.ADMIN_SYSTEM
      ? await this.jobFunctionsRepository.findById(id)
      : await this.jobFunctionsRepository.findByIdAndCompany(id, companyId)

    if (!jobFunction) {
      throw new NotFoundException({
        error: { code: 'JOB_FUNCTION_NOT_FOUND', message: 'Função não encontrada', statusCode: 404 },
      })
    }

    return { data: this.mapToEntity(jobFunction) }
  }

  async create(dto: CreateJobFunctionDto, currentUser: RequestUser): Promise<{ data: JobFunctionEntity }> {
    if (currentUser.role !== Role.ADMIN_SYSTEM && dto.companyId !== currentUser.companyId) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Só é possível criar funções na sua empresa', statusCode: 403 },
      })
    }

    const jobFunction = await this.jobFunctionsRepository.create(dto)
    return { data: this.mapToEntity(jobFunction) }
  }

  async update(id: string, dto: UpdateJobFunctionDto, currentUser: RequestUser): Promise<{ data: JobFunctionEntity }> {
    const companyId = this.resolveCompanyId(currentUser)
    const jobFunction = currentUser.role === Role.ADMIN_SYSTEM
      ? await this.jobFunctionsRepository.findById(id)
      : await this.jobFunctionsRepository.findByIdAndCompany(id, companyId)

    if (!jobFunction) {
      throw new NotFoundException({
        error: { code: 'JOB_FUNCTION_NOT_FOUND', message: 'Função não encontrada', statusCode: 404 },
      })
    }

    const updated = await this.jobFunctionsRepository.update(id, dto)
    return { data: this.mapToEntity(updated) }
  }

  async remove(id: string, currentUser: RequestUser): Promise<void> {
    const companyId = this.resolveCompanyId(currentUser)
    const jobFunction = currentUser.role === Role.ADMIN_SYSTEM
      ? await this.jobFunctionsRepository.findById(id)
      : await this.jobFunctionsRepository.findByIdAndCompany(id, companyId)

    if (!jobFunction) {
      throw new NotFoundException({
        error: { code: 'JOB_FUNCTION_NOT_FOUND', message: 'Função não encontrada', statusCode: 404 },
      })
    }

    await this.jobFunctionsRepository.softDelete(id, currentUser.userId)
  }

  private resolveCompanyId(currentUser: RequestUser, requestedCompanyId?: string): string | undefined {
    if (currentUser.role === Role.ADMIN_SYSTEM) return requestedCompanyId
    if (!currentUser.companyId && currentUser.role !== Role.ADMIN_SYSTEM) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Usuário sem empresa associada', statusCode: 403 },
      })
    }
    return currentUser.companyId
  }

  private mapToEntity(jobFunction: any): JobFunctionEntity {
    return {
      id: jobFunction.id,
      companyId: jobFunction.companyId,
      unitId: jobFunction.unitId,
      sectorId: jobFunction.sectorId,
      name: jobFunction.name,
      cbo: jobFunction.cbo,
      description: jobFunction.description,
      isActive: jobFunction.isActive,
      createdAt: jobFunction.createdAt,
      updatedAt: jobFunction.updatedAt,
    }
  }
}
