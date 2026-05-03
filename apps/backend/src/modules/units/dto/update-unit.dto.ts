import { z } from 'zod'

export const UpdateUnitSchema = z.object({
  name: z.string().min(2).optional(),
  addressStreet: z.string().optional(),
  addressNumber: z.string().optional(),
  addressComplement: z.string().optional(),
  addressNeighborhood: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().length(2).optional(),
  addressZipCode: z.string().regex(/^\d{8}$/).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
}).strict()

export type UpdateUnitDto = z.infer<typeof UpdateUnitSchema>
