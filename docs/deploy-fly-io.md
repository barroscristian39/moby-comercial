# Deploy no Fly.io

Este projeto ja possui arquivos base de deploy para Fly.io em `deploy/fly/`.

## 1. Pre-requisitos

- Instalar o `flyctl`: https://fly.io/docs/flyctl/install/
- Fazer login:

```bash
fly auth login
```

## 2. Ajustar nomes dos apps

Os nomes em Fly.io sao globais. Antes do deploy, edite estes arquivos e troque os nomes por algo unico:

- `deploy/fly/fly.backend.toml`
- `deploy/fly/fly.frontend.toml`

Exemplo:

```toml
app = "moby-sst-backend-prod"
app = "moby-sst-frontend-prod"
```

## 3. Criar os apps

```bash
fly apps create moby-sst-backend-prod
fly apps create moby-sst-frontend-prod
```

## 4. Criar volume do backend

O backend usa armazenamento local para arquivos privados em `/data/private`.

```bash
fly volumes create backend_storage --app moby-sst-backend-prod --region gru --size 5
```

Se voce pretende escalar o backend para mais de uma maquina, mova os arquivos privados para um storage compartilhado, como Cloudflare R2.

## 5. Configurar secrets do backend

Defina os secrets reais do backend no app da API:

```powershell
fly secrets set `
  DATABASE_URL="postgresql://..." `
  DIRECT_URL="postgresql://..." `
  JWT_SECRET="gere-um-segredo-forte" `
  REFRESH_TOKEN_SECRET="gere-outro-segredo-forte" `
  REDIS_URL="redis://..." `
  FRONTEND_URL="https://moby-sst-frontend-prod.fly.dev" `
  R2_ACCOUNT_ID="..." `
  R2_ACCESS_KEY_ID="..." `
  R2_SECRET_ACCESS_KEY="..." `
  R2_BUCKET_NAME="moby-prod" `
  --app moby-sst-backend-prod
```

Observacoes:

- `COOKIE_SAME_SITE=none` e `COOKIE_SECURE=true` ja estao no `fly.backend.toml`.
- `COOKIE_DOMAIN` pode ficar vazio na maioria dos casos.
- Troque os segredos de JWT e refresh token antes de producao.
- Se voce copiar valores do `.env` manualmente, remova aspas ao redor das URLs. Exemplo: use `postgresql://...` e nao `"postgresql://..."`, senao o Prisma falha com `P1013`.

## 6. Ajustar a URL publica da API no frontend

Atualize a URL do backend em `deploy/fly/fly.frontend.toml`:

```toml
[build.args]
  NEXT_PUBLIC_API_URL = "https://moby-sst-backend-prod.fly.dev/api"
```

Importante: `NEXT_PUBLIC_API_URL` e embutido no build. Se mudar a URL da API depois, faca novo deploy do frontend.

## 7. Deploy do backend

```bash
fly deploy --config deploy/fly/fly.backend.toml --dockerfile deploy/fly/backend.Dockerfile --remote-only
```

O backend executa `pnpm --filter backend prisma:deploy` como `release_command` durante o deploy.

## 8. Deploy do frontend

```bash
fly deploy --config deploy/fly/fly.frontend.toml --dockerfile deploy/fly/frontend.Dockerfile --remote-only
```

## 9. Validacao

Confira status e logs:

```bash
fly status --app moby-sst-backend-prod
fly logs --app moby-sst-backend-prod
fly status --app moby-sst-frontend-prod
fly logs --app moby-sst-frontend-prod
```

Rotas uteis:

- Backend: `https://moby-sst-backend-prod.fly.dev/api/setup/status`
- Frontend: `https://moby-sst-frontend-prod.fly.dev/login`

## 10. Observacoes do projeto

- O frontend esta configurado em `standalone` para rodar bem no container.
- O backend esta preparado para exportacao de documentos em Linux com LibreOffice.
- O Prisma foi configurado com `binaryTargets` para o runtime Debian usado no Fly.io.
- O frontend e o backend foram configurados para funcionar com cookie cross-site em ambiente HTTPS separado.
- No codigo atual, o Swagger fica desativado em producao (`NODE_ENV=production`).
