'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Download, FileText, Loader2, Plus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { Topbar } from '@/components/layout/topbar'
import { useCompanies } from '@/hooks/use-companies'
import { useUnits } from '@/hooks/use-units'
import {
  useDownloadSstLegalDocument,
  useEmitSstLegalDocument,
  useSstLegalDocuments,
} from '@/hooks/use-sst-legal-documents'
import type {
  SstLegalDocument,
  SstLegalDocumentStatus,
  SstLegalDocumentType,
} from '@/lib/api/sst-legal-documents.api'

const DOCUMENT_TYPE_LABELS: Record<SstLegalDocumentType, string> = {
  PGR: 'PGR',
  PCMSO: 'PCMSO',
  LTCAT: 'LTCAT',
  LIP: 'LIP',
}

const DOCUMENT_TYPE_DESCRIPTIONS: Record<SstLegalDocumentType, string> = {
  PGR: 'Programa de Gerenciamento de Riscos',
  PCMSO: 'Programa de Controle Médico de Saúde Ocupacional',
  LTCAT: 'Laudo Técnico das Condições Ambientais do Trabalho',
  LIP: 'Laudo de Insalubridade e Periculosidade',
}

const STATUS_LABELS: Record<SstLegalDocumentStatus, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativo',
  SUPERSEDED: 'Substituído',
  ARCHIVED: 'Arquivado',
}

const emitSchema = z.object({
  companyId: z.string().uuid('Selecione a empresa'),
  unitId: z.string().optional(),
  documentType: z.enum(['PGR', 'PCMSO', 'LTCAT', 'LIP']),
  title: z.string().optional(),
  summary: z.string().optional(),
  effectiveFrom: z.string().optional(),
  effectiveUntil: z.string().optional(),
})

type EmitFormData = z.infer<typeof emitSchema>

