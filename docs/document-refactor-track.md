# Trilha Separada — Refatoração de Documentos

## Objetivo

Separar a refatoração estrutural do pipeline de documentos da evolução funcional da Fase 5.

O alvo desta trilha é deixar o módulo de documentos:

- cloud-native
- compatível com Linux e containers
- multi-tenant de ponta a ponta
- auditável e observável
- preparado para múltiplos tipos de renderer

## Por que esta trilha existe

Hoje o módulo já resolve bem um caso específico: upload de templates DOCX por função e geração de documentos simples por colaborador.

O problema é que a base técnica atual não fecha com a arquitetura alvo do produto:

- storage ainda grava em filesystem local
- exportação PDF depende de Microsoft Word via COM no Windows
- pipeline é síncrono e sem fila
- o mesmo fluxo tenta servir tanto documentos editáveis quanto documentos legais complexos

Misturar essa refatoração com a entrega funcional de PGR, PCMSO, LTCAT e LIP tende a aumentar risco, retrabalho e regressão.

## Estado atual

### O que já existe e deve ser preservado

- versionamento de templates DOCX por função
- geração imutável em `generated_documents`
- auditoria de criação e exclusão
- validação de tenant, unidade e vínculo função-unidade
- RLS ativo nas tabelas do módulo

### O que hoje limita a evolução

- `DocumentStorageService` grava em disco local
- `DocumentExportService` converte DOCX para PDF usando Word no servidor Windows
- não existe abstração de storage
- não existe abstração de renderer
- não existe fila para geração/exportação
- não existe estratégia explícita para documentos legais de layout mais rico

## Direção arquitetural recomendada

Não forçar Puppeteer a “converter DOCX”.

A recomendação é assumir um pipeline com múltiplos renderers:

- `DOCX renderer` para documentos editáveis e fluxos onde o `.docx` continua sendo importante
- `HTML/PDF renderer` com Puppeteer para documentos legais, diagramados e PDF-first

Isso permite manter compatibilidade com o que já existe sem travar a evolução dos documentos de SST mais complexos.

## Escopo desta trilha

- abstração de storage com adapter local para dev e adapter R2 para cloud
- abstração de renderer para DOCX e HTML/PDF
- pipeline assíncrono com BullMQ para geração/exportação
- metadados de emissão, versão, engine e artefatos gerados
- observabilidade, retry e falhas rastreáveis
- plano de migração do fluxo atual sem quebra de API

## Fora de escopo nesta trilha

- construir todos os templates finais de PGR, PCMSO, LTCAT e LIP
- redesenhar o frontend inteiro de documentos
- integrar eSocial
- trocar o modelo de negócio de função, colaborador ou tenant

## Princípios

- documento emitido continua imutável
- upload, renderização, armazenamento e download devem ser responsabilidades separadas
- path físico nunca deve vazar pela API
- fallback local deve existir para desenvolvimento
- produção não pode depender de Word, filesystem local ou comportamento específico de Windows

## Arquitetura alvo

### 1. Storage

Criar uma porta de storage, por exemplo:

- `DocumentStoragePort`
- `LocalDocumentStorageAdapter`
- `R2DocumentStorageAdapter`

Responsabilidades:

- salvar arquivo
- ler arquivo
- remover artefato temporário quando aplicável
- resolver metadados de download sem expor caminho interno

### 2. Renderização

Criar uma porta de renderer, por exemplo:

- `DocumentRendererPort`
- `DocxTemplateRenderer`
- `HtmlPdfRenderer`

Responsabilidades:

- validar template de entrada
- renderizar artefato final
- devolver metadados do engine usado

### 3. Orquestração

Criar um serviço de orquestração, por exemplo:

- `DocumentPipelineService`

Responsabilidades:

- selecionar template/blueprint
- selecionar renderer
- disparar geração síncrona ou assíncrona
- persistir `generated_documents`
- persistir auditoria e status

### 4. Processamento assíncrono

Usar BullMQ para:

- geração de PDF
- geração de documentos pesados
- retries controlados
- observabilidade de erro e tempo de processamento

### 5. Modelo de emissão

Cada emissão deve registrar, além do que já existe:

- engine usado
- formato final gerado
- storage provider
- versão do template/blueprint
- status de processamento

## Estratégia recomendada por tipo de documento

### Trilha A — documentos editáveis

Manter DOCX para:

- OS
- documentos simples por colaborador
- fluxos onde o cliente pode precisar baixar em Word

### Trilha B — documentos legais e diagramados

Adotar HTML/PDF com Puppeteer para:

- PGR
- PCMSO
- LTCAT
- LIP
- relatórios consolidados

## Fases da trilha

### Fase 0 — decisão técnica

Confirmar oficialmente o modelo híbrido:

- DOCX para editável
- HTML/PDF para legal e PDF-first

### Fase 1 — fundação

- introduzir portas de storage e renderer
- manter adapter local compatível com o fluxo atual
- preservar endpoints existentes

### Fase 2 — storage cloud-ready

- adicionar adapter R2
- mover configuração de storage para env/config central
- suportar dev local e produção cloud sem trocar código de domínio

### Fase 3 — renderização desacoplada

- encapsular o renderer DOCX atual
- remover dependência de Word para PDF
- adicionar renderer HTML/PDF com Puppeteer

### Fase 4 — fila e processamento

- introduzir jobs BullMQ
- criar estados de processamento
- implementar retry, timeout e logging operacional

### Fase 5 — expansão funcional

- habilitar blueprints legais
- definir dados de entrada por tipo documental
- preparar catálogo de documentos SST

### Fase 6 — corte e limpeza

- descontinuar caminhos legados que dependem de Word
- revisar documentação, testes e observabilidade

## Critérios de aceite

- geração e exportação funcionam em Linux/container
- produção usa R2 em vez de filesystem local
- PDF não depende de Microsoft Word
- documentos continuam imutáveis e auditáveis
- download não expõe path interno
- falhas de geração ficam rastreáveis por status e log
- o fluxo atual de DOCX continua funcional durante a migração

## Primeiro slice recomendado

Abrir a implementação por um slice pequeno e reversível:

1. criar `DocumentStoragePort`
2. adaptar o storage local existente para essa porta
3. criar `DocumentRendererPort`
4. encapsular o renderer DOCX atual sem mudar endpoint
5. registrar no banco ou no domínio qual engine gerou cada documento

Esse slice não muda regra de negócio e cria a base para R2, Puppeteer e BullMQ entrarem depois.

## Riscos principais

- tentar unificar todos os documentos em um único engine
- migrar storage e renderer ao mesmo tempo sem camada de compatibilidade
- quebrar download de DOCX existente durante a transição
- misturar entrega de documentos legais com refatoração infraestrutural

## Referências locais

- estado atual do módulo: `docs/function-documents.md`
- storage atual: `apps/backend/src/modules/documents/document-storage.service.ts`
- exportação atual: `apps/backend/src/modules/documents/document-export.service.ts`
- serviço principal: `apps/backend/src/modules/documents/documents.service.ts`
