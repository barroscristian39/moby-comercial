'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Briefcase,
  Download,
  FileText,
  Loader2,
  Trash2,
  User,
  Wand2,
} from 'lucide-react'

import { Topbar } from '@/components/layout/topbar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCompanies } from '@/hooks/use-companies'
import { useEmployee } from '@/hooks/use-employees'
import {
  useDeleteGeneratedDocument,
  useDownloadGeneratedDocument,
  useEmployeeDocuments,
  useFunctionTemplates,
  useGenerateFunctionDocument,
} from '@/hooks/use-function-documents'
import { useJobFunction } from '@/hooks/use-job-functions'
import { useUnits } from '@/hooks/use-units'
import type {
  FunctionTemplate,
  GeneratedDocument,
  GeneratedDocumentDownloadFormat,
} from '@/lib/api/function-documents.api'
import { useAuthStore } from '@/store/auth.store'

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  ORDEM_SERVICO: 'Ordem de Serviço',
  PGR: 'PGR',
  PCMSO: 'PCMSO',
  LTCAT: 'LTCAT',
  LIP: 'LIP',
  ASO: 'ASO',
}

const GENERATOR_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'TECNICO_SST'])
const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN'])

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value.includes('T') ? value : `${value}T00:00:00`).toLocaleDateString('pt-BR')
}

