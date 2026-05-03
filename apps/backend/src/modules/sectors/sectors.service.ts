import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { SectorsRepository } from './sectors.repository'
import { CreateSectorDto } from './dto/create-sector.dto'
import { UpdateSectorDto } from './dto/update-sector.dto'
import { SectorEntity } from './entities/sector.entity'
import { RequestUser, Role, PaginationDto } from '@moby/shared'

@Injectable()
export class SectorsService {
  constructor(private readonly sectorsRepository: SectorsRepository) {}

  async findAll(currentUser: RequestUser, pagination: PaginationDto, unitId?: string, search?: string, requestedCompanyId?: string) {
    const companyId = this.resolveCompanyId(currentUser, requestedCompanyId)

    const { items, total } = await this.sectorsRepository.findAll(
      companyId,
      pagination.page,
      pagination.perPage,
      unitId,
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

  async findOne(id: string, currentUser: RequestUser): Promise<{ data: SectorEntity }> {
    const companyId = this.resolveCompanyId(currentUser)
    const sector = currentUser.role === Role.ADMIN_SYSTEM
      ? await this.sectorsRepository.findById(id)
      : await this.sectorsRepository.findByIdAndCompany(id, companyId)

    if (!sector) {
      throw new NotFoundException({
        error: { code: 'SECTOR_NOT_FOUND', message: 'Setor não encontrado', statusCode: 404 },
      })
    }

    return { data: this.mapToEntity(sector) }
  }

  async create(dto: CreateSectorDto, currentUser: RequestUser): Promise<{ data: SectorEntity }> {
    if (currentUser.role !== Role.ADMIN_SYSTEM && dto.companyId !== currentUser.companyId) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Só é possível criar setores na sua empresa', statusCode: 403 },
      })
    }

    const sector = await this.sectorsRepository.create(dto)
    return { data: this.mapToEntity(sector) }
  }

  async update(id: string, dto: UpdateSectorDto, currentUser: RequestUser): Promise<{ data: SectorEntity }> {
    const companyId = this.resolveCompanyId(currentUser)
    const sector = currentUser.role === Role.ADMIN_SYSTEM
      ? await this.sectorsRepository.findById(id)
      : await this.sectorsRepository.findByIdAndCompany(id, companyId)

    if (!sector) {
      throw new NotFoundException({
        error: { code: 'SECTOR_NOT_FOUND', message: 'Setor não encontrado', statusCode: 404 },
      })
    }

    const updated = await this.sectorsRepository.update(id, dto)
    return { data: this.mapToEntity(updated) }
  }

  async remove(id: string, currentUser: RequestUser): Promise<void> {
    const companyId = this.resolveCompanyId(currentUser)
    const sector = currentUser.role === Role.ADMIN_SYSTEM
      ? await this.sectorsRepository.findById(id)
      : await this.sectorsRepository.findByIdAndCompany(id, companyId)

    if (!sector) {
      throw new NotFoundException({
        error: { code: 'SECTOR_NOT_FOUND', message: 'Setor não encontrado', statusCode: 404 },
      })
    }

    await this.sectorsRepository.softDelete(id, currentUser.userId)
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

  private mapToEntity(sector: any): SectorEntity {
    return {
      id: sector.id,
      companyId: sector.companyId,
      unitId: sector.unitId,
      name: sector.name,
      description: sector.description,
      isActive: sector.isActive,
      createdAt: sector.createdAt,
      updatedAt: sector.updatedAt,
    }
  }
}
