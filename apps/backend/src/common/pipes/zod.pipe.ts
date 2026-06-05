import { PipeTransform, BadRequestException } from '@nestjs/common'
import { ZodSchema } from 'zod'

export class ZodPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value)

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }))
      const firstDetail = errors[0]
      const message = firstDetail
        ? `Dados inválidos: ${firstDetail.field} ${firstDetail.message}`
        : 'Dados inválidos'

      throw new BadRequestException({
        error: {
          code: 'VALIDATION_ERROR',
          message,
          statusCode: 400,
          details: errors,
        },
      })
    }

    return result.data
  }
}
