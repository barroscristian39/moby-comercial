'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Pencil, Power, Briefcase, Loader2, FileText } from 'lucide-react'

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
import { useJobFunctions, useCreateJobFunction, useUpdateJobFunction } from '@/hooks/use-job-functions'
import type { JobFunction } from '@/lib/api/job-functions.api'

// ─── Schema ──────────────────────────────────────────────────────────────────

const funcaoSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cbo: z.string().optional(),
  empresaId: z.string().uuid('Selecione uma empresa'),
  unidadeId: z.string().min(1, 'Selecione uma unidade'),
  descricao: z.string().optional(),
})

type FuncaoFormData = z.infer<typeof funcaoSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCbo(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 6)
  if (digits.length > 4) return `${digits.slice(0, 4)}-${digits.slice(4)}`
  return digits
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function FuncoesPage() {
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const [filtroEmpresaId, setFiltroEmpresaId] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<JobFunction | null>(null)

  const { data: companiesData } = useCompanies({ page: 1, perPage: 100 })
  const { data: unitsData } = useUnits({ page: 1, perPage: 100 })
  const { data: functionsData, isLoading, isError, refetch } = useJobFunctions({ page: 1, perPage: 100 })
  const createJobFunction = useCreateJobFunction()
  const updateJobFunction = useUpdateJobFunction()

  const companies = companiesData?.data ?? []
  const allUnits = unitsData?.data ?? []
  const allFunctions = functionsData?.data ?? []

  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c.tradeName ?? c.name]))
  const unitMap = Object.fromEntries(allUnits.map((u) => [u.id, u.name]))

  const funcoesFiltradas = allFunctions.filter((f) => {
    const termo = busca.toLowerCase()
    const matchBusca =
      f.name.toLowerCase().includes(termo) ||
      (f.cbo ?? '').includes(termo) ||
      (f.unitId ? unitMap[f.unitId] ?? '' : '').toLowerCase().includes(termo) ||
      (companyMap[f.companyId] ?? '').toLowerCase().includes(termo)
    const matchEmpresa = filtroEmpresaId ? f.companyId === filtroEmpresaId : true
    return matchBusca && matchEmpresa
  })

  const form = useForm<FuncaoFormData>({
    resolver: zodResolver(funcaoSchema),
    defaultValues: { nome: '', cbo: '', empresaId: '', unidadeId: '', descricao: '' },
  })

  const empresaIdSelecionada = form.watch('empresaId')
  const unidadesDisponiveis = allUnits.filter((u) => u.companyId === empresaIdSelecionada)

  function abrirModalNova() {
    setEditando(null)
    form.reset({ nome: '', cbo: '', empresaId: '', unidadeId: '', descricao: '' })
    setModalAberto(true)
  }

  function abrirModalEditar(funcao: JobFunction) {
    setEditando(funcao)
    form.reset({
      nome: funcao.name,
      cbo: funcao.cbo ? formatCbo(funcao.cbo) : '',
      empresaId: funcao.companyId,
      unidadeId: funcao.unitId ?? '',
      descricao: funcao.description ?? '',
    })
    setModalAberto(true)
  }

  async function salvar(data: FuncaoFormData) {
    const cboDigits = data.cbo?.replace(/\D/g, '') || undefined

    if (editando) {
      await updateJobFunction.mutateAsync({
        id: editando.id,
        name: data.nome,
        cbo: cboDigits,
        unitId: data.unidadeId || undefined,
        description: data.descricao || undefined,
      })
    } else {
      await createJobFunction.mutateAsync({
        companyId: data.empresaId,
        name: data.nome,
        cbo: cboDigits,
        unitId: data.unidadeId || undefined,
        description: data.descricao || undefined,
      })
    }
    await refetch()
    setModalAberto(false)
  }

  async function alternarStatus(funcao: JobFunction) {
    await updateJobFunction.mutateAsync({ id: funcao.id, isActive: !funcao.isActive })
  }

  const isSaving = createJobFunction.isPending || updateJobFunction.isPending

  return (
    <>
      <Topbar title="Funções" subtitle="Gerencie os cargos e ocupações de cada empresa" />

      <div className="p-6 space-y-4">
        {/* Barra de ações */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CBO..."
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
          <Button size="sm" onClick={abrirModalNova}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Nova Função
          </Button>
        </div>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Função</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">CBO</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unidade</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Empresa</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                        <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin opacity-50" />
                        Carregando funções...
                      </td>
                    </tr>
                  )}
                  {isError && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-destructive text-sm">
                        Erro ao carregar funções.
                      </td>
                    </tr>
                  )}
                  {!isLoading && !isError && funcoesFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                        <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        Nenhuma função encontrada
                      </td>
                    </tr>
                  )}
                  {funcoesFiltradas.map((funcao) => (
                    <tr
                      key={funcao.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/funcoes/${funcao.id}`)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{funcao.name}</p>
                        {funcao.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs">{funcao.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                        {funcao.cbo ? formatCbo(funcao.cbo) : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {funcao.unitId ? (unitMap[funcao.unitId] ?? '—') : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {companyMap[funcao.companyId] ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={funcao.isActive ? 'success' : 'secondary'}>
                          {funcao.isActive ? 'Ativa' : 'Inativa'}
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
                              router.push(`/dashboard/funcoes/${funcao.id}`)
                            }}
                            title="Abrir templates da função"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(event) => { event.stopPropagation(); abrirModalEditar(funcao) }} title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(event) => { event.stopPropagation(); alternarStatus(funcao) }} title={funcao.isActive ? 'Desativar' : 'Ativar'}>
                            <Power className={`h-3.5 w-3.5 ${funcao.isActive ? 'text-destructive' : 'text-success'}`} />
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
          {funcoesFiltradas.length} função{funcoesFiltradas.length !== 1 ? 'ões' : ''} encontrada{funcoesFiltradas.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Modal criar/editar */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Função' : 'Nova Função'}</DialogTitle>
            <DialogDescription>
              {editando ? 'Atualize os dados da função.' : 'Preencha os dados para cadastrar uma nova função.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(salvar)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nomeFuncao">Nome da Função *</Label>
              <Input id="nomeFuncao" placeholder="Ex: Torneiro Mecânico" {...form.register('nome')} />
              {form.formState.errors.nome && (
                <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cbo">CBO</Label>
              <Input
                id="cbo"
                placeholder="7243-30"
                maxLength={7}
                {...form.register('cbo')}
                onChange={(e) => form.setValue('cbo', formatCbo(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="empresaIdFuncao">Empresa *</Label>
              <select
                id="empresaIdFuncao"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                disabled={!!editando}
                {...form.register('empresaId')}
                onChange={(e) => {
                  form.setValue('empresaId', e.target.value)
                  form.setValue('unidadeId', '')
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

            <div className="space-y-1.5">
              <Label htmlFor="unidadeIdFuncao">Unidade *</Label>
              <select
                id="unidadeIdFuncao"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                disabled={!empresaIdSelecionada}
                {...form.register('unidadeId')}
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
              <Label htmlFor="descricaoFuncao">Descrição (opcional)</Label>
              <textarea
                id="descricaoFuncao"
                rows={2}
                placeholder="Descreva as atividades desta função..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                {...form.register('descricao')}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {editando ? 'Salvar Alterações' : 'Cadastrar Função'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
