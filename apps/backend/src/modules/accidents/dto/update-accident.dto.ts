import { z } from 'zod'
import { AccidentSeverity, AccidentStatus, AccidentType } from '@moby/shared'

const OptionalDateTimeStringSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined
    if (value === null) return null

    const trimmedValue = value.trim()
    return trimmedValue === '' ? null : trimmedValue
  })
  .refine(
    (value) => value === undefined || value === null || !Number.isNaN(new Date(value).getTime()),
    'Data inválida',
  )

const OptionalTextSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined
    if (value === null) return null

    const trimmedValue = value.trim()
    return trimmedValue === '' ? null : trimmedValue
  })

export const UpdateAccidentSchema = z.object({
  employeeId: z.string().uuid('Selecione um colaborador válido').optional(),
  occurredAt: z
    .string()
    .trim()
    .min(1, 'Data obrigatória')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Data inválida')
    .optional(),
  reportedAt: z
    .string()
    .trim()
    .min(1, 'Data obrigatória')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Data inválida')
    .optional(),
  location: z.string().trim().min(3, 'Local deve ter ao menos 3 caracteres').optional(),
  accidentType: z.nativeEnum(AccidentType).optional(),
  severity: z.nativeEnum(AccidentSeverity).optional(),
  status: z.nativeEnum(AccidentStatus).optional(),
  description: z.string().trim().min(10, 'Descreva o acidente com mais detalhes').optional(),
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
  isActive: z.coerce.boolean().optional(),
})

export type UpdateAccidentDto = z.infer<typeof UpdateAccidentSchema>
