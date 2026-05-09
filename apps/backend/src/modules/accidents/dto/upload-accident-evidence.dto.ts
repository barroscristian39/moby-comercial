import { z } from 'zod'
import { AccidentEvidenceType } from '@moby/shared'

export const UploadAccidentEvidenceSchema = z.object({
  evidenceType: z.nativeEnum(AccidentEvidenceType, {
    errorMap: () => ({ message: 'Selecione o tipo de evidência' }),
  }),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value) return undefined
      return value
    }),
})

export type UploadAccidentEvidenceDto = z.infer<typeof UploadAccidentEvidenceSchema>
