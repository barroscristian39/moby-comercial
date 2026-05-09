import { z } from 'zod'
import {
  AccidentActivityType,
  AccidentBodyPart,
  AccidentCommuteSubtype,
  AccidentEvidenceType,
  AccidentInjuredSide,
  AccidentSeverity,
  AccidentStatus,
  AccidentType,
  AccidentTypicalSubtype,
  AccidentWorkJourneyType,
} from '@moby/shared'

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

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

const OptionalTimeStringSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => {
    if (value === undefined || value === null || value === '') return undefined
    return value
  })
  .refine((value) => value === undefined || TIME_PATTERN.test(value), 'Horário inválido')

export const AccidentEvidenceTypeSchema = z.nativeEnum(AccidentEvidenceType)

export const CreateAccidentSchema = z
  .object({
    employeeId: z.string().uuid('Selecione um colaborador válido'),
    regional: z.string().trim().min(2, 'Informe a regional'),
    unitManagerName: OptionalTextSchema,
    salary: OptionalTextSchema,
    employeePhone: OptionalTextSchema,
    workSchedule: OptionalTextSchema,
    totalTimeInRole: OptionalTextSchema,
    activityType: z.nativeEnum(AccidentActivityType).optional(),
    previousAccident: z.coerce.boolean().optional(),
    previousAccidentDescription: OptionalTextSchema,
    occurredAt: DateTimeStringSchema,
    reportedAt: OptionalDateTimeStringSchema,
    location: z.string().trim().min(3, 'Local deve ter ao menos 3 caracteres'),
    occurrenceAddress: OptionalTextSchema,
    accidentType: z.nativeEnum(AccidentType),
    typicalSubtypes: z.array(z.nativeEnum(AccidentTypicalSubtype)).default([]),
    typicalSubtypeOther: OptionalTextSchema,
    commuteSubtypes: z.array(z.nativeEnum(AccidentCommuteSubtype)).default([]),
    commuteSubtypeOther: OptionalTextSchema,
    workJourneyType: z.nativeEnum(AccidentWorkJourneyType).optional(),
    scheduleChangeStart: OptionalTimeStringSchema,
    scheduleChangeEnd: OptionalTimeStringSchema,
    severity: z.nativeEnum(AccidentSeverity),
    status: z.nativeEnum(AccidentStatus).optional(),
    description: z.string().trim().min(10, 'Descreva o acidente com mais detalhes'),
    injuredSide: z.nativeEnum(AccidentInjuredSide, {
      errorMap: () => ({ message: 'Informe o lado atingido' }),
    }).optional().nullable(),
    injuredBodyParts: z.array(z.nativeEnum(AccidentBodyPart)).min(1, 'Selecione ao menos uma parte do corpo'),
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
  })
  .superRefine((value, ctx) => {
    if (value.previousAccident && !value.previousAccidentDescription) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['previousAccidentDescription'],
        message: 'Descreva o acidente anterior',
      })
    }

    if (value.accidentType === AccidentType.TYPICAL && value.typicalSubtypes.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['typicalSubtypes'],
        message: 'Selecione ao menos um subtipo típico',
      })
    }

    if (
      value.accidentType === AccidentType.TYPICAL &&
      value.typicalSubtypes.includes(AccidentTypicalSubtype.OTHER) &&
      !value.typicalSubtypeOther
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['typicalSubtypeOther'],
        message: 'Detalhe o subtipo típico em "Outros"',
      })
    }

    if (value.accidentType === AccidentType.COMMUTE && value.commuteSubtypes.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['commuteSubtypes'],
        message: 'Selecione ao menos um subtipo de trajeto',
      })
    }

    if (
      value.accidentType === AccidentType.COMMUTE &&
      value.commuteSubtypes.includes(AccidentCommuteSubtype.OTHER) &&
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

    if (value.injuredBodyParts.includes(AccidentBodyPart.OTHER) && !value.injuredBodyPartOther) {
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

export type CreateAccidentDto = z.infer<typeof CreateAccidentSchema>
