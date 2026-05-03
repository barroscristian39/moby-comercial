# MOBY Frontend — Contexto específico

> Leia também o CLAUDE.md na raiz do monorepo para contexto geral do projeto.

## Stack deste app

- **Framework:** Next.js 14 com App Router
- **Estilização:** Tailwind CSS + shadcn/ui (componentes em src/components/ui/)
- **Estado servidor:** TanStack Query v5
- **Estado cliente:** Zustand
- **Forms:** React Hook Form + Zod
- **HTTP:** Axios com interceptors (lib/api/client.ts)
- **Porta:** 3000

## Identidade visual MOBY

| Uso | Cor | Hex |
|---|---|---|
| Principal | Verde | `#2E7D32` |
| Principal dark | Verde escuro | `#1B5E20` |
| Destaque | Verde claro | `#4CAF50` |
| Fundo suave | Verde bg | `#E8F5E9` |
| Crítico / erro | Vermelho | `#C62828` |
| Atenção | Amarelo | `#F57F17` |
| Base | Branco + cinza | `#FFFFFF` / `#ECEFF1` |

Tailwind config extende as cores com prefixo `moby-*`.

## Estrutura de rotas (App Router)

```
app/
├── (auth)/           ← sem sidebar (login, esqueci senha)
│   └── login/
└── (platform)/       ← com sidebar + header (área autenticada)
    ├── layout.tsx    ← sidebar + header compartilhados
    ├── dashboard/
    ├── companies/
    ├── units/
    ├── employees/
    ├── risks/
    ├── epi/
    ├── trainings/
    ├── exams/
    ├── health/
    ├── documents/
    ├── esocial/
    ├── reports/
    └── settings/
```

## Componentes

```
components/
├── ui/           ← shadcn/ui (NUNCA editar diretamente — re-gerar se necessário)
├── shared/       ← reutilizáveis entre módulos
│   ├── DataTable/
│   ├── KpiCard/
│   ├── StatusBadge/
│   ├── PageHeader/
│   ├── FilterBar/
│   ├── ConfirmDialog/
│   └── EmptyState/
├── layout/       ← Sidebar, Header, Breadcrumbs, CompanySwitcher
└── features/     ← específicos de domínio (RiskMatrix, EpiDeliveryForm...)
```

## Padrões de página

### Estrutura padrão de listagem
```
PageHeader (título + botão de ação principal)
FilterBar (filtros: empresa, unidade, status, busca)
KpiCards (indicadores resumidos — clicáveis)
DataTable (listagem detalhada com paginação)
```

### Regra de dashboard
- Cards de KPI no topo são **resumos clicáveis**
- Ao clicar no card, a tabela abaixo **filtra** para mostrar o detalhe
- A tabela **não repete** os KPIs como caixas extras
- Exemplo: card "EPIs vencidos: 18" → clique → tabela mostra os 18

## Chamadas de API

Sempre via funções em `lib/api/endpoints/`:

```typescript
// lib/api/endpoints/risks.api.ts
export const risksApi = {
  findAll: (params) => client.get('/risks', { params }),
  findById: (id) => client.get(`/risks/${id}`),
  create: (dto) => client.post('/risks', dto),
  update: (id, dto) => client.patch(`/risks/${id}`, dto),
  remove: (id) => client.delete(`/risks/${id}`),
};
```

Nunca fazer `axios.get(...)` diretamente em componentes ou hooks.

## Páginas implementadas

Marcar conforme for concluindo:

- [ ] Login
- [ ] Dashboard
- [ ] Empresas (list + form)
- [ ] Unidades (list + form)
- [ ] Colaboradores (list + form + histórico)
- [ ] Setores/Funções
- [ ] Riscos (inventário + avaliação + controles + ações)
- [ ] EPI — Catálogo
- [ ] EPI — Entregas
- [ ] EPI — Fichas por colaborador
- [ ] Treinamentos
- [ ] Exames
- [ ] Saúde ocupacional
- [ ] Ordem de Serviço
- [ ] PGR / PCMSO / LTCAT / LIP
- [ ] Templates
- [ ] eSocial
- [ ] Relatórios
- [ ] Configurações

## Comandos úteis

```bash
pnpm dev        # servidor de desenvolvimento
pnpm build      # build de produção
pnpm lint       # ESLint
pnpm typecheck  # tsc --noEmit

# Adicionar componente shadcn/ui
pnpm dlx shadcn@latest add button
```
