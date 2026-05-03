import { z } from 'zod'
import { AccidentSeverity, AccidentStatus, AccidentType } from '@moby/shared'

const DateTimeStringSchema = z
  .string()
  .trim()
  .min(1, 'Data obrigatória')
  .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Data inválida')

const OptionalDateTimeStringSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => {
    if (value === undefined || value === null || value === '') return undefined
    return value
  })
  .refine((value) => value === undefined || !Number.isNaN(new Date(value).getTime()), 'Data inválida')

const OptionalTextSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => {
    if (value === undefined || value === null || value.trim() === '') return undefined
    return value.trim()
  })

export const CreateAccidentSchema = z.object({
  employeeId: z.string().uuid('Selecione um colaborador válido'),
  occurredAt: DateTimeStringSchema,
  reportedAt: OptionalDateTimeStringSchema,
  location: z.string().trim().min(3, 'Local deve ter ao menos 3 caracteres'),
  accidentType: z.nativeEnum(AccidentType),
  severity: z.nativeEnum(AccidentSeverity),
  status: z.nativeEnum(AccidentStatus).optional(),
  description: z.string().trim().min(10, 'Descreva o acidente com mais detalhes'),
  injuredBodyPart: OptionalTextSchema,
  medicalCareProvided: z.coerce.boolean().optional(),
  leaveRequired: z.coerce.boolean().optional(),
  leaveDays: z.coerce.number().int().min(0).optional(),
  catIssued: z.coerce.boolean().optional(),
  catNumber: OptionalTextSchema,
  witnesses: OptionalTextSchema,
  immediateActions: OptionalTextSchema,
  investigatorName: OptionalTextSchema,
  investigationStartedAt: OptionalDateTimeStringSchema,
  immediateCause: OptionalTextSchema,
  rootCause: OptionalTextSchema,
  contributingFactors: OptionalTextSchema,
  correctiveActions: OptionalTextSchema,
  preventiveMeasures: OptionalTextSchema,
  managerNotes: OptionalTextSchema,
  recommendations: OptionalTextSchema,
  conclusionSummary: OptionalTextSchema,
  closureDate: OptionalDateTimeStringSchema,
})

export type CreateAccidentDto = z.infer<typeof CreateAccidentSchema>
