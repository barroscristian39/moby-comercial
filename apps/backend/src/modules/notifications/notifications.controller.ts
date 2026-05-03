import { Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common'
import { RequestUser } from '@moby/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ZodPipe } from '../../common/pipes/zod.pipe'
import { ListNotificationsDto, ListNotificationsSchema } from './dto/list-notifications.dto'
import { NotificationsService } from './notifications.service'

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: RequestUser) {
    return this.notificationsService.getSummary(user)
  }

  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(ListNotificationsSchema)) query: ListNotificationsDto,
  ) {
    return this.notificationsService.findAll(user, query)
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: RequestUser) {
    return this.notificationsService.markAllAsRead(user)
  }

  @Patch(':id/read')
  markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.notificationsService.markAsRead(id, user)
  }
}
