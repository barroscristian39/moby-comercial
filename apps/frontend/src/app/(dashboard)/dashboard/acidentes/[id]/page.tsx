'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Printer,
  Save,
  SearchCheck,
  Trash2,
  Wand2,
} from 'lucide-react'
import { AccidentSeverity, AccidentStatus, AccidentType, Permission, Role } from '@moby/shared'

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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAccident, useAccidentConclusionReport, useUpdateAccident } from '@/hooks/use-accidents'
import {
  useAccidentGeneratedDocuments,
  useAccidentTemplates,
  useDeleteAccidentGeneratedDocument,
  useDownloadAccidentGeneratedDocument,
  useGenerateAccidentDocument,
} from '@/hooks/use-accident-documents'
import type {
  AccidentGeneratedDocument,
  AccidentGeneratedDocumentDownloadFormat,
  AccidentTemplate,
} from '@/lib/api/accident-documents.api'
import { ACCIDENT_DOCUMENT_TYPE_LABELS } from '@/lib/accident-document-constants'
import { useAuthStore } from '@/store/auth.store'

const ACCIDENT_STATUS_LABELS: Record<AccidentStatus, string> = {
  REPORTED: 'Registrado',
  UNDER_INVESTIGATION: 'Em investigação',
  ACTION_PLAN_DEFINED: 'Plano de ação',
  CLOSED: 'Encerrado',
}

const ACCIDENT_STATUS_BADGES: Record<AccidentStatus, 'warning' | 'default' | 'secondary' | 'success'> = {
  REPORTED: 'warning',
  UNDER_INVESTIGATION: 'default',
  ACTION_PLAN_DEFINED: 'secondary',
  CLOSED: 'success',
}

const ACCIDENT_SEVERITY_LABELS: Record<AccidentSeverity, string> = {
  MINOR: 'Leve',
  MODERATE: 'Moderado',
  SERIOUS: 'Grave',
  FATAL: 'Fatal',
}

const ACCIDENT_SEVERITY_BADGES: Record<AccidentSeverity, 'muted' | 'warning' | 'destructive'> = {
  MINOR: 'muted',
  MODERATE: 'warning',
  SERIOUS: 'destructive',
  FATAL: 'destructive',
}

const ACCIDENT_TYPE_LABELS: Record<AccidentType, string> = {
  TYPICAL: 'Típico',
  COMMUTE: 'Trajeto',
  OCCUPATIONAL_DISEASE: 'Doença ocupacional',
  NEAR_MISS: 'Quase acidente',
}

const GENERATOR_ROLES = new Set<string>([Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.TECNICO_SST])
const ADMIN_ROLES = new Set<string>([Role.SUPER_ADMIN, Role.TENANT_ADMIN])

const accidentDetailSchema = z.object({
  occurredAt: z.string().min(1, 'Informe a data e hora do acidente'),
  reportedAt: z.string().min(1, 'Informe a data e hora do registro'),
  location: z.string().trim().min(3, 'Informe o local'),
  accidentType: z.nativeEnum(AccidentType),
  severity: z.nativeEnum(AccidentSeverity),
  status: z.nativeEnum(AccidentStatus),
  description: z.string().trim().min(10, 'Descrição obrigatória'),
  injuredBodyPart: z.string().optional(),
  medicalCareProvided: z.boolean().default(false),
  leaveRequired: z.boolean().default(false),
  leaveDays: z.coerce.number().int().min(0).default(0),
  catIssued: z.boolean().default(false),
  catNumber: z.string().optional(),
  witnesses: z.string().optional(),
  immediateActions: z.string().optional(),
  investigatorName: z.string().optional(),
  investigationStartedAt: z.string().optional(),
  immediateCause: z.string().optional(),
  rootCause: z.string().optional(),
  contributingFactors: z.string().optional(),
  correctiveActions: z.string().optional(),
  preventiveMeasures: z.string().optional(),
  managerNotes: z.string().optional(),
  recommendations: z.string().optional(),
  conclusionSummary: z.string().optional(),
  closureDate: z.string().optional(),
})

