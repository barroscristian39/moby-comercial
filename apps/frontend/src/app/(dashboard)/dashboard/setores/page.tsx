'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Pencil, Power, Layers, Loader2 } from 'lucide-react'

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
import { useSectors, useCreateSector, useUpdateSector } from '@/hooks/use-sectors'
import type { Sector } from '@/lib/api/sectors.api'

// ─── Schema ──────────────────────────────────────────────────────────────────

const setorSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  descricao: z.string().optional(),
  empresaId: z.string().uuid('Selecione uma empresa'),
  unidadeId: z.string().uuid('Selecione uma unidade'),
})

type SetorFormData = z.infer<typeof setorSchema>

// ─── Componente principal ─────────────────────────────────────────────────────

export default function SetoresPage() {
  const [busca, setBusca] = useState('')
  const [filtroEmpresaId, setFiltroEmpresaId] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Sector | null>(null)

  const { data: companiesData } = useCompanies({ page: 1, perPage: 100 })
  const { data: unitsData } = useUnits({ page: 1, perPage: 100 })
  const { data: sectorsData, isLoading, isError } = useSectors({ page: 1, perPage: 100 })
  const createSector = useCreateSector()
  const updateSector = useUpdateSector()

  const companies = companiesData?.data ?? []
  const allUnits = unitsData?.data ?? []
  const allSectors = sectorsData?.data ?? []

  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c.tradeName ?? c.name]))
  const unitMap = Object.fromEntries(allUnits.map((u) => [u.id, u.name]))

  const setoresFiltrados = allSectors.filter((s) => {
    const termo = busca.toLowerCase()
    const matchBusca =
      s.name.toLowerCase().includes(termo) ||
      (companyMap[s.companyId] ?? '').toLowerCase().includes(termo) ||
      (unitMap[s.unitId] ?? '').toLowerCase().includes(termo)
    const matchEmpresa = filtroEmpresaId ? s.companyId === filtroEmpresaId : true
    return matchBusca && matchEmpresa
  })

  const form = useForm<SetorFormData>({
    resolver: zodResolver(setorSchema),
    defaultValues: { nome: '', descricao: '', empresaId: '', unidadeId: '' },
  })

  const empresaIdSelecionada = form.watch('empresaId')
  const unidadesDisponiveis = allUnits.filter((u) => u.companyId === empresaIdSelecionada)

  function abrirModalNovo() {
    setEditando(null)
    form.reset({ nome: '', descricao: '', empresaId: '', unidadeId: '' })
    setModalAberto(true)
  }

  function abrirModalEditar(setor: Sector) {
    setEditando(setor)
    form.reset({
      nome: setor.name,
      descricao: setor.description ?? '',
      empresaId: setor.companyId,
      unidadeId: setor.unitId,
    })
    setModalAberto(true)
  }

  async function salvar(data: SetorFormData) {
    if (editando) {
      await updateSector.mutateAsync({
        id: editando.id,
        name: data.nome,
        description: data.descricao || undefined,
        unitId: data.unidadeId,
      })
    } else {
      await createSector.mutateAsync({
        companyId: data.empresaId,
        unitId: data.unidadeId,
        name: data.nome,
        description: data.descricao || undefined,
      })
    }
    setModalAberto(false)
  }

  async function alternarStatus(setor: Sector) {
    await updateSector.mutateAsync({ id: setor.id, isActive: !setor.isActive })
  }

  const isSaving = createSector.isPending || updateSector.isPending

  return (
    <>
      <Topbar title="Setores" subtitle="Gerencie as áreas de trabalho de cada unidade" />

      <div className="p-6 space-y-4">
        {/* Barra de ações */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
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
            Novo Setor
          </Button>
        </div>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Setor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unidade</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Empresa</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                        <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin opacity-50" />
                        Carregando setores...
                      </td>
                    </tr>
                  )}
                  {isError && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-destructive text-sm">
                        Erro ao carregar setores.
                      </td>
                    </tr>
                  )}
                  {!isLoading && !isError && setoresFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                        <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        Nenhum setor encontrado
                      </td>
                    </tr>
                  )}
                  {setoresFiltrados.map((setor) => (
                    <tr key={setor.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{setor.name}</p>
                        {setor.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs">{setor.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {unitMap[setor.unitId] ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {companyMap[setor.companyId] ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={setor.isActive ? 'success' : 'secondary'}>
                          {setor.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirModalEditar(setor)} title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => alternarStatus(setor)} title={setor.isActive ? 'Desativar' : 'Ativar'}>
                            <Power className={`h-3.5 w-3.5 ${setor.isActive ? 'text-destructive' : 'text-success'}`} />
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
          {setoresFiltrados.length} setor{setoresFiltrados.length !== 1 ? 'es' : ''} encontrado{setoresFiltrados.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Modal criar/editar */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Setor' : 'Novo Setor'}</DialogTitle>
            <DialogDescription>
              {editando ? 'Atualize os dados do setor.' : 'Preencha os dados para cadastrar um novo setor.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(salvar)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nomeSetor">Nome do Setor *</Label>
              <Input id="nomeSetor" placeholder="Ex: Produção" {...form.register('nome')} />
              {form.formState.errors.nome && (
                <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="empresaIdSetor">Empresa *</Label>
              <select
                id="empresaIdSetor"
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
              <Label htmlFor="unidadeIdSetor">Unidade *</Label>
              <select
                id="unidadeIdSetor"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                disabled={!empresaIdSelecionada}
                {...form.register('unidadeId')}
              >
                <option value="">Selecione a unidade</option>
                {unidadesDisponiveis.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              {form.formState.errors.unidadeId && (
                <p className="text-xs text-destructive">{form.formState.errors.unidadeId.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descricaoSetor">Descrição (opcional)</Label>
              <textarea
                id="descricaoSetor"
                rows={3}
                placeholder="Descreva as atividades realizadas neste setor..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                {...form.register('descricao')}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {editando ? 'Salvar Alterações' : 'Cadastrar Setor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
