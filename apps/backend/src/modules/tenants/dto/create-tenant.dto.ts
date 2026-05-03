import { z } from 'zod'
import { PasswordPolicySchema, TenantStatus } from '@moby/shared'

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const CreateTenantSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().regex(slugRegex, 'Slug inválido').optional(),
  status: z.nativeEnum(TenantStatus).default(TenantStatus.TRIAL),
  plan: z.string().min(1).max(80).default('manual'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isActive: z.boolean().default(false),
  admin: z.object({
    name: z.string().min(2).max(120),
    email: z.string().email().transform((value) => value.trim().toLowerCase()),
    password: PasswordPolicySchema,
  }),
}).strict()

export type CreateTenantDto = z.infer<typeof CreateTenantSchema>
