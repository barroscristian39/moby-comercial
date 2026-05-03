import { z } from 'zod'
import { CnpjSchema } from '@moby/shared'

export const CreateUnitSchema = z.object({
  companyId: z.string().uuid('companyId inválido'),
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  cnpj: CnpjSchema.optional(),
  addressStreet: z.string().optional(),
  addressNumber: z.string().optional(),
  addressComplement: z.string().optional(),
  addressNeighborhood: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().length(2, 'UF deve ter 2 caracteres').optional(),
  addressZipCode: z.string().regex(/^\d{8}$/, 'CEP deve conter 8 dígitos').optional(),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional(),
})

export type CreateUnitDto = z.infer<typeof CreateUnitSchema>