type AccidentDetailForm = z.infer<typeof accidentDetailSchema>

function toDateTimeLocal(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR')
}

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

function normalizeNullableText(value?: string) {
  const normalized = value?.trim() ?? ''
  return normalized ? normalized : null
}

function normalizeNullableDateTime(value?: string) {
  const normalized = value?.trim() ?? ''
  return normalized ? normalized : null
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export default function AcidenteDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const accidentId = String(params.id ?? '')
  const user = useAuthStore((state) => state.user)
  const accessContext = useAuthStore((state) => state.accessContext)
  const permissions = new Set(accessContext?.available_permissions ?? [])
  const canGenerate = !!user?.role && GENERATOR_ROLES.has(user.role)
  const canDelete = !!user?.role && ADMIN_ROLES.has(user.role)
  const canDownloadPdf = permissions.has(Permission.DOCUMENTS_READ) || canGenerate || canDelete
  const canDownloadWord = canGenerate

  const accidentQuery = useAccident(accidentId)
  const reportQuery = useAccidentConclusionReport(accidentId)
  const updateAccident = useUpdateAccident()
  const templatesQuery = useAccidentTemplates(accidentQuery.data?.companyId)
  const generatedDocumentsQuery = useAccidentGeneratedDocuments(accidentId)
  const generateDocument = useGenerateAccidentDocument()
  const downloadDocument = useDownloadAccidentGeneratedDocument()
  const deleteDocument = useDeleteAccidentGeneratedDocument(accidentId)
  const [generatingTemplateId, setGeneratingTemplateId] = useState<string | null>(null)
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [documentToDelete, setDocumentToDelete] = useState<AccidentGeneratedDocument | null>(null)

  const form = useForm<AccidentDetailForm>({
    resolver: zodResolver(accidentDetailSchema),
    defaultValues: {
      occurredAt: '',
      reportedAt: '',
      location: '',
      accidentType: AccidentType.TYPICAL,
      severity: AccidentSeverity.MODERATE,
      status: AccidentStatus.REPORTED,
      description: '',
      injuredBodyPart: '',
      medicalCareProvided: false,
      leaveRequired: false,
      leaveDays: 0,
      catIssued: false,
      catNumber: '',
      witnesses: '',
      immediateActions: '',
      investigatorName: '',
      investigationStartedAt: '',
      immediateCause: '',
      rootCause: '',
      contributingFactors: '',
      correctiveActions: '',
      preventiveMeasures: '',
      managerNotes: '',
      recommendations: '',
      conclusionSummary: '',
      closureDate: '',
    },
  })

  useEffect(() => {
    const accident = accidentQuery.data
    if (!accident) return

    form.reset({
      occurredAt: toDateTimeLocal(accident.occurredAt),
      reportedAt: toDateTimeLocal(accident.reportedAt),
      location: accident.location,
      accidentType: accident.accidentType,
      severity: accident.severity,
      status: accident.status,
      description: accident.description,
      injuredBodyPart: accident.injuredBodyPart ?? '',
      medicalCareProvided: accident.medicalCareProvided,
      leaveRequired: accident.leaveRequired,
      leaveDays: accident.leaveDays,
      catIssued: accident.catIssued,
      catNumber: accident.catNumber ?? '',
      witnesses: accident.witnesses ?? '',
      immediateActions: accident.immediateActions ?? '',
      investigatorName: accident.investigatorName ?? '',
      investigationStartedAt: toDateTimeLocal(accident.investigationStartedAt),
      immediateCause: accident.immediateCause ?? '',
      rootCause: accident.rootCause ?? '',
      contributingFactors: accident.contributingFactors ?? '',
      correctiveActions: accident.correctiveActions ?? '',
      preventiveMeasures: accident.preventiveMeasures ?? '',
      managerNotes: accident.managerNotes ?? '',
      recommendations: accident.recommendations ?? '',
      conclusionSummary: accident.conclusionSummary ?? '',
      closureDate: toDateTimeLocal(accident.closureDate),
    })
  }, [accidentQuery.data, form])

  const leaveRequired = form.watch('leaveRequired')
  const catIssued = form.watch('catIssued')
  const selectedStatus = form.watch('status')

  async function handleSave(values: AccidentDetailForm) {
    if (!accidentId) return

    await updateAccident.mutateAsync({
      id: accidentId,
      occurredAt: values.occurredAt,
      reportedAt: values.reportedAt,
      location: values.location,
      accidentType: values.accidentType,
      severity: values.severity,
      status: values.status,
      description: values.description,
      injuredBodyPart: normalizeNullableText(values.injuredBodyPart),
      medicalCareProvided: values.medicalCareProvided,
      leaveRequired: values.leaveRequired,
      leaveDays: values.leaveRequired ? values.leaveDays : 0,
      catIssued: values.catIssued,
      catNumber: values.catIssued ? normalizeNullableText(values.catNumber) : null,
      witnesses: normalizeNullableText(values.witnesses),
      immediateActions: normalizeNullableText(values.immediateActions),
      investigatorName: normalizeNullableText(values.investigatorName),
      investigationStartedAt: normalizeNullableDateTime(values.investigationStartedAt),
      immediateCause: normalizeNullableText(values.immediateCause),
      rootCause: normalizeNullableText(values.rootCause),
      contributingFactors: normalizeNullableText(values.contributingFactors),
      correctiveActions: normalizeNullableText(values.correctiveActions),
      preventiveMeasures: normalizeNullableText(values.preventiveMeasures),
      managerNotes: normalizeNullableText(values.managerNotes),
      recommendations: normalizeNullableText(values.recommendations),
      conclusionSummary: normalizeNullableText(values.conclusionSummary),
      closureDate: values.status === AccidentStatus.CLOSED
        ? normalizeNullableDateTime(values.closureDate)
        : null,
    })
  }

  function printReport() {
    const report = reportQuery.data
    if (!report) return

    const popup = window.open('', '_blank', 'width=960,height=720')
    if (!popup) return

    const narrative = report.narrative.map((line) => `<p>${escapeHtml(line)}</p>`).join('')

    popup.document.write(`
      <html>
        <head>
          <title>Relatório de conclusão - ${escapeHtml(report.code)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
            h1, h2 { margin-bottom: 8px; }
            h1 { font-size: 22px; }
            h2 { font-size: 16px; margin-top: 28px; }
            p, li { line-height: 1.55; font-size: 13px; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
            .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin-top: 16px; }
            .muted { color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Relatório de Conclusão do Acidente</h1>
          <p class="muted">Código ${escapeHtml(report.code)} · Gerado em ${escapeHtml(formatDateTime(report.generatedAt))}</p>

          <div class="card">
            <div class="grid">
              <div><strong>Empresa:</strong> ${escapeHtml(report.header.companyName)}</div>
              <div><strong>Unidade:</strong> ${escapeHtml(report.header.unitName)}</div>
              <div><strong>Colaborador:</strong> ${escapeHtml(report.header.employeeName)}</div>
              <div><strong>CPF:</strong> ${escapeHtml(report.header.employeeCpf ?? '—')}</div>
              <div><strong>Matrícula:</strong> ${escapeHtml(report.header.employeeRegistration ?? '—')}</div>
              <div><strong>Função:</strong> ${escapeHtml(report.header.jobFunctionName ?? '—')}</div>
            </div>
          </div>

          <h2>Ocorrência</h2>
          <div class="card">
            <p><strong>Data/hora:</strong> ${escapeHtml(formatDateTime(report.occurrence.occurredAt))}</p>
            <p><strong>Local:</strong> ${escapeHtml(report.occurrence.location)}</p>
            <p><strong>Tipo:</strong> ${escapeHtml(report.occurrence.accidentTypeLabel)}</p>
            <p><strong>Gravidade:</strong> ${escapeHtml(report.occurrence.severityLabel)}</p>
            <p><strong>Descrição:</strong> ${escapeHtml(report.occurrence.description)}</p>
          </div>

          <h2>Investigação</h2>
          <div class="card">
            <p><strong>Investigador:</strong> ${escapeHtml(report.investigation.investigatorName ?? '—')}</p>
            <p><strong>Causa imediata:</strong> ${escapeHtml(report.investigation.immediateCause ?? '—')}</p>
            <p><strong>Causa raiz:</strong> ${escapeHtml(report.investigation.rootCause ?? '—')}</p>
            <p><strong>Ações corretivas:</strong> ${escapeHtml(report.investigation.correctiveActions ?? '—')}</p>
            <p><strong>Medidas preventivas:</strong> ${escapeHtml(report.investigation.preventiveMeasures ?? '—')}</p>
            <p><strong>Recomendações:</strong> ${escapeHtml(report.investigation.recommendations ?? '—')}</p>
          </div>

          <h2>Conclusão</h2>
          <div class="card">
            <p><strong>Status:</strong> ${escapeHtml(report.conclusion.statusLabel)}</p>
            <p><strong>Encerramento:</strong> ${escapeHtml(formatDateTime(report.conclusion.closureDate))}</p>
            <p><strong>Resumo:</strong> ${escapeHtml(report.conclusion.summary ?? '—')}</p>
          </div>

          <h2>Narrativa consolidada</h2>
          <div class="card">${narrative}</div>
        </body>
      </html>
    `)

    popup.document.close()
    popup.focus()
    popup.print()
  }

  const accident = accidentQuery.data
  const activeTemplates = (templatesQuery.data ?? []).filter((template) => template.isActive)
  const generatedDocuments = generatedDocumentsQuery.data ?? []

  async function handleGenerateDocument(template: AccidentTemplate) {
    if (!accident) return

    setGeneratingTemplateId(template.id)
    try {
      await generateDocument.mutateAsync({
        accidentId: accident.id,
        documentType: template.documentType,
        templateId: template.id,
      })
      await generatedDocumentsQuery.refetch()
    } finally {
      setGeneratingTemplateId(null)
    }
  }

  async function handleDownloadDocument(
    document: AccidentGeneratedDocument,
    format: AccidentGeneratedDocumentDownloadFormat,
  ) {
    const key = `${document.id}:${format}`
    setDownloadingKey(key)
    try {
      await downloadDocument.mutateAsync({ document, format })
    } finally {
      setDownloadingKey(null)
    }
  }

  async function handleDeleteDocumentConfirm() {
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
      <Topbar
        title={accident ? `Acidente ${accident.code}` : 'Gestão do acidente'}
        subtitle={accident?.employeeName ?? 'Registro, investigação e conclusão'}
      />

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
                  <DialogTitle>Excluir documento do acidente?</DialogTitle>
                  <DialogDescription>
                    O arquivo sai do histórico ativo, mas a auditoria da geração é preservada.
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
                  {ACCIDENT_DOCUMENT_TYPE_LABELS[documentToDelete.documentType] ?? documentToDelete.documentType}
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
                <p className="mt-3 truncate text-xs text-muted-foreground">ID {documentToDelete.id}</p>
              </div>
            )}

            <Alert variant="destructive">
              <AlertDescription>
                Use essa ação apenas quando o arquivo precisar ser removido do histórico operacional do acidente.
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
              onClick={handleDeleteDocumentConfirm}
              disabled={!!deletingId}
            >
              {deletingId && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Excluir documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4 p-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/acidentes')}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Voltar para acidentes
        </Button>

        {accidentQuery.isLoading && (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando acidente...
            </CardContent>
          </Card>
        )}

        {accidentQuery.isError && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-destructive">
              Não foi possível carregar os dados do acidente.
            </CardContent>
          </Card>
        )}

        {accident && (
          <>
            <div className="grid gap-4 lg:grid-cols-4">
              <InfoCard title="Status" value={ACCIDENT_STATUS_LABELS[accident.status]}>
                <Badge variant={ACCIDENT_STATUS_BADGES[accident.status]}>
                  {ACCIDENT_STATUS_LABELS[accident.status]}
                </Badge>
              </InfoCard>
              <InfoCard title="Gravidade" value={ACCIDENT_SEVERITY_LABELS[accident.severity]}>
                <Badge variant={ACCIDENT_SEVERITY_BADGES[accident.severity]}>
                  {ACCIDENT_SEVERITY_LABELS[accident.severity]}
                </Badge>
              </InfoCard>
              <InfoCard title="Colaborador" value={accident.employeeName}>
                <p className="text-xs text-muted-foreground">{formatCpf(accident.employeeCpf)}</p>
              </InfoCard>
              <InfoCard title="Unidade" value={accident.unitName}>
                <p className="text-xs text-muted-foreground">{accident.companyName ?? '—'}</p>
              </InfoCard>
            </div>

            <form className="space-y-4" onSubmit={form.handleSubmit(handleSave)}>
              <Tabs defaultValue="registro" className="w-full">
                <TabsList>
                  <TabsTrigger value="registro">Registro</TabsTrigger>
                  <TabsTrigger value="investigacao">Investigação</TabsTrigger>
                  <TabsTrigger value="relatorio">Relatório</TabsTrigger>
                </TabsList>

                <TabsContent value="registro" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <AlertTriangle className="h-4 w-4 text-primary" />
                        Dados do registro
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <Field>
                          <Label htmlFor="occurredAt">Data e hora do acidente</Label>
                          <Input id="occurredAt" type="datetime-local" {...form.register('occurredAt')} />
                        </Field>
                        <Field>
                          <Label htmlFor="reportedAt">Data e hora do registro</Label>
                          <Input id="reportedAt" type="datetime-local" {...form.register('reportedAt')} />
                        </Field>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <Field className="md:col-span-2">
                          <Label htmlFor="location">Local</Label>
                          <Input id="location" {...form.register('location')} />
                        </Field>
                        <Field>
                          <Label htmlFor="injuredBodyPart">Parte atingida</Label>
                          <Input id="injuredBodyPart" {...form.register('injuredBodyPart')} />
                        </Field>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <Field>
                          <Label htmlFor="accidentType">Tipo</Label>
                          <select
                            id="accidentType"
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            {...form.register('accidentType')}
                          >
                            {Object.values(AccidentType).map((type) => (
                              <option key={type} value={type}>{ACCIDENT_TYPE_LABELS[type]}</option>
                            ))}
                          </select>
                        </Field>
                        <Field>
                          <Label htmlFor="severity">Gravidade</Label>
                          <select
                            id="severity"
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            {...form.register('severity')}
                          >
                            {Object.values(AccidentSeverity).map((severity) => (
                              <option key={severity} value={severity}>{ACCIDENT_SEVERITY_LABELS[severity]}</option>
                            ))}
                          </select>
                        </Field>
                        <Field>
                          <Label htmlFor="status">Status</Label>
                          <select
                            id="status"
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            {...form.register('status')}
                          >
                            {Object.values(AccidentStatus).map((status) => (
                              <option key={status} value={status}>{ACCIDENT_STATUS_LABELS[status]}</option>
                            ))}
                          </select>
                        </Field>
                      </div>

                      <Field>
                        <Label htmlFor="description">Descrição do acidente</Label>
                        <Textarea id="description" {...form.register('description')} />
                      </Field>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
                          <input type="checkbox" {...form.register('medicalCareProvided')} />
                          Houve atendimento médico
                        </label>
                        <label className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
                          <input type="checkbox" {...form.register('catIssued')} />
                          CAT emitida
                        </label>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
                          <input type="checkbox" {...form.register('leaveRequired')} />
                          Houve afastamento
                        </label>
                        <Field>
                          <Label htmlFor="leaveDays">Dias de afastamento</Label>
                          <Input
                            id="leaveDays"
                            type="number"
                            min={0}
                            disabled={!leaveRequired}
                            {...form.register('leaveDays', { valueAsNumber: true })}
                          />
                        </Field>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <Field>
                          <Label htmlFor="catNumber">Número CAT</Label>
                          <Input id="catNumber" disabled={!catIssued} {...form.register('catNumber')} />
                        </Field>
                        <Field>
                          <Label htmlFor="closureDate">Data de encerramento</Label>
                          <Input
                            id="closureDate"
                            type="datetime-local"
                            disabled={selectedStatus !== AccidentStatus.CLOSED}
                            {...form.register('closureDate')}
                          />
                        </Field>
                      </div>

                      <Field>
                        <Label htmlFor="immediateActions">Ações imediatas</Label>
                        <Textarea id="immediateActions" {...form.register('immediateActions')} />
                      </Field>

                      <div className="flex justify-end">
                        <Button type="submit" disabled={updateAccident.isPending}>
                          {updateAccident.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                          <Save className="mr-1.5 h-3.5 w-3.5" />
                          Salvar registro
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="investigacao" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <SearchCheck className="h-4 w-4 text-primary" />
                        Apuração e medidas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <Field>
                          <Label htmlFor="investigatorName">Responsável pela investigação</Label>
                          <Input id="investigatorName" {...form.register('investigatorName')} />
                        </Field>
                        <Field>
                          <Label htmlFor="investigationStartedAt">Início da investigação</Label>
                          <Input id="investigationStartedAt" type="datetime-local" {...form.register('investigationStartedAt')} />
                        </Field>
                      </div>

                      <Field>
                        <Label htmlFor="witnesses">Testemunhas</Label>
                        <Textarea id="witnesses" {...form.register('witnesses')} />
                      </Field>

                      <div className="grid gap-3 md:grid-cols-2">
                        <Field>
                          <Label htmlFor="immediateCause">Causa imediata</Label>
                          <Textarea id="immediateCause" {...form.register('immediateCause')} />
                        </Field>
                        <Field>
                          <Label htmlFor="rootCause">Causa raiz</Label>
                          <Textarea id="rootCause" {...form.register('rootCause')} />
                        </Field>
                      </div>

                      <Field>
                        <Label htmlFor="contributingFactors">Fatores contribuintes</Label>
                        <Textarea id="contributingFactors" {...form.register('contributingFactors')} />
                      </Field>

                      <div className="grid gap-3 md:grid-cols-2">
                        <Field>
                          <Label htmlFor="correctiveActions">Ações corretivas</Label>
                          <Textarea id="correctiveActions" {...form.register('correctiveActions')} />
                        </Field>
                        <Field>
                          <Label htmlFor="preventiveMeasures">Medidas preventivas</Label>
                          <Textarea id="preventiveMeasures" {...form.register('preventiveMeasures')} />
                        </Field>
                      </div>

                      <Field>
                        <Label htmlFor="managerNotes">Notas de gestão</Label>
                        <Textarea id="managerNotes" {...form.register('managerNotes')} />
                      </Field>

                      <Field>
                        <Label htmlFor="recommendations">Recomendações finais</Label>
                        <Textarea id="recommendations" {...form.register('recommendations')} />
                      </Field>

                      <Field>
                        <Label htmlFor="conclusionSummary">Conclusão do acidente</Label>
                        <Textarea id="conclusionSummary" {...form.register('conclusionSummary')} />
                      </Field>

                      <div className="flex justify-end">
                        <Button type="submit" disabled={updateAccident.isPending}>
                          {updateAccident.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                          <Save className="mr-1.5 h-3.5 w-3.5" />
                          Salvar investigação
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="relatorio" className="space-y-4">
                  {canGenerate && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Wand2 className="h-4 w-4 text-primary" />
                          Gerar documentos do acidente
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
                              {templatesQuery.isLoading && (
                                <tr>
                                  <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                                    Carregando templates ativos...
                                  </td>
                                </tr>
                              )}
                              {!templatesQuery.isLoading && activeTemplates.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                                    Nenhum template ativo encontrado para a empresa deste acidente.
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
                                    {ACCIDENT_DOCUMENT_TYPE_LABELS[template.documentType] ?? template.documentType}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-muted-foreground">v{template.version}</td>
                                  <td className="px-4 py-3 text-xs text-muted-foreground">{template.variables.length}</td>
                                  <td className="px-4 py-3 text-right">
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handleGenerateDocument(template)}
                                      disabled={generatingTemplateId === template.id}
                                    >
                                      {generatingTemplateId === template.id && (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      )}
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
                        Histórico de documentos gerados
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
                            {generatedDocumentsQuery.isLoading && (
                              <tr>
                                <td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                                  Carregando histórico...
                                </td>
                              </tr>
                            )}
                            {!generatedDocumentsQuery.isLoading && generatedDocuments.length === 0 && (
                              <tr>
                                <td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                                  Nenhum documento foi gerado para este acidente.
                                </td>
                              </tr>
                            )}
                            {generatedDocuments.map((document) => (
                              <tr key={document.id} className="border-b border-border last:border-0">
                                <td className="px-4 py-3">
                                  <p className="font-medium">
                                    {ACCIDENT_DOCUMENT_TYPE_LABELS[document.documentType] ?? document.documentType}
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
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 gap-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
                                        onClick={() => handleDownloadDocument(document, 'pdf')}
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
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 gap-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
                                        onClick={() => handleDownloadDocument(document, 'docx')}
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
                                        type="button"
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

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileText className="h-4 w-4 text-primary" />
                        Relatório de conclusão
                      </CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={printReport}
                        disabled={!reportQuery.data}
                      >
                        <Printer className="mr-1.5 h-3.5 w-3.5" />
                        Imprimir
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {reportQuery.isLoading && (
                        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Gerando relatório...
                        </div>
                      )}

                      {reportQuery.data && (
                        <>
                          <div className="grid gap-4 rounded-2xl border border-border bg-muted/20 p-4 md:grid-cols-2">
                            <DetailItem label="Empresa" value={reportQuery.data.header.companyName} />
                            <DetailItem label="Unidade" value={reportQuery.data.header.unitName} />
                            <DetailItem label="Colaborador" value={reportQuery.data.header.employeeName} />
                            <DetailItem label="Função" value={reportQuery.data.header.jobFunctionName ?? '—'} />
                            <DetailItem label="Data da ocorrência" value={formatDateTime(reportQuery.data.occurrence.occurredAt)} />
                            <DetailItem label="Data do relatório" value={formatDateTime(reportQuery.data.generatedAt)} />
                          </div>

                          <div className="space-y-3">
                            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                              Narrativa consolidada
                            </h3>
                            <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
                              {reportQuery.data.narrative.map((paragraph, index) => (
                                <p key={index} className="text-sm leading-6 text-foreground">
                                  {paragraph}
                                </p>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </form>
          </>
        )}
      </div>
    </>
  )
}

function Field({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={className ? `space-y-1.5 ${className}` : 'space-y-1.5'}>{children}</div>
}

function InfoCard({
  title,
  value,
  children,
}: {
  title: string
  value: string
  children?: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
        <p className="text-base font-semibold text-foreground">{value}</p>
        {children}
      </CardContent>
    </Card>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
