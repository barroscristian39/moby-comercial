import { z } from 'zod'

export const UpdateFunctionTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nome do template deve ter pelo menos 2 caracteres')
    .max(120, 'Nome do template deve ter no máximo 120 caracteres')
    .optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => data.name !== undefined || data.isActive !== undefined,
  { message: 'Informe ao menos um campo para atualizar o template' },
)

export type UpdateFunctionTemplateDto = z.infer<typeof UpdateFunctionTemplateSchema>