export default function DocumentosPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | SstLegalDocumentType>('ALL')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data: documentsData, isLoading } = useSstLegalDocuments({
    page: 1,
    perPage: 100,
    search: search || undefined,
    documentType: typeFilter === 'ALL' ? undefined : typeFilter,
  })
  const { data: companiesData } = useCompanies({ page: 1, perPage: 100 })
  const emitDocument = useEmitSstLegalDocument()
  const downloadDocument = useDownloadSstLegalDocument()

  const documents = documentsData?.data ?? []
  const companies = companiesData?.data ?? []
  const activeDocuments = documents.filter((document) => document.status === 'ACTIVE').length
  const supersededDocuments = documents.filter((document) => document.status === 'SUPERSEDED').length

  const form = useForm<EmitFormData>({
    resolver: zodResolver(emitSchema),
    defaultValues: {
      companyId: '',
      unitId: '',
      documentType: 'PGR',
      title: '',
      summary: '',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveUntil: '',
    },
  })

  const selectedCompanyId = form.watch('companyId')
  const selectedDocumentType = form.watch('documentType')
  const { data: unitsData } = useUnits({
    page: 1,
    perPage: 100,
    companyId: selectedCompanyId || undefined,
  })

  const units = unitsData?.data ?? []
  const latestByType = useMemo(() => {
    const map = new Map<SstLegalDocumentType, SstLegalDocument | undefined>()
    for (const type of Object.keys(DOCUMENT_TYPE_LABELS) as SstLegalDocumentType[]) {
      map.set(type, documents.find((document) => document.documentType === type && document.status === 'ACTIVE'))
    }
    return map
  }, [documents])

  function openDialog(type?: SstLegalDocumentType) {
    form.reset({
      companyId: companies[0]?.id ?? '',
      unitId: '',
      documentType: type ?? 'PGR',
      title: '',
      summary: '',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveUntil: '',
    })
    setIsDialogOpen(true)
  }

  async function emit(values: EmitFormData) {
    await emitDocument.mutateAsync({
      companyId: values.companyId,
      unitId: values.unitId || undefined,
      documentType: values.documentType,
      title: values.title || undefined,
      summary: values.summary || undefined,
      effectiveFrom: values.effectiveFrom || undefined,
      effectiveUntil: values.effectiveUntil || undefined,
    })
    setIsDialogOpen(false)
  }

  const selectClass = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50'
  const isSaving = emitDocument.isPending

  return (
    <>
      <Topbar title="Documentos SST" subtitle="PGR, PCMSO, LTCAT e LIP emitidos e versionados" />
      <div className="space-y-5 p-6">
        <div className="grid gap-3 md:grid-cols-4">
          {(Object.keys(DOCUMENT_TYPE_LABELS) as SstLegalDocumentType[]).map((type) => {
            const latest = latestByType.get(type)
            return (
              <Card key={type}>
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm font-semibold">{DOCUMENT_TYPE_LABELS[type]}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{DOCUMENT_TYPE_DESCRIPTIONS[type]}</p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {latest ? `Ativo v${latest.version}` : 'Sem emissão ativa'}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openDialog(type)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <SummaryCard label="Documentos emitidos" value={documentsData?.meta.total ?? 0} />
          <SummaryCard label="Versões ativas" value={activeDocuments} />
          <SummaryCard label="Versões substituídas" value={supersededDocuments} />
        </div>

        <div className="flex flex-col gap-3 rounded-md border bg-card p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative md:w-96">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título, empresa ou unidade..." className="pl-9" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'ALL' | SstLegalDocumentType)} className={selectClass}>
              <option value="ALL">Todos os tipos</option>
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Emitir documento
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length === 0 ? (
              <div className="flex h-44 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <FileText className="h-8 w-8" />
                <p className="text-sm">Nenhum documento legal emitido.</p>
              </div>
            ) : (
              <div className="divide-y">
                {documents.map((document) => (
                  <div key={document.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_150px_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{document.title}</p>
                        <Badge variant={document.status === 'ACTIVE' ? 'success' : document.status === 'SUPERSEDED' ? 'muted' : 'outline'}>
                          {STATUS_LABELS[document.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {DOCUMENT_TYPE_LABELS[document.documentType]} · versão {document.version}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>{document.companyName ?? 'Empresa'}</p>
                      <p>{document.unitName ?? 'Empresa completa'}</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">{formatDate(document.generatedAt)}</p>
                      <p className="text-muted-foreground">{document.generatorName ?? 'MOBY'}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadDocument.mutate(document)}
                      disabled={downloadDocument.isPending}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      HTML
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Emitir documento legal SST</DialogTitle>
            <DialogDescription>
              A emissão cria uma nova versão imutável e substitui a versão ativa anterior do mesmo tipo e escopo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(emit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Empresa</Label>
                <select className={selectClass} {...form.register('companyId')}>
                  <option value="">Selecione</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.tradeName ?? company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <select className={selectClass} {...form.register('unitId')} disabled={!selectedCompanyId}>
                  <option value="">Empresa completa</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Tipo documental</Label>
                <select className={selectClass} {...form.register('documentType')}>
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">{DOCUMENT_TYPE_DESCRIPTIONS[selectedDocumentType]}</p>
              </div>
              <div className="space-y-2">
                <Label>Título</Label>
                <Input {...form.register('title')} placeholder="Opcional, gerado automaticamente se vazio" />
              </div>
              <div className="space-y-2">
                <Label>Início da vigência</Label>
                <Input type="date" {...form.register('effectiveFrom')} />
              </div>
              <div className="space-y-2">
                <Label>Fim da vigência</Label>
                <Input type="date" {...form.register('effectiveUntil')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Resumo técnico</Label>
              <Textarea {...form.register('summary')} placeholder="Contexto, premissas, responsável técnico ou observações da emissão" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Emitir versão
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <FileText className="h-5 w-5 text-primary" />
        <div>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value))
}