export default function ColaboradorPerfilPage() {
  const router = useRouter()
  const params = useParams()
  const employeeId = String(params.id ?? '')

  const [generatingTemplateId, setGeneratingTemplateId] = useState<string | null>(null)
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [documentToDelete, setDocumentToDelete] = useState<GeneratedDocument | null>(null)

  const user = useAuthStore((s) => s.user)
  const accessContext = useAuthStore((s) => s.accessContext)
  const permissions = new Set(accessContext?.available_permissions ?? [])
  const canGenerate = !!user?.role && GENERATOR_ROLES.has(user.role)
  const canDelete = !!user?.role && ADMIN_ROLES.has(user.role)
  const canDownloadPdf = permissions.has('documents.read') || canGenerate || canDelete
  const canDownloadWord = canGenerate

  const employeeQuery = useEmployee(employeeId)
  const employee = employeeQuery.data
  const jobFunctionId = employee?.jobFunctionId

  const { data: companiesData } = useCompanies({ page: 1, perPage: 100 })
  const { data: unitsData } = useUnits({ page: 1, perPage: 100 })
  const { data: jobFunction } = useJobFunction(jobFunctionId)
  const { data: templates = [], isLoading: loadingTemplates } = useFunctionTemplates(jobFunctionId)
  const documentsQuery = useEmployeeDocuments(employeeId)
  const generateDocument = useGenerateFunctionDocument()
  const downloadDocument = useDownloadGeneratedDocument()
  const deleteDocument = useDeleteGeneratedDocument(employeeId)

  const companies = companiesData?.data ?? []
  const units = unitsData?.data ?? []
  const company = companies.find((item) => item.id === employee?.companyId)
  const unit = units.find((item) => item.id === employee?.unitId)
  const activeTemplates = templates.filter((template) => template.isActive)
  const documents = documentsQuery.data ?? []

  async function handleGenerate(template: FunctionTemplate) {
    if (!employee) return
    setGeneratingTemplateId(template.id)
    try {
      await generateDocument.mutateAsync({
        employeeId: employee.id,
        documentType: template.documentType,
        templateId: template.id,
      })
      await documentsQuery.refetch()
    } finally {
      setGeneratingTemplateId(null)
    }
  }

  async function handleDownload(document: GeneratedDocument, format: GeneratedDocumentDownloadFormat) {
    const key = `${document.id}:${format}`
    setDownloadingKey(key)
    try {
      await downloadDocument.mutateAsync({ document, format })
    } finally {
      setDownloadingKey(null)
    }
  }

  async function handleDeleteConfirm() {
    if (!documentToDelete) return

    setDeletingId(documentToDelete.id)
    try {
      await deleteDocument.mutateAsync(documentToDelete.id)
      setDocumentToDelete(null)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <Topbar title="Perfil do Colaborador" subtitle={employee?.name ?? 'Documentos e histórico'} />

      <Dialog
        open={!!documentToDelete}
        onOpenChange={(open) => {
          if (!open && !deletingId) {
            setDocumentToDelete(null)
          }
        }}
      >
        <DialogContent
          className="max-w-md overflow-hidden border-destructive/20 p-0"
          onEscapeKeyDown={(event) => {
            if (deletingId) event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (deletingId) event.preventDefault()
          }}
        >
          <div className="border-b border-border bg-gradient-to-r from-destructive/10 via-background to-background px-6 py-5">
            <DialogHeader className="mb-0 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <DialogTitle>Excluir documento ativo?</DialogTitle>
                  <DialogDescription>
                    O documento será removido do histórico ativo deste colaborador.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="space-y-4 px-6 py-5">
            {documentToDelete && (
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Documento selecionado
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {DOCUMENT_TYPE_LABELS[documentToDelete.documentType] ?? documentToDelete.documentType}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Emitido em</p>
                    <p className="mt-1 text-sm text-foreground">
                      {new Date(documentToDelete.generatedAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Status atual</p>
                    <div className="mt-1">
                      <Badge variant="success">Ativo</Badge>
                    </div>
                  </div>
                </div>
                <p className="mt-3 truncate text-xs text-muted-foreground">
                  ID {documentToDelete.id}
                </p>
              </div>
            )}

            <Alert variant="destructive">
              <AlertDescription>
                Essa ação preserva a auditoria, mas retira o documento da lista ativa exibida para o colaborador.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="mt-0 border-t border-border bg-muted/20 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => setDocumentToDelete(null)}
              disabled={!!deletingId}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={!!deletingId}
            >
              {deletingId && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Excluir documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4 p-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/colaboradores')}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Voltar
        </Button>

        {employeeQuery.isLoading && (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando colaborador...
            </CardContent>
          </Card>
        )}

        {employeeQuery.isError && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-destructive">
              Não foi possível carregar o colaborador.
            </CardContent>
          </Card>
        )}

        {employee && (
          <>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4 text-primary" />
                    {employee.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
                  <Info label="CPF" value={formatCpf(employee.cpf)} />
                  <Info label="Matrícula" value={employee.registration ?? '—'} />
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant={employee.isActive ? 'success' : 'secondary'}>
                      {employee.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <Info label="Empresa" value={company?.tradeName ?? company?.name ?? '—'} />
                  <Info label="Unidade" value={unit?.name ?? '—'} />
                  <Info label="Admissão" value={formatDate(employee.admissionDate)} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Função
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Info label="Nome" value={jobFunction?.name ?? '—'} />
                  <Info label="CBO" value={jobFunction?.cbo ?? '—'} />
                  <div>
                    <p className="text-xs text-muted-foreground">Templates ativos</p>
                    <p className="font-medium">{activeTemplates.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {canGenerate && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wand2 className="h-4 w-4 text-primary" />
                    Emitir documentos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Template</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Tipo</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Versão</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Variáveis</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {loadingTemplates && (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                              Carregando templates...
                            </td>
                          </tr>
                        )}
                        {!loadingTemplates && activeTemplates.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                              Nenhum template ativo para esta função
                            </td>
                          </tr>
                        )}
                        {activeTemplates.map((template) => (
                          <tr key={template.id} className="border-b border-border last:border-0">
                            <td className="px-4 py-3">
                              <p className="font-medium">{template.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Enviado em {new Date(template.createdAt).toLocaleDateString('pt-BR')}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {DOCUMENT_TYPE_LABELS[template.documentType] ?? template.documentType}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">v{template.version}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{template.variables.length}</td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                size="sm"
                                onClick={() => handleGenerate(template)}
                                disabled={generatingTemplateId === template.id}
                              >
                                {generatingTemplateId === template.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Gerar
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-primary" />
                  Histórico de documentos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Documento</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Emitido em</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Status</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {documentsQuery.isLoading && (
                        <tr>
                          <td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                            Carregando histórico...
                          </td>
                        </tr>
                      )}
                      {!documentsQuery.isLoading && documents.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                            Nenhum documento emitido para este colaborador
                          </td>
                        </tr>
                      )}
                      {documents.map((document) => (
                        <tr key={document.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3">
                            <p className="font-medium">
                              {DOCUMENT_TYPE_LABELS[document.documentType] ?? document.documentType}
                            </p>
                            <p className="text-xs text-muted-foreground">ID {document.id}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {new Date(document.generatedAt).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={document.status === 'ACTIVE' ? 'success' : 'secondary'}>
                              {document.status === 'ACTIVE' ? 'Ativo' : 'Excluído'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {canDownloadPdf && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 gap-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
                                  onClick={() => handleDownload(document, 'pdf')}
                                  disabled={downloadingKey === `${document.id}:pdf`}
                                  title="Baixar PDF"
                                >
                                  {downloadingKey === `${document.id}:pdf`
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Download className="h-3.5 w-3.5" />}
                                  PDF
                                </Button>
                              )}
                              {canDownloadWord && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
                                  onClick={() => handleDownload(document, 'docx')}
                                  disabled={downloadingKey === `${document.id}:docx`}
                                  title="Baixar Word"
                                >
                                  {downloadingKey === `${document.id}:docx`
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Download className="h-3.5 w-3.5" />}
                                  Word
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => setDocumentToDelete(document)}
                                  disabled={deletingId === document.id}
                                  title="Excluir"
                                >
                                  {deletingId === document.id
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  )
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}
