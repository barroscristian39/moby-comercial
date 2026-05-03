'use client'

import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Briefcase,
  FileText,
  Loader2,
  Pencil,
  Power,
  Trash2,
  Upload,
  User,
} from 'lucide-react'
import { Permission, Role } from '@moby/shared'

import { Topbar } from '@/components/layout/topbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { useEmployees } from '@/hooks/use-employees'
import {
  useDeleteFunctionTemplate,
  useFunctionTemplates,
  useUpdateFunctionTemplate,
  useUploadFunctionTemplate,
} from '@/hooks/use-function-documents'
import { useJobFunction } from '@/hooks/use-job-functions'
import { useAuthStore } from '@/store/auth.store'
import { useUnits } from '@/hooks/use-units'
import type { FunctionTemplate } from '@/lib/api/function-documents.api'

const DOCUMENT_TYPES = [
  { value: 'ORDEM_SERVICO', label: 'Ordem de Serviço' },
  { value: 'PGR', label: 'PGR' },
  { value: 'PCMSO', label: 'PCMSO' },
  { value: 'LTCAT', label: 'LTCAT' },
  { value: 'LIP', label: 'LIP' },
  { value: 'ASO', label: 'ASO' },
]

const SUPPORTED_VARIABLES = [
  'nome',
  'cpf',
  'matricula',
  'funcao',
  'cbo',
  'unidade',
  'empresa',
  'cnpj_empresa',
  'data_emissao',
  'data_admissao',
]

