import { z } from 'zod'
import { TenantStatus } from '@moby/shared'

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const UpdateTenantSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  slug: z.string().regex(slugRegex, 'Slug inválido').optional(),
  status: z.nativeEnum(TenantStatus).optional(),
  plan: z.string().min(1).max(80).optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional(),
}).strict()

export type UpdateTenantDto = z.infer<typeof UpdateTenantSchema>

export const UpdateTenantStatusSchema = z.object({
  status: z.nativeEnum(TenantStatus),
  isActive: z.boolean().optional(),
}).strict()

export type UpdateTenantStatusDto = z.infer<typeof UpdateTenantStatusSchema>
