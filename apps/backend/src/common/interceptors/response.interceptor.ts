import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((value) => {
        // Se já tem o envelope (data ou error), não re-embala
        if (value && (value.data !== undefined || value.error !== undefined || value.meta !== undefined)) {
          return value
        }
        // Wrap simples: { data: value }
        return { data: value }
      }),
    )
  }
}