export default function FuncaoGestaoPage() {
  const router = useRouter()
  const params = useParams()
  const functionId = String(params.id ?? '')
  const user = useAuthStore((state) => state.user)
  const accessContext = useAuthStore((state) => state.accessContext)
  const canManageTemplates =
    (user?.role === Role.SUPER_ADMIN || user?.role === Role.TENANT_ADMIN) &&
    (accessContext?.available_permissions ?? []).includes(Permission.DOCUMENTS_WRITE)

  const [documentType, setDocumentType] = useState('ORDEM_SERVICO')
  const [templateName, setTemplateName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [lastUploadedTemplate, setLastUploadedTemplate] = useState<FunctionTemplate | null>(null)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<FunctionTemplate | null>(null)
  const [editingTemplateName, setEditingTemplateName] = useState('')
  const [templateError, setTemplateError] = useState<string | null>(null)

  const { data: funcao, isLoading: loadingFunction, isError: functionError } = useJobFunction(functionId)
  const { data: companiesData } = useCompanies({ page: 1, perPage: 100 })
  const { data: unitsData } = useUnits({ page: 1, perPage: 100 })
  const { data: templates = [], isLoading: loadingTemplates } = useFunctionTemplates(functionId)
  const { data: employeesData, isLoading: loadingEmployees } = useEmployees({
    page: 1,
    perPage: 100,
    jobFunctionId: functionId,
  })

  const uploadTemplate = useUploadFunctionTemplate(functionId)
  const updateTemplate = useUpdateFunctionTemplate(functionId)
  const deleteTemplate = useDeleteFunctionTemplate(functionId)

  const employees = employeesData?.data ?? []
  const companies = companiesData?.data ?? []
  const units = unitsData?.data ?? []
  const companyName = companies.find((company) => company.id === funcao?.companyId)
  const linkedUnits = units.filter((unit) => funcao?.unitIds?.includes(unit.id))
  const currentVariables = lastUploadedTemplate?.variables ?? []

  const templatesByType = useMemo(() => {
    return DOCUMENT_TYPES.map((type) => ({
      ...type,
      total: templates.filter((template) => template.documentType === type.value).length,
      active: templates.find((template) => template.documentType === type.value && template.isActive),
    }))
  }, [templates])

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canManageTemplates || !selectedFile) return
    setTemplateError(null)
    const form = event.currentTarget

    const template = await uploadTemplate.mutateAsync({
      documentType,
      name: templateName || undefined,
      file: selectedFile,
    })
    setLastUploadedTemplate(template)
    setTemplateName('')
    setSelectedFile(null)
    form.reset()
  }

  function abrirModalEditarTemplate(template: FunctionTemplate) {
    if (!canManageTemplates) return
    setEditingTemplate(template)
    setEditingTemplateName(template.name)
    setTemplateError(null)
    setTemplateModalOpen(true)
  }

  async function salvarTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canManageTemplates || !editingTemplate) return

    const normalizedName = editingTemplateName.trim()
    if (normalizedName.length < 2) {
      setTemplateError('Informe um nome com pelo menos 2 caracteres.')
      return
    }

    await updateTemplate.mutateAsync({
      templateId: editingTemplate.id,
      name: normalizedName,
    })
    setTemplateModalOpen(false)
  }

  async function alternarStatusTemplate(template: FunctionTemplate) {
    if (!canManageTemplates) return
    await updateTemplate.mutateAsync({
      templateId: template.id,
      isActive: !template.isActive,
    })
  }

  async function excluirTemplate(template: FunctionTemplate) {
    if (!canManageTemplates) return

    const confirmed = window.confirm(
      `Deseja excluir o template "${template.name}"? Essa ação remove o template da função.`,
    )
    if (!confirmed) return

    await deleteTemplate.mutateAsync(template.id)
  }

  return (
    <>
      <Topbar title="Gestão da Função" subtitle={funcao?.name ?? 'Templates da função'} />

      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/funcoes')}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Voltar
        </Button>

        {loadingFunction && (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando função...
            </CardContent>
          </Card>
        )}

        {functionError && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-destructive">
              Não foi possível carregar a função.
            </CardContent>
          </Card>
        )}

        {funcao && (
          <>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Briefcase className="h-4 w-4 text-primary" />
                    {funcao.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">CBO</p>
                      <p className="font-medium">{funcao.cbo || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Empresa</p>
                      <p className="font-medium">{companyName?.tradeName ?? companyName?.name ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge variant={funcao.isActive ? 'success' : 'secondary'}>
                        {funcao.isActive ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Unidades vinculadas</p>
                    <div className="flex flex-wrap gap-1.5">
                      {linkedUnits.length ? linkedUnits.map((unit) => (
                        <Badge key={unit.id} variant="outline">{unit.name}</Badge>
                      )) : <span className="text-xs text-muted-foreground">Nenhuma unidade vinculada</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4 text-primary" />
                    Templates ativos
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 text-sm">
                  {templatesByType.map((type) => (
                    <div key={type.value} className="rounded-md border border-border px-3 py-2">
                      <p className="text-xs font-medium text-foreground">{type.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {type.active ? `v${type.active.version} ativa` : 'Sem template ativo'}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.8fr)]">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Upload className="h-4 w-4 text-primary" />
                    {canManageTemplates ? 'Upload de DOCX' : 'Templates da função'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {canManageTemplates ? (
                    <form onSubmit={handleUpload} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="documentType">Tipo de documento</Label>
                        <select
                          id="documentType"
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          value={documentType}
                          onChange={(event) => setDocumentType(event.target.value)}
                        >
                          {DOCUMENT_TYPES.map((type) => (
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
                          placeholder="Ex: OS padrão - área industrial"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="templateFile">Arquivo DOCX</Label>
                        <Input
                          id="templateFile"
                          type="file"
                          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                        />
                      </div>

                      <Button type="submit" disabled={!selectedFile || uploadTemplate.isPending}>
                        {uploadTemplate.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        Enviar Template
                      </Button>
                    </form>
                  ) : (
                    <div className="rounded-md border border-border bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
                      Somente administradores podem enviar, editar, ativar, desativar ou excluir templates desta função.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Variáveis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Detectadas no último upload</p>
                    <VariableList variables={currentVariables} emptyLabel="Envie um template para detectar variáveis" />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Dados disponíveis</p>
                    <VariableList variables={SUPPORTED_VARIABLES} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Templates da função</CardTitle>
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
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Status</th>
                        {canManageTemplates && <th className="px-4 py-3" />}
                      </tr>
                    </thead>
                    <tbody>
                      {loadingTemplates && (
                        <tr>
                          <td colSpan={canManageTemplates ? 6 : 5} className="py-10 text-center text-sm text-muted-foreground">
                            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                            Carregando templates...
                          </td>
                        </tr>
                      )}
                      {!loadingTemplates && templates.length === 0 && (
                        <tr>
                          <td colSpan={canManageTemplates ? 6 : 5} className="py-10 text-center text-sm text-muted-foreground">
                            Nenhum template enviado
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
                          <td className="px-4 py-3 text-xs text-muted-foreground">{template.documentType}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">v{template.version}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{template.variables.length}</td>
                          <td className="px-4 py-3">
                            <Badge variant={template.isActive ? 'success' : 'secondary'}>
                              {template.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </td>
                          {canManageTemplates && (
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => abrirModalEditarTemplate(template)}
                                  title="Editar template"
                                  disabled={updateTemplate.isPending || deleteTemplate.isPending}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => alternarStatusTemplate(template)}
                                  title={template.isActive ? 'Desativar template' : 'Ativar template'}
                                  disabled={updateTemplate.isPending || deleteTemplate.isPending}
                                >
                                  <Power className={`h-3.5 w-3.5 ${template.isActive ? 'text-destructive' : 'text-success'}`} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => excluirTemplate(template)}
                                  title="Excluir template"
                                  disabled={updateTemplate.isPending || deleteTemplate.isPending}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4 text-primary" />
                  Colaboradores nesta função
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Nome</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">CPF</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Unidade</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingEmployees && (
                        <tr>
                          <td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                            Carregando colaboradores...
                          </td>
                        </tr>
                      )}
                      {!loadingEmployees && employees.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                            Nenhum colaborador vinculado
                          </td>
                        </tr>
                      )}
                      {employees.map((employee) => (
                        <tr
                          key={employee.id}
                          className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30"
                          onClick={() => router.push(`/dashboard/colaboradores/${employee.id}`)}
                        >
                          <td className="px-4 py-3 font-medium">{employee.name}</td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{employee.cpf}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {units.find((unit) => unit.id === employee.unitId)?.name ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={employee.isActive ? 'success' : 'secondary'}>
                              {employee.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
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

      {canManageTemplates && (
        <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Template</DialogTitle>
              <DialogDescription>
                Atualize o nome do template selecionado.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={salvarTemplate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="templateEditName">Nome do template</Label>
                <Input
                  id="templateEditName"
                  value={editingTemplateName}
                  onChange={(event) => setEditingTemplateName(event.target.value)}
                  placeholder="Ex: OS padrão - área industrial"
                />
              </div>

              {templateError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{templateError}</p>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setTemplateModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateTemplate.isPending}>
                  {updateTemplate.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

function VariableList({ variables, emptyLabel = 'Nenhuma variável detectada' }: { variables: string[]; emptyLabel?: string }) {
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
