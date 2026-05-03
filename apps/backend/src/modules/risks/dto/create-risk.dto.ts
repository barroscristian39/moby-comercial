import { RiskLevel, RiskProbability, RiskSeverity, RiskType } from '@moby/shared'
import { z } from 'zod'

const TrimmedTextSchema = z
  .string()
  .trim()
  .min(2, 'Informe pelo menos 2 caracteres')
  .max(120, 'Informe no máximo 120 caracteres')

const OptionalLongTextSchema = z
  .string()
  .trim()
  .max(2000, 'O texto deve ter no máximo 2000 caracteres')
  .optional()
  .transform((value) => value || undefined)

export const CreateRiskSchema = z.object({
  unitId: z.string().uuid('Selecione uma unidade'),
  jobFunctionId: z.string().uuid('Selecione uma função válida').nullable().optional(),
  name: TrimmedTextSchema,
  type: z.nativeEnum(RiskType, { message: 'Selecione o tipo do risco' }),
  level: z.nativeEnum(RiskLevel, { message: 'Selecione o nível do risco' }),
  probability: z.nativeEnum(RiskProbability, { message: 'Selecione a probabilidade' }),
  severity: z.nativeEnum(RiskSeverity, { message: 'Selecione a severidade' }),
  description: OptionalLongTextSchema,
  controlMeasures: OptionalLongTextSchema,
})

export type CreateRiskDto = z.infer<typeof CreateRiskSchema>
