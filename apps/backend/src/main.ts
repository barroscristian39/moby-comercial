import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env.NODE_ENV !== 'production' }),
  )

  // Origens permitidas
  const allowedOrigins = Array.from(new Set([
    ...(process.env.FRONTEND_URL || '').split(',').map((o) => o.trim()).filter(Boolean),
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]))

  // CORS via hook direto no Fastify — mais confiável que @fastify/cors com NestJS Fastify Adapter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fastify = app.getHttpAdapter().getInstance() as any
  fastify.addHook('onRequest', (req: any, reply: any, done: () => void) => {
    const origin: string | undefined = req.headers['origin']

    if (origin && allowedOrigins.includes(origin)) {
      reply.header('Access-Control-Allow-Origin', origin)
      reply.header('Vary', 'Origin')
      reply.header('Access-Control-Allow-Credentials', 'true')
      reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      reply.header('Access-Control-Expose-Headers', 'Content-Disposition')
    }

    if (req.method === 'OPTIONS') {
      reply.header('Access-Control-Max-Age', '86400')
      reply.code(204).send()
      return
    }

    done()
  })

  console.log('[Bootstrap] CORS configurado para:', allowedOrigins)

  // Plugins Fastify — carregados dinamicamente para evitar erros de import ESM
  try {
    const fastifyCookie = require('@fastify/cookie')
    await app.register(fastifyCookie.default ?? fastifyCookie, {
      secret: process.env.REFRESH_TOKEN_SECRET,
    })
    console.log('[Bootstrap] @fastify/cookie registrado')
  } catch (e: any) {
    console.warn('[Bootstrap] Falha ao registrar @fastify/cookie:', e.message)
  }

  try {
    const fastifyHelmet = require('@fastify/helmet')
    await app.register(fastifyHelmet.default ?? fastifyHelmet, {
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: process.env.NODE_ENV === 'production',
    })
    console.log('[Bootstrap] @fastify/helmet registrado')
  } catch (e: any) {
    console.warn('[Bootstrap] Falha ao registrar @fastify/helmet:', e.message)
  }

  try {
    const fastifyMultipart = require('@fastify/multipart')
    await app.register(fastifyMultipart.default ?? fastifyMultipart, {
      limits: {
        files: 1,
        fileSize: 10 * 1024 * 1024,
      },
    })
    console.log('[Bootstrap] @fastify/multipart registrado')
  } catch (e: any) {
    console.warn('[Bootstrap] Falha ao registrar @fastify/multipart:', e.message)
  }

  // Prefixo global da API
  app.setGlobalPrefix('api')

  // Swagger (apenas em dev)
  if (process.env.NODE_ENV !== 'production') {
    try {
      const config = new DocumentBuilder()
        .setTitle('MOBY API')
        .setDescription('API da plataforma MOBY SST')
        .setVersion('1.0')
        .addBearerAuth()
        .build()
      const document = SwaggerModule.createDocument(app, config)
      SwaggerModule.setup('api/docs', app, document)
      console.log('[Bootstrap] Swagger disponível em /api/docs')
    } catch (e) {
      console.warn('[Bootstrap] Falha ao configurar Swagger:', e.message)
    }
  }

  const port = process.env.PORT || 3001
  await app.listen(port, '0.0.0.0')
  console.log(`[Bootstrap] MOBY Backend rodando na porta ${port}`)
}

bootstrap().catch((err) => {
  console.error('[Bootstrap] ERRO FATAL:', err)
  process.exit(1)
})
