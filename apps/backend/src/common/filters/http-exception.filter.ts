import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { FastifyReply } from 'fastify'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const reply = ctx.getResponse<FastifyReply>()

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR
    let code = 'INTERNAL_SERVER_ERROR'
    let message = 'Erro interno do servidor'

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus()
      const response = exception.getResponse()

      if (typeof response === 'object' && (response as any).error) {
        // Já está no formato envelope — retorna direto
        reply.status(statusCode).send(response)
        return
      }

      if (typeof response === 'string') {
        message = response
      } else if (typeof response === 'object') {
        message = (response as any).message || message
      }

      code = this.getErrorCode(statusCode)
    } else {
      this.logger.error('Unhandled exception', exception)
    }

    reply.status(statusCode).send({
      error: { code, message, statusCode },
    })
  }

  private getErrorCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
    }
    return map[status] || 'INTERNAL_SERVER_ERROR'
  }
}
