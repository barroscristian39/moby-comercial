import { Injectable, NestMiddleware } from '@nestjs/common'

// Origens permitidas — inclui localhost para dev e FRONTEND_URL para produção
const buildAllowedOrigins = () =>
  Array.from(
    new Set([
      ...(process.env.FRONTEND_URL || '').split(',').map((o) => o.trim()).filter(Boolean),
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]),
  )

@Injectable()
export class CorsMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const origin: string | undefined = req.headers['origin']
    const allowedOrigins = buildAllowedOrigins()

    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Vary', 'Origin')
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition')
    }

    // Responde ao preflight OPTIONS diretamente — antes de qualquer guard
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Max-Age', '86400')
      res.statusCode = 204
      res.end()
      return
    }

    next()
  }
}
