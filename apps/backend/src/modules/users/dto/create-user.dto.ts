import { z } from 'zod'
import { PasswordPolicySchema, Role } from '@moby/shared'

export const CreateUserSchema = z.object({
  tenantId: z.string().uuid('Identificador do ambiente inválido').optional().nullable(),
  email: z.string().email('E-mail inválido').transform((value) => value.trim().toLowerCase()),
  password: PasswordPolicySchema,
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(120),
  role: z.nativeEnum(Role).default(Role.CONSULTA),
  isActive: z.boolean().default(true),
  companyIds: z.array(z.string().uuid()).default([]),
  unitIds: z.array(z.string().uuid()).default([]),
}).strict()

export type CreateUserDto = z.infer<typeof CreateUserSchema>
