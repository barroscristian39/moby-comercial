import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { EpiDeliveriesRepository } from './epi-deliveries.repository'
import { EpiItemsRepository } from '../epi-items/epi-items.repository'
import { CreateEpiDeliveryDto } from './dto/create-epi-delivery.dto'
import { UpdateEpiDeliveryDto } from './dto/update-epi-delivery.dto'
import { EpiDeliveryEntity } from './entities/epi-delivery.entity'
import { RequestUser, Role, PaginationDto } from '@moby/shared'

@Injectable()
export class EpiDeliveriesService {
  constructor(
    private readonly epiDeliveriesRepository: EpiDeliveriesRepository,
    private readonly epiItemsRepository: EpiItemsRepository,
  ) {}

  async findAll(
    currentUser: RequestUser,
    pagination: PaginationDto,
    employeeId?: string,
    epiItemId?: string,
    requestedCompanyId?: string,
  ) {
    const companyId = this.resolveCompanyId(currentUser, requestedCompanyId)

    const { items, total } = await this.epiDeliveriesRepository.findAll(
      companyId,
      pagination.page,
      pagination.perPage,
      employeeId,
      epiItemId,
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

  // Retorna a ficha completa de EPI de um colaborador
  async findEmployeeCard(employeeId: string, currentUser: RequestUser) {
    const companyId = this.resolveCompanyId(currentUser)
    const deliveries = await this.epiDeliveriesRepository.findByEmployee(employeeId, companyId)
    return { data: deliveries.map(this.mapToEntity) }
  }

  async findOne(id: string, currentUser: RequestUser): Promise<{ data: EpiDeliveryEntity }> {
    const companyId = this.resolveCompanyId(currentUser)
    const delivery = currentUser.role === Role.ADMIN_SYSTEM
      ? await this.epiDeliveriesRepository.findById(id)
      : await this.epiDeliveriesRepository.findByIdAndCompany(id, companyId)

    if (!delivery) {
      throw new NotFoundException({
        error: { code: 'EPI_DELIVERY_NOT_FOUND', message: 'Entrega de EPI não encontrada', statusCode: 404 },
      })
    }

    return { data: this.mapToEntity(delivery) }
  }

  async create(dto: CreateEpiDeliveryDto, currentUser: RequestUser): Promise<{ data: EpiDeliveryEntity }> {
    if (currentUser.role !== Role.ADMIN_SYSTEM && dto.companyId !== currentUser.companyId) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Só é possível registrar entregas na sua empresa', statusCode: 403 },
      })
    }

    // Valida que o EPI existe e tem estoque suficiente
    const epiItem = await this.epiItemsRepository.findByIdAndCompany(dto.epiItemId, dto.companyId)
    if (!epiItem) {
      throw new NotFoundException({
        error: { code: 'EPI_ITEM_NOT_FOUND', message: 'EPI não encontrado no catálogo', statusCode: 404 },
      })
    }
    if (epiItem.stockQuantity < dto.quantity) {
      throw new BadRequestException({
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: `Estoque insuficiente. Disponível: ${epiItem.stockQuantity}`,
          statusCode: 400,
        },
      })
    }

    let delivery: any
    try {
      delivery = await this.epiDeliveriesRepository.createWithStockAdjustment({
        companyId:        dto.companyId,
        employeeId:       dto.employeeId,
        epiItemId:        dto.epiItemId,
        quantity:         dto.quantity,
        deliveredAt:      new Date(dto.deliveredAt),
        reason:           dto.reason,
        condition:        dto.condition,
        deliveredBy:      dto.deliveredBy,
        notes:            dto.notes,
        // Captura o CA do EPI no momento da entrega para histórico imutável
        caNumberSnapshot: epiItem.caNumber,
      })
    } catch (err) {
      if (err instanceof Error && err.message === 'INSUFFICIENT_STOCK') {
        throw new BadRequestException({
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: 'Estoque insuficiente para concluir a entrega',
            statusCode: 400,
          },
        })
      }
      throw err
    }

    return { data: this.mapToEntity(delivery) }
  }

  // Apenas anotações e devolução podem ser atualizadas após o registro
  async update(id: string, dto: UpdateEpiDeliveryDto, currentUser: RequestUser): Promise<{ data: EpiDeliveryEntity }> {
    const companyId = this.resolveCompanyId(currentUser)
    const delivery = currentUser.role === Role.ADMIN_SYSTEM
      ? await this.epiDeliveriesRepository.findById(id)
      : await this.epiDeliveriesRepository.findByIdAndCompany(id, companyId)

    if (!delivery) {
      throw new NotFoundException({
        error: { code: 'EPI_DELIVERY_NOT_FOUND', message: 'Entrega de EPI não encontrada', statusCode: 404 },
      })
    }

    const updateData: Record<string, any> = { ...dto }
    if (dto.returnedAt) updateData.returnedAt = new Date(dto.returnedAt)

    const updated = await this.epiDeliveriesRepository.update(id, updateData)
    return { data: this.mapToEntity(updated) }
  }

  async remove(id: string, currentUser: RequestUser): Promise<void> {
    const companyId = this.resolveCompanyId(currentUser)
    const delivery = currentUser.role === Role.ADMIN_SYSTEM
      ? await this.epiDeliveriesRepository.findById(id)
      : await this.epiDeliveriesRepository.findByIdAndCompany(id, companyId)

    if (!delivery) {
      throw new NotFoundException({
        error: { code: 'EPI_DELIVERY_NOT_FOUND', message: 'Entrega de EPI não encontrada', statusCode: 404 },
      })
    }

    await this.epiDeliveriesRepository.softDelete(id, currentUser.userId)
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

  private mapToEntity(delivery: any): EpiDeliveryEntity {
    return {
      id:               delivery.id,
      companyId:        delivery.companyId,
      employeeId:       delivery.employeeId,
      employeeName:     delivery.employee?.name ?? '',
      epiItemId:        delivery.epiItemId,
      epiItemName:      delivery.epiItem?.name ?? '',
      caNumberSnapshot: delivery.caNumberSnapshot,
      quantity:         delivery.quantity,
      deliveredAt:      delivery.deliveredAt,
      reason:           delivery.reason,
      condition:        delivery.condition,
      deliveredBy:      delivery.deliveredBy,
      returnedAt:       delivery.returnedAt,
      notes:            delivery.notes,
      isActive:         delivery.isActive,
      createdAt:        delivery.createdAt,
      updatedAt:        delivery.updatedAt,
    }
  }
}
