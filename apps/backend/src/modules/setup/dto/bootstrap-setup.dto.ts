import { PasswordPolicySchema } from '@moby/shared'
import { z } from 'zod'

export const BootstrapSetupSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do administrador'),
  email: z.string().trim().email('Informe um e-mail válido'),
  password: PasswordPolicySchema,
})

export type BootstrapSetupDto = z.infer<typeof BootstrapSetupSchema>
