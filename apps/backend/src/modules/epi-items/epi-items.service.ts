import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { EpiItemsRepository } from './epi-items.repository'
import { CreateEpiItemDto } from './dto/create-epi-item.dto'
import { UpdateEpiItemDto } from './dto/update-epi-item.dto'
import { EpiItemEntity } from './entities/epi-item.entity'
import { RequestUser, Role, PaginationDto } from '@moby/shared'

@Injectable()
export class EpiItemsService {
  constructor(private readonly epiItemsRepository: EpiItemsRepository) {}

  async findAll(
    currentUser: RequestUser,
    pagination: PaginationDto,
    search?: string,
    isActive?: boolean,
    requestedCompanyId?: string,
  ) {
    const companyId = this.resolveCompanyId(currentUser, requestedCompanyId)

    const { items, total } = await this.epiItemsRepository.findAll(
      companyId,
      pagination.page,
      pagination.perPage,
      search,
      isActive,
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

  async findOne(id: string, currentUser: RequestUser): Promise<{ data: EpiItemEntity }> {
    const companyId = this.resolveCompanyId(currentUser)
    const item = currentUser.role === Role.ADMIN_SYSTEM
      ? await this.epiItemsRepository.findById(id)
      : await this.epiItemsRepository.findByIdAndCompany(id, companyId)

    if (!item) {
      throw new NotFoundException({
        error: { code: 'EPI_ITEM_NOT_FOUND', message: 'EPI não encontrado no catálogo', statusCode: 404 },
      })
    }

    return { data: this.mapToEntity(item) }
  }

  async create(dto: CreateEpiItemDto, currentUser: RequestUser): Promise<{ data: EpiItemEntity }> {
    if (currentUser.role !== Role.ADMIN_SYSTEM && dto.companyId !== currentUser.companyId) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Só é possível cadastrar EPIs na sua empresa', statusCode: 403 },
      })
    }

    const item = await this.epiItemsRepository.create({
      ...dto,
      caExpiry: dto.caExpiry ? new Date(dto.caExpiry) : undefined,
    })

    return { data: this.mapToEntity(item) }
  }

  async update(id: string, dto: UpdateEpiItemDto, currentUser: RequestUser): Promise<{ data: EpiItemEntity }> {
    const companyId = this.resolveCompanyId(currentUser)
    const item = currentUser.role === Role.ADMIN_SYSTEM
      ? await this.epiItemsRepository.findById(id)
      : await this.epiItemsRepository.findByIdAndCompany(id, companyId)

    if (!item) {
      throw new NotFoundException({
        error: { code: 'EPI_ITEM_NOT_FOUND', message: 'EPI não encontrado no catálogo', statusCode: 404 },
      })
    }

    const updateData: Record<string, any> = { ...dto }
    if (dto.caExpiry) updateData.caExpiry = new Date(dto.caExpiry)

    const updated = await this.epiItemsRepository.update(id, updateData)
    return { data: this.mapToEntity(updated) }
  }

  async remove(id: string, currentUser: RequestUser): Promise<void> {
    const companyId = this.resolveCompanyId(currentUser)
    const item = currentUser.role === Role.ADMIN_SYSTEM
      ? await this.epiItemsRepository.findById(id)
      : await this.epiItemsRepository.findByIdAndCompany(id, companyId)

    if (!item) {
      throw new NotFoundException({
        error: { code: 'EPI_ITEM_NOT_FOUND', message: 'EPI não encontrado no catálogo', statusCode: 404 },
      })
    }

    await this.epiItemsRepository.softDelete(id, currentUser.userId)
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

  private mapToEntity(item: any): EpiItemEntity {
    const today = new Date()
    return {
      id:               item.id,
      companyId:        item.companyId,
      name:             item.name,
      description:      item.description,
      caNumber:         item.caNumber,
      caExpiry:         item.caExpiry,
      manufacturer:     item.manufacturer,
      unitOfMeasure:    item.unitOfMeasure,
      stockQuantity:    item.stockQuantity,
      minStockQuantity: item.minStockQuantity,
      // CA expirado se caExpiry existe e já passou
      isCaExpired:      item.caExpiry ? new Date(item.caExpiry) < today : false,
      // Estoque baixo se quantidade atual <= mínimo configurado
      isLowStock:       item.stockQuantity <= item.minStockQuantity,
      isActive:         item.isActive,
      createdAt:        item.createdAt,
      updatedAt:        item.updatedAt,
    }
  }
}
