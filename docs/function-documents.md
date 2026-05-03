# Módulo de Funções e Documentos DOCX

> Este documento descreve o estado atual do pipeline DOCX. A trilha separada de refatoração está em `docs/document-refactor-track.md`.

## Decisões

- `JobFunction` é a entidade de Função do domínio, exposta também por `/api/functions`.
- Funções são vinculadas a múltiplas unidades por `function_units`.
- Templates DOCX ficam em storage privado local por padrão: `apps/backend/storage/private`, ou `PRIVATE_STORAGE_ROOT`.
- Caminhos internos de arquivo não são retornados pela API.
- Cada upload gera uma nova versão de template; a versão anterior é preservada e marcada como inativa para o mesmo tipo de documento.
- Cada geração cria um novo registro em `generated_documents`; documentos gerados não são sobrescritos.
- Exclusão de documento é soft delete (`status = DELETED`) e gera `document_audit_logs` + `audit_logs`.

## Endpoints

`POST /api/functions`

```json
{
  "name": "Soldador",
  "description": "Executa solda MIG/TIG",
  "unitIds": ["uuid-da-unidade"],
  "status": "ACTIVE"
}
```

`GET /api/functions`

Aceita `page`, `perPage`, `tenantId`, `unitId`, `search`.

`PATCH /api/functions/:id`

Permite atualizar `name`, `description`, `cbo`, `unitIds`, `status`.

`DELETE /api/functions/:id`

Soft delete, apenas `SUPER_ADMIN` e `TENANT_ADMIN`.

`POST /api/functions/:id/templates`

Multipart form-data:

- `file`: arquivo `.docx`
- `documentType`: exemplo `OS`
- `name`: opcional

`GET /api/functions/:id/templates`

Lista versões de templates da função.

`POST /api/documents/generate/:employeeId`

```json
{
  "documentType": "OS",
  "templateId": "uuid-opcional"
}
```

Se `templateId` não for enviado, usa o template ativo mais recente da função do colaborador para o `documentType`.

`GET /api/employees/:id/documents`

Lista documentos ativos do colaborador.

`DELETE /api/documents/:id`

Soft delete, apenas `SUPER_ADMIN` e `TENANT_ADMIN`.

## Variáveis DOCX

Templates usam delimitadores `{{ }}`:

- `{{nome}}`
- `{{cpf}}`
- `{{funcao}}`
- `{{unidade}}`
- `{{empresa}}`
- `{{cnpj_empresa}}`
- `{{data_emissao}}`
- `{{data_admissao}}`

## Segurança

- Tenant é derivado do usuário autenticado e das unidades, nunca confiado do frontend.
- Todas as novas tabelas têm `tenant_id`, índices e políticas RLS.
- Geração valida tenant, unidade do colaborador e vínculo função-unidade.
- Upload valida extensão, MIME permitido, assinatura ZIP e estrutura interna DOCX.
- Storage não é público e bloqueia path traversal.
- Auditoria registra criação de função, upload de template, geração e exclusão de documentos.
