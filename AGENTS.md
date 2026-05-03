# MOBY — Contexto do Projeto para Codex

## O que é este projeto

MOBY é uma plataforma SaaS B2B de Segurança e Saúde do Trabalho (SST), com foco em:
- GRO — Gerenciamento de Riscos Ocupacionais
- Gestão de EPI, Treinamentos e Exames Ocupacionais
- Emissão de documentos legais (PGR, PCMSO, OS, LTCAT, LIP, ASO)
- Integração com eSocial (S-2210, S-2220, S-2240, S-3000)
- Multiempresa e multiunidade

O núcleo do produto é: **Risco → Controle → Ação → Evidência → Documento → Conformidade**

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui |
| Estado servidor | TanStack Query v5 |
| Estado cliente | Zustand |
| Forms | React Hook Form + Zod |
| Backend | NestJS + Fastify Adapter + TypeScript |
| ORM | Prisma |
| Banco | PostgreSQL (Neon em produção, Docker local) |
| Cache / Filas | Redis + BullMQ |
| Storage | Cloudflare R2 (S3-compatible) |
| PDF server-side | Puppeteer |
| PDF client-side | @react-pdf/renderer |
| Validação | Zod (compartilhado entre frontend e backend via packages/shared) |
| Auth | JWT (15 min) + Refresh Token rotation (HttpOnly Cookie, 7 dias) |
| Gerenciador de pacotes | pnpm (workspaces) |

---

## Estrutura do monorepo

```
moby/
├── apps/
│   ├── backend/       → NestJS API (porta 3001)
│   └── frontend/      → Next.js (porta 3000)
├── packages/
│   └── shared/        → Tipos TypeScript e schemas Zod compartilhados
├── docker-compose.yml → PostgreSQL + Redis para desenvolvimento local
├── pnpm-workspace.yaml
└── AGENTS.md          ← este arquivo
```

---

## Arquitetura — decisões fixas (não alterar sem discussão)

### Multi-tenancy
- **Shared schema + PostgreSQL Row-Level Security (RLS)**
- Toda tabela de negócio tem `company_id` (tenant principal)
- O backend seta `app.current_company_id` via `prisma.$executeRaw` a cada request autenticado
- `ADMIN_SYSTEM` tem bypass de RLS

### Autenticação
- Access Token (JWT, 15 min) no body/header Authorization
- Refresh Token (7 dias) em HttpOnly Cookie
- Refresh Token rotation: invalida o anterior a cada uso
- Implementado com Passport.js (strategies: Local + JWT)

### Autorização — RBAC + Scope
```typescript
enum Role {
  ADMIN_SYSTEM = 'ADMIN_SYSTEM',
  TECH_SAFETY  = 'TECH_SAFETY',
  HR_ADMIN     = 'HR_ADMIN',
  MANAGER      = 'MANAGER',
  UNIT_USER    = 'UNIT_USER',
}
```
- Guards: `JwtAuthGuard`, `RolesGuard`, `ScopeGuard`
- Escopo limitado por `company_id` e opcionalmente `unit_id`

---

## Padrões obrigatórios de código

### Repository Pattern (backend)
- Service nunca acessa Prisma diretamente
- Service → Repository → Prisma
- Exemplo: `RisksService` chama `RisksRepository`, não `PrismaService`

### Estrutura de cada módulo NestJS
```
nome-modulo/
  nome-modulo.module.ts
  nome-modulo.controller.ts
  nome-modulo.service.ts
  nome-modulo.repository.ts
  dto/
    create-nome.dto.ts   ← schema Zod + tipo inferido
    update-nome.dto.ts
  entities/
    nome.entity.ts       ← tipo de retorno (output shape)
```

### Validação sempre com Zod
```typescript
export const CreateRiskSchema = z.object({ ... });
export type CreateRiskDto = z.infer<typeof CreateRiskSchema>;
```

### Response Envelope padrão
```typescript
// Lista paginada
{ data: [...], meta: { total, page, perPage, totalPages } }

// Objeto único
{ data: { ... } }

// Erro
{ error: { code: 'SNAKE_CASE_CODE', message: '...', statusCode: 404 } }
```

