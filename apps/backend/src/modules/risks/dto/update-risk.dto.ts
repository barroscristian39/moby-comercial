import { RiskLevel, RiskProbability, RiskSeverity, RiskType } from '@moby/shared'
import { z } from 'zod'

const OptionalTextSchema = z
  .string()
  .trim()
  .min(2, 'Informe pelo menos 2 caracteres')
  .max(120, 'Informe no máximo 120 caracteres')
  .optional()

const OptionalLongTextSchema = z
  .string()
  .trim()
  .max(2000, 'O texto deve ter no máximo 2000 caracteres')
  .optional()
  .transform((value) => value || undefined)

export const UpdateRiskSchema = z.object({
  unitId: z.string().uuid('Selecione uma unidade válida').optional(),
  jobFunctionId: z.string().uuid('Selecione uma função válida').nullable().optional(),
  name: OptionalTextSchema,
  type: z.nativeEnum(RiskType).optional(),
  level: z.nativeEnum(RiskLevel).optional(),
  probability: z.nativeEnum(RiskProbability).optional(),
  severity: z.nativeEnum(RiskSeverity).optional(),
  description: OptionalLongTextSchema,
  controlMeasures: OptionalLongTextSchema,
  isActive: z.boolean().optional(),
}).refine(
  (data) => Object.values(data).some((value) => value !== undefined),
  { message: 'Informe ao menos um campo para atualizar o risco' },
)

export type UpdateRiskDto = z.infer<typeof UpdateRiskSchema>
