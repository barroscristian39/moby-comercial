import { NotificationFilter, PaginationSchema } from '@moby/shared'
import { z } from 'zod'

export const ListNotificationsSchema = PaginationSchema.extend({
  filter: z.nativeEnum(NotificationFilter).default(NotificationFilter.ALL),
}).strict()

export type ListNotificationsDto = z.infer<typeof ListNotificationsSchema>
