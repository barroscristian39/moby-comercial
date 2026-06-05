'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CalendarClock,
  FileSearch,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import {
  AccidentSeverity,
  AccidentStatus,
  Permission,
  Role,
} from '@moby/shared'

import { CreateAccidentQiatDialog } from '@/components/accidents/create-accident-qiat-dialog'
import { Topbar } from '@/components/layout/topbar'
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
import { useAccidentTemplates, useDeleteAccidentTemplate, useUpdateAccidentTemplate, useUploadAccidentTemplate } from '@/hooks/use-accident-documents'
import { useAccidents } from '@/hooks/use-accidents'
import { useCompanies } from '@/hooks/use-companies'
import { useUnits } from '@/hooks/use-units'
import type { AccidentTemplate } from '@/lib/api/accident-documents.api'
import { ACCIDENT_DOCUMENT_TYPE_LABELS, ACCIDENT_DOCUMENT_TYPES, ACCIDENT_TEMPLATE_VARIABLES } from '@/lib/accident-document-constants'
import { ACCIDENT_SEVERITY_LABELS, ACCIDENT_STATUS_LABELS, ACCIDENT_TYPE_LABELS, formatCpf } from '@/lib/accident-qiat'
import { useAuthStore } from '@/store/auth.store'
import { useCompanyStore } from '@/store/company.store'

const ACCIDENT_STATUS_BADGES: Record<AccidentStatus, 'warning' | 'default' | 'secondary' | 'success'> = {
  REPORTED: 'warning',
  UNDER_INVESTIGATION: 'default',
  ACTION_PLAN_DEFINED: 'secondary',
  CLOSED: 'success',
}

const ACCIDENT_SEVERITY_BADGES: Record<AccidentSeverity, 'muted' | 'warning' | 'destructive'> = {
  MINOR: 'muted',
  MODERATE: 'warning',
  SERIOUS: 'destructive',
  FATAL: 'destructive',
}

