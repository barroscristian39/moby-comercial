import { z } from 'zod'
import {
  AccidentActivityType,
  AccidentBodyPart,
  AccidentCommuteSubtype,
  AccidentInjuredSide,
  AccidentSeverity,
  AccidentStatus,
  AccidentType,
  AccidentTypicalSubtype,
  AccidentWorkJourneyType,
} from '@moby/shared'

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

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

const OptionalTimeStringSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined
    if (value === null) return null

    const trimmedValue = value.trim()
    return trimmedValue === '' ? null : trimmedValue
  })
  .refine((value) => value === undefined || value === null || TIME_PATTERN.test(value), 'Horário inválido')

export const UpdateAccidentSchema = z
  .object({
    employeeId: z.string().uuid('Selecione um colaborador válido').optional(),
    regional: z.string().trim().min(2, 'Informe a regional').optional(),
    unitManagerName: OptionalTextSchema,
    salary: OptionalTextSchema,
    employeePhone: OptionalTextSchema,
    workSchedule: OptionalTextSchema,
    totalTimeInRole: OptionalTextSchema,
    activityType: z.nativeEnum(AccidentActivityType).optional().nullable(),
    previousAccident: z.coerce.boolean().optional(),
    previousAccidentDescription: OptionalTextSchema,
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
    occurrenceAddress: OptionalTextSchema,
    accidentType: z.nativeEnum(AccidentType).optional(),
    typicalSubtypes: z.array(z.nativeEnum(AccidentTypicalSubtype)).optional(),
    typicalSubtypeOther: OptionalTextSchema,
    commuteSubtypes: z.array(z.nativeEnum(AccidentCommuteSubtype)).optional(),
    commuteSubtypeOther: OptionalTextSchema,
    workJourneyType: z.nativeEnum(AccidentWorkJourneyType).optional().nullable(),
    scheduleChangeStart: OptionalTimeStringSchema,
    scheduleChangeEnd: OptionalTimeStringSchema,
    severity: z.nativeEnum(AccidentSeverity).optional(),
    status: z.nativeEnum(AccidentStatus).optional(),
    description: z.string().trim().min(10, 'Descreva o acidente com mais detalhes').optional(),
    injuredSide: z.nativeEnum(AccidentInjuredSide).optional().nullable(),
    injuredBodyParts: z.array(z.nativeEnum(AccidentBodyPart)).optional(),
    injuredBodyPartOther: OptionalTextSchema,
    injuredBodyPart: OptionalTextSchema,
    medicalCareProvided: z.coerce.boolean().optional(),
    medicalCareTime: OptionalTimeStringSchema,
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
  .superRefine((value, ctx) => {
    if (value.previousAccident && !value.previousAccidentDescription) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['previousAccidentDescription'],
        message: 'Descreva o acidente anterior',
      })
    }

    if (value.accidentType === AccidentType.TYPICAL && value.typicalSubtypes?.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['typicalSubtypes'],
        message: 'Selecione ao menos um subtipo típico',
      })
    }

    if (
      value.accidentType === AccidentType.TYPICAL &&
      value.typicalSubtypes?.includes(AccidentTypicalSubtype.OTHER) &&
      !value.typicalSubtypeOther
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['typicalSubtypeOther'],
        message: 'Detalhe o subtipo típico em "Outros"',
      })
    }

    if (value.accidentType === AccidentType.COMMUTE && value.commuteSubtypes?.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['commuteSubtypes'],
        message: 'Selecione ao menos um subtipo de trajeto',
      })
    }

    if (
      value.accidentType === AccidentType.COMMUTE &&
      value.commuteSubtypes?.includes(AccidentCommuteSubtype.OTHER) &&
      !value.commuteSubtypeOther
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['commuteSubtypeOther'],
        message: 'Detalhe o subtipo de trajeto em "Outros"',
      })
    }

    if (value.workJourneyType === AccidentWorkJourneyType.CHANGED_SCHEDULE) {
      if (!value.scheduleChangeStart) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scheduleChangeStart'],
          message: 'Informe o horário inicial da troca',
        })
      }

      if (!value.scheduleChangeEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scheduleChangeEnd'],
          message: 'Informe o horário final da troca',
        })
      }
    }

    if (
      value.injuredBodyParts?.includes(AccidentBodyPart.OTHER) &&
      !value.injuredBodyPartOther
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['injuredBodyPartOther'],
        message: 'Detalhe a parte do corpo em "Outros"',
      })
    }

    if (value.leaveRequired && (!value.leaveDays || value.leaveDays < 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['leaveDays'],
        message: 'Informe a quantidade de dias de afastamento',
      })
    }

    if (value.catIssued && !value.catNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['catNumber'],
        message: 'Informe o número da CAT',
      })
    }
  })

export type UpdateAccidentDto = z.infer<typeof UpdateAccidentSchema>
