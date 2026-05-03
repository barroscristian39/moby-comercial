import { z } from 'zod'

export const UpdateCompanySchema = z.object({
  name: z.string().min(2).optional(),
  tradeName: z.string().optional(),
  cnae: z.string().optional(),
  addressStreet: z.string().optional(),
  addressNumber: z.string().optional(),
  addressComplement: z.string().optional(),
  addressNeighborhood: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().length(2).optional(),
  addressZipCode: z.string().regex(/^\d{8}$/).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  responsibleName: z.string().optional(),
  responsibleCpf: z.string().optional(),
  isActive: z.boolean().optional(),
}).strict()

export type UpdateCompanyDto = z.infer<typeof UpdateCompanySchema>