export default function AcidentesPage() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const accessContext = useAuthStore((state) => state.accessContext)
  const activeCompany = useCompanyStore((state) => state.activeCompany)
  const [search, setSearch] = useState('')
  const [companyFilterId, setCompanyFilterId] = useState('')
  const [statusFilter, setStatusFilter] = useState<AccidentStatus | ''>('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [openingAccidentId, setOpeningAccidentId] = useState<string | null>(null)
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false)
  const [templateCompanyId, setTemplateCompanyId] = useState('')
  const [templateDocumentType, setTemplateDocumentType] = useState<string>(ACCIDENT_DOCUMENT_TYPES[0].value)
  const [templateName, setTemplateName] = useState('')
  const [selectedTemplateFile, setSelectedTemplateFile] = useState<File | null>(null)
  const [lastUploadedTemplate, setLastUploadedTemplate] = useState<AccidentTemplate | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<AccidentTemplate | null>(null)
  const [editingTemplateName, setEditingTemplateName] = useState('')
  const [isTemplateEditDialogOpen, setIsTemplateEditDialogOpen] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)

  const canManageTemplates =
    (user?.role === Role.SUPER_ADMIN || user?.role === Role.TENANT_ADMIN) &&
    (accessContext?.available_permissions ?? []).includes('documents.write')

  const { data: companiesData } = useCompanies({ page: 1, perPage: 100 })
  const { data: unitsData } = useUnits({ page: 1, perPage: 100 })
  const accidentsQuery = useAccidents({
    page: 1,
    perPage: 100,
    companyId: companyFilterId || undefined,
    status: statusFilter || undefined,
    search: search || undefined,
  })

  useEffect(() => {
    if (!activeCompany?.id) return
    setCompanyFilterId((current) => current || activeCompany.id)
  }, [activeCompany?.id])

  useEffect(() => {
    const preferredCompanyId = companyFilterId || activeCompany?.id || ''
    if (!preferredCompanyId) return
    setTemplateCompanyId((current) => current || preferredCompanyId)
  }, [companyFilterId, activeCompany?.id])

  const companies = companiesData?.data ?? []
  const units = unitsData?.data ?? []
  const accidents = accidentsQuery.data?.data ?? []

  const templateMutationCompanyId = templateCompanyId || companyFilterId || activeCompany?.id || ''
  const accidentTemplatesQuery = useAccidentTemplates(templateCompanyId || undefined)
  const uploadAccidentTemplate = useUploadAccidentTemplate(templateMutationCompanyId || 'no-company')
  const updateAccidentTemplate = useUpdateAccidentTemplate(templateMutationCompanyId || 'no-company')
  const deleteAccidentTemplate = useDeleteAccidentTemplate(templateMutationCompanyId || 'no-company')
  const templates = accidentTemplatesQuery.data ?? []

  const companyMap = Object.fromEntries(companies.map((company) => [company.id, company.tradeName ?? company.name]))
  const unitMap = Object.fromEntries(units.map((unit) => [unit.id, unit.name]))

  const summary = useMemo(() => {
    return {
      total: accidents.length,
      open: accidents.filter((accident) => accident.status !== AccidentStatus.CLOSED).length,
      investigating: accidents.filter((accident) => accident.status === AccidentStatus.UNDER_INVESTIGATION).length,
      leaveCases: accidents.filter((accident) => accident.leaveRequired).length,
    }
  }, [accidents])

  const templateSummary = useMemo(() => {
    return ACCIDENT_DOCUMENT_TYPES.map((type) => ({
      ...type,
      total: templates.filter((template) => template.documentType === type.value).length,
      active: templates.find((template) => template.documentType === type.value && template.isActive),
    }))
  }, [templates])

  function openCreateDialog() {
    setIsDialogOpen(true)
  }

  function handleCreateDialogOpenChange(open: boolean) {
    setIsDialogOpen(open)
  }

  function openTemplateManager() {
    const preferredCompanyId = templateCompanyId || companyFilterId || activeCompany?.id || ''
    setTemplateCompanyId(preferredCompanyId)
    setTemplateDocumentType(ACCIDENT_DOCUMENT_TYPES[0].value)
    setTemplateName('')
    setSelectedTemplateFile(null)
    setLastUploadedTemplate(null)
    setTemplateError(null)
    setIsTemplateManagerOpen(true)
  }

  async function handleTemplateUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!templateMutationCompanyId || !selectedTemplateFile) return

    const formElement = event.currentTarget
    try {
      const template = await uploadAccidentTemplate.mutateAsync({
        documentType: templateDocumentType,
        name: templateName || undefined,
        file: selectedTemplateFile,
      })

      setLastUploadedTemplate(template)
      setTemplateName('')
      setSelectedTemplateFile(null)
      formElement.reset()
    } catch {
      // Erro já exibido via toast pelo interceptor do Axios — mantém o formulário aberto
    }
  }

  function openTemplateEditor(template: AccidentTemplate) {
    setEditingTemplate(template)
    setEditingTemplateName(template.name)
    setTemplateError(null)
    setIsTemplateEditDialogOpen(true)
  }

  async function saveTemplateChanges(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingTemplate) return

    const normalizedName = editingTemplateName.trim()
    if (normalizedName.length < 2) {
      setTemplateError('Informe um nome com pelo menos 2 caracteres.')
      return
    }

    try {
      await updateAccidentTemplate.mutateAsync({
        templateId: editingTemplate.id,
        name: normalizedName,
      })
      setIsTemplateEditDialogOpen(false)
    } catch {
      // Erro já exibido via toast pelo interceptor do Axios — mantém o modal aberto
    }
  }

  async function toggleTemplateStatus(template: AccidentTemplate) {
    try {
      await updateAccidentTemplate.mutateAsync({
        templateId: template.id,
        isActive: !template.isActive,
      })
    } catch {
      // Erro já exibido via toast pelo interceptor do Axios
    }
  }

  async function removeTemplate(template: AccidentTemplate) {
    const confirmed = window.confirm(`Deseja excluir o template "${template.name}"?`)
    if (!confirmed) return
    try {
      await deleteAccidentTemplate.mutateAsync(template.id)
    } catch {
      // Erro já exibido via toast pelo interceptor do Axios
    }
  }

  function openAccident(accidentId: string) {
    setOpeningAccidentId(accidentId)
    router.push(`/dashboard/acidentes/${accidentId}`)
  }

  return (
    <>
      <Topbar
        title="Acidentes"
        subtitle="Registro, gestão, investigação e conclusão de acidentes ocupacionais"
      />

      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total de registros"
            value={summary.total}
            description="Base consolidada da empresa ativa"
            icon={AlertTriangle}
          />
          <SummaryCard
            title="Casos em aberto"
            value={summary.open}
            description="Acidentes ainda não encerrados"
            icon={FileSearch}
          />
          <SummaryCard
            title="Em investigação"
            value={summary.investigating}
            description="Casos com apuração em andamento"
            icon={CalendarClock}
          />
          <SummaryCard
            title="Com afastamento"
            value={summary.leaveCases}
            description="Registros que exigiram afastamento"
            icon={AlertTriangle}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-8 pl-8 text-xs"
                placeholder="Buscar por código, colaborador ou descrição..."
              />
            </div>

            <select
              value={companyFilterId}
              onChange={(event) => setCompanyFilterId(event.target.value)}
              className="h-8 rounded-md border border-input bg-background px-3 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Todas as empresas</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.tradeName ?? company.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as AccidentStatus | '')}
              className="h-8 rounded-md border border-input bg-background px-3 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Todos os status</option>
              {Object.values(AccidentStatus).map((status) => (
                <option key={status} value={status}>
                  {ACCIDENT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {canManageTemplates && (
              <Button size="sm" variant="outline" onClick={openTemplateManager}>
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Cadastrar templates
              </Button>
            )}
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Registrar acidente
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Colaborador</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ocorrência</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gravidade</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unidade</th>
                  </tr>
                </thead>
                <tbody>
                  {accidentsQuery.isLoading && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                        <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin opacity-50" />
                        Carregando acidentes...
                      </td>
                    </tr>
                  )}

                  {accidentsQuery.isError && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-destructive">
                        Não foi possível carregar os acidentes.
                      </td>
                    </tr>
                  )}

                  {!accidentsQuery.isLoading && !accidentsQuery.isError && accidents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                        <AlertTriangle className="mx-auto mb-2 h-8 w-8 opacity-30" />
                        Nenhum acidente registrado para os filtros atuais.
                      </td>
                    </tr>
                  )}

                  {accidents.map((accident) => (
                    <tr
                      key={accident.id}
                      className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/30"
                      onClick={() => openAccident(accident.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{accident.code}</p>
                          {openingAccidentId === accident.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{accident.companyName ?? companyMap[accident.companyId] ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{accident.employeeName}</p>
                        <p className="text-xs text-muted-foreground">
                          {accident.employeeCpfMasked ?? 'CPF protegido'}
                          {accident.employeeRegistration ? ` · ${accident.employeeRegistration}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(accident.occurredAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {ACCIDENT_TYPE_LABELS[accident.accidentType]}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={ACCIDENT_SEVERITY_BADGES[accident.severity]}>
                          {ACCIDENT_SEVERITY_LABELS[accident.severity]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={ACCIDENT_STATUS_BADGES[accident.status]}>
                          {ACCIDENT_STATUS_LABELS[accident.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {accident.unitName ?? unitMap[accident.unitId] ?? '—'}
                        {accident.leaveRequired && (
                          <p className="mt-1 text-[11px] text-warning">
                            {accident.leaveDays} dia(s) de afastamento
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateAccidentQiatDialog
        open={isDialogOpen}
        onOpenChange={handleCreateDialogOpenChange}
        initialCompanyId={companyFilterId || activeCompany?.id}
        onCreated={(accidentId) => router.push(`/dashboard/acidentes/${accidentId}`)}
      />

      {canManageTemplates && (
        <>
          <Dialog open={isTemplateManagerOpen} onOpenChange={setIsTemplateManagerOpen}>
            <DialogContent className="max-w-6xl">
              <DialogHeader>
                <DialogTitle>Templates de acidente</DialogTitle>
                <DialogDescription>
                  Envie arquivos Word (.docx) por empresa para gerar documentos diretamente no registro do acidente.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="templateCompanyId">Empresa</Label>
                  <select
                    id="templateCompanyId"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={templateCompanyId}
                    onChange={(event) => {
                      setTemplateCompanyId(event.target.value)
                      setLastUploadedTemplate(null)
                      setSelectedTemplateFile(null)
                      setTemplateName('')
                    }}
                  >
                    <option value="">Selecione a empresa</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.tradeName ?? company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.78fr)]">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Upload className="h-4 w-4 text-primary" />
                        Novo template DOCX
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {templateCompanyId ? (
                        <form onSubmit={handleTemplateUpload} className="space-y-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="templateDocumentType">Tipo de documento</Label>
                            <select
                              id="templateDocumentType"
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                              value={templateDocumentType}
                              onChange={(event) => setTemplateDocumentType(event.target.value)}
                            >
                              {ACCIDENT_DOCUMENT_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="templateName">Nome do template</Label>
                            <Input
                              id="templateName"
                              value={templateName}
                              onChange={(event) => setTemplateName(event.target.value)}
                              placeholder="Ex: Relatório de conclusão padrão"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="templateFile">Arquivo DOCX</Label>
                            <Input
                              id="templateFile"
                              type="file"
                              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              onChange={(event) => setSelectedTemplateFile(event.target.files?.[0] ?? null)}
                            />
                          </div>

                          <Button type="submit" disabled={!selectedTemplateFile || uploadAccidentTemplate.isPending}>
                            {uploadAccidentTemplate.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                            Enviar template
                          </Button>
                        </form>
                      ) : (
                        <div className="rounded-md border border-border bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
                          Selecione uma empresa para listar e cadastrar templates de acidente.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Variáveis do template</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="mb-2 text-xs font-medium text-muted-foreground">Detectadas no último upload</p>
                        <VariableList
                          variables={lastUploadedTemplate?.variables ?? []}
                          emptyLabel="Envie um template para detectar variáveis"
                        />
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-medium text-muted-foreground">Dados disponíveis</p>
                        <VariableList variables={ACCIDENT_TEMPLATE_VARIABLES} />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {templateCompanyId && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Templates cadastrados</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        {templateSummary.map((item) => (
                          <div key={item.value} className="rounded-md border border-border px-3 py-2">
                            <p className="text-xs font-medium text-foreground">{item.label}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.active ? `v${item.active.version} ativa` : 'Sem template ativo'}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/40">
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Template</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Tipo</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Versão</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Variáveis</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Status</th>
                              <th className="px-4 py-3" />
                            </tr>
                          </thead>
                          <tbody>
                            {accidentTemplatesQuery.isLoading && (
                              <tr>
                                <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                                  Carregando templates...
                                </td>
                              </tr>
                            )}
                            {!accidentTemplatesQuery.isLoading && templates.length === 0 && (
                              <tr>
                                <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                                  Nenhum template enviado para esta empresa
                                </td>
                              </tr>
                            )}
                            {templates.map((template) => (
                              <tr key={template.id} className="border-b border-border last:border-0">
                                <td className="px-4 py-3">
                                  <p className="font-medium">{template.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(template.createdAt).toLocaleDateString('pt-BR')}
                                  </p>
                                </td>
                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                  {ACCIDENT_DOCUMENT_TYPE_LABELS[template.documentType] ?? template.documentType}
                                </td>
                                <td className="px-4 py-3 text-xs text-muted-foreground">v{template.version}</td>
                                <td className="px-4 py-3 text-xs text-muted-foreground">{template.variables.length}</td>
                                <td className="px-4 py-3">
                                  <Badge variant={template.isActive ? 'success' : 'secondary'}>
                                    {template.isActive ? 'Ativo' : 'Inativo'}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => openTemplateEditor(template)}
                                      disabled={updateAccidentTemplate.isPending || deleteAccidentTemplate.isPending}
                                      title="Editar template"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => toggleTemplateStatus(template)}
                                      disabled={updateAccidentTemplate.isPending || deleteAccidentTemplate.isPending}
                                      title={template.isActive ? 'Desativar template' : 'Ativar template'}
                                    >
                                      <Power className={`h-3.5 w-3.5 ${template.isActive ? 'text-destructive' : 'text-green-600'}`} />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => removeTemplate(template)}
                                      disabled={updateAccidentTemplate.isPending || deleteAccidentTemplate.isPending}
                                      title="Excluir template"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isTemplateEditDialogOpen} onOpenChange={setIsTemplateEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Editar template</DialogTitle>
                <DialogDescription>
                  Atualize o nome do template selecionado.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={saveTemplateChanges} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="templateEditName">Nome do template</Label>
                  <Input
                    id="templateEditName"
                    value={editingTemplateName}
                    onChange={(event) => setEditingTemplateName(event.target.value)}
                    placeholder="Ex: Relatório de conclusão padrão"
                  />
                </div>

                {templateError && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{templateError}</p>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsTemplateEditDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updateAccidentTemplate.isPending}>
                    {updateAccidentTemplate.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Salvar alterações
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  )
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: number
  description: string
  icon: LucideIcon
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <CardTitle className="mt-2 text-3xl">{value}</CardTitle>
        </div>
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function VariableList({
  variables,
  emptyLabel = 'Nenhuma variável detectada',
}: {
  variables: string[]
  emptyLabel?: string
}) {
  if (!variables.length) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {variables.map((variable) => (
        <Badge key={variable} variant="outline">{`{{${variable}}}`}</Badge>
      ))}
    </div>
  )
}
