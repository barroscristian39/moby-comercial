# Deploy no Render

Este projeto agora possui uma configuracao base para Render em `render.yaml` e Dockerfiles dedicados em `deploy/render/`.

## Visao geral

- Backend: `moby-sst-backend`
- Frontend: `moby-sst-frontend`
- Regiao sugerida: `virginia`
- Runtime: `docker`
- Arquivo IaC: `render.yaml`

## Importante antes de subir

O backend do MOBY grava templates e documentos em disco local privado. Por isso:

- o backend precisa ficar em um plano pago no Render para suportar `persistent disk`
- o disco foi configurado para montar em `/app/storage`
- o `PRIVATE_STORAGE_ROOT` ja aponta para `/app/storage/private`

Sem esse disco, arquivos locais sao perdidos em restart e redeploy.

## 1. Subir pelo Blueprint

1. Publique o repositorio no GitHub ou GitLab.
2. No Render, clique em `New` -> `Blueprint`.
3. Aponte para este repositorio.
4. Confirme o uso do arquivo `render.yaml` da raiz.

O Render vai criar dois web services:

- `moby-sst-backend`
- `moby-sst-frontend`

## 2. Preencher as variaveis pedidas no primeiro sync

As variaveis marcadas com `sync: false` serao solicitadas na criacao inicial do Blueprint.

### Backend

Preencha no servico `moby-sst-backend`:

- `FRONTEND_URL`
  Exemplo inicial: `https://moby-sst-frontend.onrender.com`
- `DATABASE_URL`
  Use a URL real do banco. Se for Neon, prefira a URL pooler.
- `DIRECT_URL`
  Use a URL direta do banco para migrations.

### Frontend

Preencha no servico `moby-sst-frontend`:

- `NEXT_PUBLIC_API_ORIGIN`
  Exemplo inicial: `https://moby-sst-backend.onrender.com`

Observacoes:

- o frontend aceita tanto `NEXT_PUBLIC_API_URL` quanto `NEXT_PUBLIC_API_ORIGIN`
- no Render, use `NEXT_PUBLIC_API_ORIGIN` para informar apenas a origem da API
- o codigo acrescenta `/api` automaticamente quando necessario

## 3. Banco e migrations

O backend executa este comando antes de cada deploy:

```bash
pnpm --filter backend prisma:deploy
```

Entao:

- `DATABASE_URL` e `DIRECT_URL` precisam estar corretas antes do primeiro deploy
- se voce copiar do `.env`, remova aspas ao redor das URLs
- exemplo correto: `postgresql://...`
- exemplo incorreto: `"postgresql://..."`

## 4. Validacoes depois do deploy

Teste estas rotas:

- Backend health: `https://moby-sst-backend.onrender.com/api/setup/status`
- Frontend login: `https://moby-sst-frontend.onrender.com/login`

Valide tambem:

- login
- refresh de sessao
- upload de template DOCX
- geracao de documentos de acidente
- download de PDF e Word

## 5. Quando mudar dominio ou URL publica

Se voce trocar o dominio publico do frontend ou do backend:

1. atualize `FRONTEND_URL` no backend
2. atualize `NEXT_PUBLIC_API_ORIGIN` no frontend
3. redeploy do backend
4. redeploy do frontend

Isso e importante porque:

- o backend usa `FRONTEND_URL` para CORS
- o frontend embute a URL da API no build

## 6. Observacoes especificas do projeto

- O frontend usa Next.js `standalone` para rodar melhor em container.
- O backend instala LibreOffice no container Linux para exportacao de DOCX para PDF.
- O Swagger segue desativado em producao porque `NODE_ENV=production`.
- O backend continua preparado para funcionar com banco externo, como Neon.
- O `render.yaml` usa `buildFilter` para evitar rebuild desnecessario em partes nao relacionadas do monorepo.
- Se voce passar a usar Redis ou Cloudflare R2 em producao, adicione essas variaveis manualmente no painel do Render.

## 7. Ajustes opcionais

Se quiser reduzir custo para testes:

- mantenha o backend em plano pago por causa do disco persistente
- o frontend pode ser rebaixado manualmente depois, se o seu uso tolerar spin-down

Se quiser simplificar a stack no futuro:

- mover documentos privados para R2
- assim o backend deixa de depender de disco local persistente
