import { z } from 'zod'
import { CpfSchema } from '@moby/shared'

export const CreateEmployeeSchema = z.object({
  companyId: z.string().uuid('companyId inválido'),
  unitId: z.string().uuid('unitId inválido'),
  sectorId: z.string().uuid('sectorId inválido').optional(),
  jobFunctionId: z.string().uuid('jobFunctionId inválido'),
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  cpf: CpfSchema,
  email: z.string().email('E-mail inválido').optional(),
  phone: z.string().optional(),
  birthDate: z.string().date('Data de nascimento inválida').optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  registration: z.string().optional(),
  admissionDate: z.string().date('Data de admissão inválida'),
})

export type CreateEmployeeDto = z.infer<typeof CreateEmployeeSchema>
