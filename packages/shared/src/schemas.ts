import { z } from 'zod'

// Schemas de paginação reutilizáveis
export const PaginationSchema = z.object({
  page:    z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
})

export type PaginationDto = z.infer<typeof PaginationSchema>

// Schema base para filtros comuns
export const BaseFilterSchema = z.object({
  tenantId:  z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  unitId:    z.string().uuid().optional(),
  search:    z.string().optional(),
  isActive:  z.coerce.boolean().optional(),
})

export type BaseFilterDto = z.infer<typeof BaseFilterSchema>

// CNPJ brasileiro
export const CnpjSchema = z
  .string()
  .regex(/^\d{14}$/, 'CNPJ deve conter 14 dígitos numéricos')

// CPF brasileiro
export const CpfSchema = z
  .string()
  .regex(/^\d{11}$/, 'CPF deve conter 11 dígitos numéricos')

// UUID obrigatório
export const UuidSchema = z.string().uuid('ID inválido')

export const PasswordPolicySchema = z
  .string()
  .min(8, 'Senha deve ter ao menos 8 caracteres')
  .max(128, 'Senha deve ter no máximo 128 caracteres')
  .regex(/[a-z]/, 'Senha deve conter letra minúscula')
  .regex(/[A-Z]/, 'Senha deve conter letra maiúscula')
  .regex(/[0-9]/, 'Senha deve conter número')
  .regex(/[^A-Za-z0-9]/, 'Senha deve conter caractere especial')