### Soft Delete — obrigatório em entidades de negócio
- Nunca `DELETE` físico em entidades críticas
- Toda tabela crítica tem: `deletedAt DateTime?`, `deletedBy String?`, `isActive Boolean @default(true)`
- Queries sempre filtram `deletedAt: null`

### Auditoria
- Interceptor global registra toda mutação (POST, PUT, PATCH, DELETE)
- Tabela `audit_logs`: entity, entity_id, action, previous_data (JSONB), new_data (JSONB), user_id, ip

### Versionamento de documentos
- Documento emitido é **imutável**
- Nova emissão = novo registro com versão incrementada
- Status possíveis: `DRAFT | ACTIVE | SUPERSEDED | ARCHIVED`

---

## Hierarquia organizacional do sistema

```
Empresa
└── Unidade
    └── Setor / Função
        ├── Colaboradores
        ├── Riscos
        ├── EPIs
        ├── Treinamentos
        ├── Exames
        ├── Documentos
        └── Ordem de Serviço
```

---

## Regras de negócio críticas (resumo)

1. Colaborador deve estar vinculado a empresa + unidade + função
2. Mudança de função mantém histórico e pode exigir nova OS, revisão de EPI/treinamento/exame
3. Risco deve estar vinculado a unidade e/ou função — nunca solto
4. Risco pode ter N avaliações ao longo do tempo — histórico preservado
5. EPI vencido ou a vencer gera alerta
6. Treinamento vencido ou a vencer gera alerta
7. Exame vencido ou a vencer gera alerta
8. Nenhuma entrega de EPI apaga entrega anterior
9. Cada colaborador tem uma ficha de EPI com histórico completo
10. Plano de ação vencido gera alerta
11. Ação concluída não pode ser apagada — apenas auditada
12. Todo envio ao eSocial tem histórico completo de status e retorno

---

## Status de implementação — Fases

- [ ] **Fase 1** — Fundação: auth, usuários, empresas, unidades, funções, colaboradores
- [ ] **Fase 2** — GRO: riscos, avaliações, controles, plano de ação
- [ ] **Fase 3** — EPI: catálogo, entregas, ficha por colaborador, alertas
- [ ] **Fase 4** — Saúde: exames, treinamentos, PCMSO, ASO, ficha clínica
- [ ] **Fase 5** — Documentos: templates, OS, PGR, PCMSO, LTCAT, LIP
- [ ] **Fase 6** — eSocial, relatórios, auditoria avançada

> **Atualizar este arquivo conforme cada fase for concluída.**

## Trilhas paralelas abertas

- `Refatoração de Documentos`: ver `docs/document-refactor-track.md`
- Objetivo: separar a modernização do pipeline documental da entrega funcional da Fase 5
- Direção atual: modelo híbrido com DOCX para editável e HTML/PDF para documentos legais

---

## Como rodar localmente

```bash
# Instalar dependências
pnpm install

# Subir banco e Redis
docker-compose up -d

# Backend (porta 3001)
pnpm --filter backend dev

# Frontend (porta 3000)
pnpm --filter frontend dev

# Rodar migrations
pnpm --filter backend prisma:migrate

# Rodar seed
pnpm --filter backend prisma:seed
```

---

## Variáveis de ambiente

Copiar `.env.example` para `.env` antes de rodar. Nunca commitar `.env`.

---

## Convenções de nome

- Arquivos e pastas: `kebab-case`
- Classes e tipos: `PascalCase`
- Variáveis e funções: `camelCase`
- Constantes: `UPPER_SNAKE_CASE`
- Enums: `PascalCase` (nome) + `UPPER_SNAKE_CASE` (valores)
- Tabelas no banco: `snake_case` (plural)
- Colunas no banco: `snake_case`
- Endpoints da API: `kebab-case` plural (`/api/companies`, `/api/service-orders`)

---

## O que NÃO fazer

- Não acessar Prisma diretamente na Service — sempre via Repository
- Não deletar fisicamente entidades de negócio críticas
- Não sobrescrever documentos emitidos — sempre versionar
- Não commitar arquivos `.env`
- Não colocar lógica de negócio no Controller — só no Service
- Não retornar senhas ou tokens sensíveis em respostas de API
- Não ignorar o RLS — toda query de tenant deve ter `company_id` no where
