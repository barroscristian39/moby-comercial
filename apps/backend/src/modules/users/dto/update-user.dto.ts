import { z } from 'zod'
import { Role } from '@moby/shared'

export const UpdateUserSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  role: z.nativeEnum(Role).optional(),
  companyIds: z.array(z.string().uuid()).optional(),
  unitIds: z.array(z.string().uuid()).optional(),
  isActive: z.boolean().optional(),
}).strict()

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>
