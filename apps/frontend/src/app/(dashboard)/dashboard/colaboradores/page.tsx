'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Pencil, Power, Users, Loader2 } from 'lucide-react'

import { Topbar } from '@/components/layout/topbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

import { useCompanies } from '@/hooks/use-companies'
import { useUnits } from '@/hooks/use-units'
import { useJobFunctions } from '@/hooks/use-job-functions'
import { useEmployees, useCreateEmployee, useUpdateEmployee } from '@/hooks/use-employees'
import type { Employee } from '@/lib/api/employees.api'
import { useCompanyStore } from '@/store/company.store'

// ─── Schema ──────────────────────────────────────────────────────────────────

const colaboradorSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/, 'CPF inválido (ex: 000.000.000-00)'),
  dataNascimento: z.string().optional(),
  genero: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  empresaId: z.string().uuid('Selecione a empresa'),
  unidadeId: z.string().uuid('Selecione a unidade'),
  funcaoId: z.string().uuid('Selecione a função'),
  dataAdmissao: z.string().min(1, 'Data de admissão obrigatória'),
  matricula: z.string().optional(),
})

type ColaboradorFormData = z.infer<typeof colaboradorSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ColaboradoresPage() {
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const [filtroEmpresaId, setFiltroEmpresaId] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Employee | null>(null)
  const [navigatingEmployeeId, setNavigatingEmployeeId] = useState<string | null>(null)
  const activeCompany = useCompanyStore((s) => s.activeCompany)

  const { data: companiesData } = useCompanies({ page: 1, perPage: 100 })
  const { data: unitsData } = useUnits({ page: 1, perPage: 100 })
  const { data: functionsData } = useJobFunctions({ page: 1, perPage: 100 })
  const { data: employeesData, isLoading, isError, refetch } = useEmployees({
    page: 1,
    perPage: 100,
    companyId: filtroEmpresaId || undefined,
  })
  const createEmployee = useCreateEmployee()
  const updateEmployee = useUpdateEmployee()

  const companies = companiesData?.data ?? []
  const allUnits = unitsData?.data ?? []
  const allFunctions = functionsData?.data ?? []
  const allEmployees = employeesData?.data ?? []

  useEffect(() => {
    if (!activeCompany?.id) return
    setFiltroEmpresaId((current) => current || activeCompany.id)
  }, [activeCompany?.id])

  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c.tradeName ?? c.name]))
  const unitMap = Object.fromEntries(allUnits.map((u) => [u.id, u.name]))
  const functionMap = Object.fromEntries(allFunctions.map((f) => [f.id, f.name]))

  const colaboradoresFiltrados = allEmployees.filter((c) => {
    const termo = busca.toLowerCase()
    const matchBusca =
      c.name.toLowerCase().includes(termo) ||
      c.cpf.includes(termo) ||
      (functionMap[c.jobFunctionId] ?? '').toLowerCase().includes(termo) ||
      (unitMap[c.unitId] ?? '').toLowerCase().includes(termo)
    const matchEmpresa = filtroEmpresaId ? c.companyId === filtroEmpresaId : true
    return matchBusca && matchEmpresa
  })

  const form = useForm<ColaboradorFormData>({
    resolver: zodResolver(colaboradorSchema),
    defaultValues: {
      nome: '', cpf: '', dataNascimento: '', genero: undefined,
      empresaId: '', unidadeId: '', funcaoId: '', dataAdmissao: '', matricula: '',
    },
  })

  const empresaIdSelecionada = form.watch('empresaId')
  const unidadeIdSelecionada = form.watch('unidadeId')
  const unidadesDisponiveis = allUnits.filter((u) => u.companyId === empresaIdSelecionada)
  const funcoesDisponiveis = allFunctions.filter((f) => {
    if (!empresaIdSelecionada || !unidadeIdSelecionada) return false
    const unitIds = f.unitIds?.length ? f.unitIds : f.unitId ? [f.unitId] : []
    return f.companyId === empresaIdSelecionada && unitIds.includes(unidadeIdSelecionada)
  })

  function abrirModalNovo() {
    const empresaInicial = filtroEmpresaId || activeCompany?.id || ''
    setEditando(null)
    form.reset({
      nome: '', cpf: '', dataNascimento: '', genero: undefined,
      empresaId: empresaInicial, unidadeId: '', funcaoId: '', dataAdmissao: '', matricula: '',
    })
    setModalAberto(true)
  }

  function abrirModalEditar(colaborador: Employee) {
    setEditando(colaborador)
    form.reset({
      nome: colaborador.name,
      cpf: formatCpf(colaborador.cpf),
      dataNascimento: colaborador.birthDate ? colaborador.birthDate.split('T')[0] : '',
      genero: colaborador.gender ?? undefined,
      empresaId: colaborador.companyId,
      unidadeId: colaborador.unitId,
      funcaoId: colaborador.jobFunctionId,
      dataAdmissao: colaborador.admissionDate.split('T')[0],
      matricula: colaborador.registration ?? '',
    })
    setModalAberto(true)
  }

  async function salvar(data: ColaboradorFormData) {
    // Remove a formatação do CPF antes de enviar — backend exige 11 dígitos
    const cpfDigits = data.cpf.replace(/\D/g, '')

    let empresaParaExibir = data.empresaId

    if (editando) {
      const atualizado = await updateEmployee.mutateAsync({
        id: editando.id,
        name: data.nome,
        cpf: cpfDigits,
        birthDate: data.dataNascimento || undefined,
        gender: data.genero,
        unitId: data.unidadeId,
        jobFunctionId: data.funcaoId,
        admissionDate: data.dataAdmissao,
        registration: data.matricula || undefined,
      })
      empresaParaExibir = atualizado.companyId
    } else {
      const criado = await createEmployee.mutateAsync({
        companyId: data.empresaId,
        unitId: data.unidadeId,
        jobFunctionId: data.funcaoId,
        name: data.nome,
        cpf: cpfDigits,
        birthDate: data.dataNascimento || undefined,
        gender: data.genero,
        admissionDate: data.dataAdmissao,
        registration: data.matricula || undefined,
      })
      empresaParaExibir = criado.companyId
    }

    setBusca('')
    setFiltroEmpresaId(empresaParaExibir)
    await refetch()
    setEditando(null)
    setModalAberto(false)
  }

  async function alternarStatus(colaborador: Employee) {
    await updateEmployee.mutateAsync({ id: colaborador.id, isActive: !colaborador.isActive })
  }

  function abrirPerfilColaborador(colaboradorId: string) {
    setNavigatingEmployeeId(colaboradorId)
    router.push(`/dashboard/colaboradores/${colaboradorId}`)
  }

  const isSaving = createEmployee.isPending || updateEmployee.isPending

  return (
    <>
      <Topbar title="Colaboradores" subtitle="Gerencie os colaboradores de cada empresa e unidade" />

      <div className="p-6 space-y-4">
        {/* Barra de ações */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF ou função..."
                className="pl-8 h-8 text-xs"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <select
              className="h-8 rounded-md border border-input bg-background px-3 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              value={filtroEmpresaId}
              onChange={(e) => setFiltroEmpresaId(e.target.value)}
            >
              <option value="">Todas as empresas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.tradeName ?? c.name}</option>
              ))}
            </select>
          </div>
          <Button size="sm" onClick={abrirModalNovo}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo Colaborador
          </Button>
        </div>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Colaborador</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">CPF</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Função</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unidade</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Admissão</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                        <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin opacity-50" />
                        Carregando colaboradores...
                      </td>
                    </tr>
                  )}
                  {isError && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-destructive text-sm">
                        Erro ao carregar colaboradores.
                      </td>
                    </tr>
                  )}
                  {!isLoading && !isError && colaboradoresFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        Nenhum colaborador encontrado
                      </td>
                    </tr>
                  )}
                  {colaboradoresFiltrados.map((colaborador) => (
                    <tr
                      key={colaborador.id}
                      className={
                        navigatingEmployeeId === colaborador.id
                          ? 'cursor-progress border-b border-border bg-primary/5 ring-1 ring-inset ring-primary/20 last:border-0'
                          : 'cursor-pointer border-b border-border last:border-0 hover:bg-muted/30 transition-colors'
                      }
                      onClick={() => abrirPerfilColaborador(colaborador.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{colaborador.name}</p>
                          {navigatingEmployeeId === colaborador.id && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Abrindo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {companyMap[colaborador.companyId] ?? '—'}
                          {colaborador.registration && ` · ${colaborador.registration}`}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {formatCpf(colaborador.cpf)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {functionMap[colaborador.jobFunctionId] ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {unitMap[colaborador.unitId] ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(colaborador.admissionDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={colaborador.isActive ? 'success' : 'secondary'}>
                          {colaborador.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(event) => {
                              event.stopPropagation()
                              setNavigatingEmployeeId(null)
                              abrirModalEditar(colaborador)
                            }}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(event) => {
                              event.stopPropagation()
                              setNavigatingEmployeeId(null)
                              alternarStatus(colaborador)
                            }}
                            title={colaborador.isActive ? 'Desativar' : 'Ativar'}
                          >
                            <Power className={`h-3.5 w-3.5 ${colaborador.isActive ? 'text-destructive' : 'text-success'}`} />
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

        <p className="text-xs text-muted-foreground">
          {colaboradoresFiltrados.length} colaborador{colaboradoresFiltrados.length !== 1 ? 'es' : ''} encontrado{colaboradoresFiltrados.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Modal criar/editar */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Colaborador' : 'Novo Colaborador'}</DialogTitle>
            <DialogDescription>
              {editando ? 'Atualize os dados do colaborador.' : 'Preencha os dados para cadastrar um novo colaborador.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(salvar)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nomeColab">Nome Completo *</Label>
              <Input id="nomeColab" placeholder="Ex: João da Silva Santos" {...form.register('nome')} />
              {form.formState.errors.nome && (
                <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  {...form.register('cpf')}
                  onChange={(e) => form.setValue('cpf', formatCpf(e.target.value), { shouldValidate: true })}
                />
                {form.formState.errors.cpf && (
                  <p className="text-xs text-destructive">{form.formState.errors.cpf.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                <Input id="dataNascimento" type="date" {...form.register('dataNascimento')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="genero">Gênero</Label>
                <select
                  id="genero"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  {...form.register('genero')}
                >
                  <option value="">Não informado</option>
                  <option value="MALE">Masculino</option>
                  <option value="FEMALE">Feminino</option>
                  <option value="OTHER">Outro</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="matricula">Matrícula (opcional)</Label>
                <Input id="matricula" placeholder="Ex: MTL001" {...form.register('matricula')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="empresaIdColab">Empresa *</Label>
              <select
                id="empresaIdColab"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                disabled={!!editando}
                {...form.register('empresaId')}
                onChange={(e) => {
                  form.setValue('empresaId', e.target.value)
                  form.setValue('unidadeId', '')
                  form.setValue('funcaoId', '')
                }}
              >
                <option value="">Selecione a empresa</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.tradeName ?? c.name}</option>
                ))}
              </select>
              {form.formState.errors.empresaId && (
                <p className="text-xs text-destructive">{form.formState.errors.empresaId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="unidadeIdColab">Unidade *</Label>
                <select
                  id="unidadeIdColab"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  disabled={!empresaIdSelecionada}
                  {...form.register('unidadeId')}
                  onChange={(e) => {
                    form.setValue('unidadeId', e.target.value, { shouldValidate: true })
                    form.setValue('funcaoId', '')
                  }}
                >
                  <option value="">Selecione</option>
                  {unidadesDisponiveis.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                {form.formState.errors.unidadeId && (
                  <p className="text-xs text-destructive">{form.formState.errors.unidadeId.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="funcaoIdColab">Função *</Label>
                <select
                  id="funcaoIdColab"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  disabled={!empresaIdSelecionada || !unidadeIdSelecionada}
                  {...form.register('funcaoId')}
                >
                  <option value="">Selecione</option>
                  {funcoesDisponiveis.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                {form.formState.errors.funcaoId && (
                  <p className="text-xs text-destructive">{form.formState.errors.funcaoId.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dataAdmissao">Data de Admissão *</Label>
              <Input id="dataAdmissao" type="date" {...form.register('dataAdmissao')} />
              {form.formState.errors.dataAdmissao && (
                <p className="text-xs text-destructive">{form.formState.errors.dataAdmissao.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {editando ? 'Salvar Alterações' : 'Cadastrar Colaborador'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
