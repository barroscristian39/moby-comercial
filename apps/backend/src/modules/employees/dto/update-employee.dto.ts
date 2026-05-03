import { z } from 'zod'

export const UpdateEmployeeSchema = z.object({
  unitId: z.string().uuid().optional(),
  sectorId: z.string().uuid().optional(),
  jobFunctionId: z.string().uuid().optional(),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  birthDate: z.string().date().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  registration: z.string().optional(),
  admissionDate: z.string().date().optional(),
  dismissalDate: z.string().date().optional(),
  isActive: z.boolean().optional(),
}).strict()

export type UpdateEmployeeDto = z.infer<typeof UpdateEmployeeSchema>
