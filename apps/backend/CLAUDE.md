# MOBY Backend — Contexto específico

> Leia também o CLAUDE.md na raiz do monorepo para contexto geral do projeto.

## Stack deste app

- **Framework:** NestJS com Fastify adapter
- **ORM:** Prisma
- **Validação:** Zod (via `ZodValidationPipe` global)
- **Autenticação:** Passport.js (Local + JWT strategies)
- **Filas:** BullMQ + Redis
- **Porta:** 3001

## Estrutura de pastas

```
src/
├── modules/          ← um módulo por domínio de negócio
├── common/           ← decorators, filters, guards, interceptors, pipes, utils
├── config/           ← configurações tipadas (app, db, jwt, redis, storage)
├── database/         ← PrismaService e PrismaModule
├── jobs/             ← BullMQ processors (alerts, esocial, pdf, reports)
└── shared/           ← enums, types, constants reutilizados

prisma/
├── schema.prisma     ← fonte única de verdade do banco
└── seed.ts
```

## Módulos implementados

Marcar conforme for concluindo:

- [ ] auth
- [ ] users
- [ ] companies
- [ ] units
- [ ] sectors
- [ ] functions
- [ ] employees
- [ ] contractors
- [ ] risks
- [ ] risk-assessments
- [ ] controls
- [ ] action-plans
- [ ] epi/catalog
- [ ] epi/deliveries
- [ ] epi/employee-card
- [ ] trainings
- [ ] exams
- [ ] health (pcmso, aso, clinical-records)
- [ ] documents/templates
- [ ] documents/versions
- [ ] service-orders
- [ ] pgr
- [ ] ltcat
- [ ] lip
- [ ] esocial/s2210
- [ ] esocial/s2220
- [ ] esocial/s2240
- [ ] esocial/s3000
- [ ] reports
- [ ] alerts
- [ ] audit

## Padrões obrigatórios

### Estrutura de módulo
```
nome-modulo/
  nome-modulo.module.ts
  nome-modulo.controller.ts   ← só rotas, guards, decorators
  nome-modulo.service.ts      ← lógica de negócio
  nome-modulo.repository.ts   ← queries Prisma
  dto/
    create-nome.dto.ts
    update-nome.dto.ts
  entities/
    nome.entity.ts
```

### Guard obrigatório em todo endpoint protegido
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TECH_SAFETY, Role.ADMIN_SYSTEM)
@Get()
findAll(@CurrentUser() user: RequestUser) { ... }
```

### Tenant sempre no where
```typescript
// CORRETO
findMany({ where: { companyId: ctx.companyId, deletedAt: null } })

// ERRADO — jamais buscar sem companyId (exceto ADMIN_SYSTEM)
findMany({})
```

### Retorno paginado
```typescript
return {
  data: items,
  meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) }
};
```

## Comandos úteis

```bash
# Dev com hot reload
pnpm dev

# Migrations
pnpm prisma:migrate      # npx prisma migrate dev
pnpm prisma:deploy       # npx prisma migrate deploy (produção)
pnpm prisma:studio       # Prisma Studio na porta 5555
pnpm prisma:seed         # npx prisma db seed

# Testes
pnpm test                # unit
pnpm test:e2e            # end-to-end
pnpm test:cov            # cobertura

# Build
pnpm build
```

## Variáveis de ambiente necessárias

```bash
DATABASE_URL=
DIRECT_URL=
JWT_SECRET=
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=
REFRESH_TOKEN_EXPIRES_IN=7d
REDIS_URL=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
FRONTEND_URL=
PORT=3001
NODE_ENV=development
```
