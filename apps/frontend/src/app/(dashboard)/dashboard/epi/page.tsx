'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Search, Pencil, Power, HardHat, AlertTriangle,
  Package, Loader2,
} from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { EmptyModuleState } from '@/components/dashboard/empty-module-state'

import { useCompanies } from '@/hooks/use-companies'
import { useEpiItems, useCreateEpiItem, useUpdateEpiItem } from '@/hooks/use-epi-items'
import type { EpiItem } from '@/lib/api/epi-items.api'

// ─── Schema catálogo ─────────────────────────────────────────────────────────

const epiSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  caNumber: z.string().min(1, 'CA é obrigatório'),
  fabricante: z.string().optional(),
  caExpiry: z.string().optional(),
  stockQuantity: z.coerce.number().min(0).default(0),
  minStockQuantity: z.coerce.number().min(0).default(0),
  empresaId: z.string().uuid('Selecione a empresa'),
  description: z.string().optional(),
})
type EpiFormData = z.infer<typeof epiSchema>

// ─── Componente principal ─────────────────────────────────────────────────────

export default function EpiPage() {
  const [busca, setBusca] = useState('')
  const [buscaFicha, setBuscaFicha] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<EpiItem | null>(null)

  const { data: companiesData } = useCompanies({ page: 1, perPage: 100 })
  const { data: epiData, isLoading, isError } = useEpiItems({ page: 1, perPage: 100 })
  const createEpiItem = useCreateEpiItem()
  const updateEpiItem = useUpdateEpiItem()

  const companies = companiesData?.data ?? []
  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c.tradeName ?? c.name]))
  const allEpis = epiData?.data ?? []

  const episFiltrados = allEpis.filter((e) => {
    const termo = busca.toLowerCase()
    return (
      e.name.toLowerCase().includes(termo) ||
      e.caNumber.includes(termo) ||
      (e.manufacturer ?? '').toLowerCase().includes(termo)
    )
  })

  const alertasCa = allEpis.filter((e) => e.isActive && e.isCaExpired).length
  const alertasEstoque = allEpis.filter((e) => e.isActive && e.isLowStock).length

  const form = useForm<EpiFormData>({
    resolver: zodResolver(epiSchema),
    defaultValues: { nome: '', caNumber: '', fabricante: '', caExpiry: '', stockQuantity: 0, minStockQuantity: 0, empresaId: '', description: '' },
  })

  function abrirModalNovo() {
    setEditando(null)
    form.reset({ nome: '', caNumber: '', fabricante: '', caExpiry: '', stockQuantity: 0, minStockQuantity: 0, empresaId: '', description: '' })
    setModalAberto(true)
  }

  function abrirModalEditar(epi: EpiItem) {
    setEditando(epi)
    form.reset({
      nome: epi.name,
      caNumber: epi.caNumber,
      fabricante: epi.manufacturer ?? '',
      caExpiry: epi.caExpiry ? epi.caExpiry.split('T')[0] : '',
      stockQuantity: epi.stockQuantity,
      minStockQuantity: epi.minStockQuantity,
      empresaId: epi.companyId,
      description: epi.description ?? '',
    })
    setModalAberto(true)
  }

  async function salvar(data: EpiFormData) {
    if (editando) {
      await updateEpiItem.mutateAsync({
        id: editando.id,
        name: data.nome,
        caNumber: data.caNumber,
        manufacturer: data.fabricante || undefined,
        caExpiry: data.caExpiry || undefined,
        stockQuantity: data.stockQuantity,
        minStockQuantity: data.minStockQuantity,
        description: data.description || undefined,
      })
    } else {
      await createEpiItem.mutateAsync({
        companyId: data.empresaId,
        name: data.nome,
        caNumber: data.caNumber,
        manufacturer: data.fabricante || undefined,
        caExpiry: data.caExpiry || undefined,
        stockQuantity: data.stockQuantity,
        minStockQuantity: data.minStockQuantity,
        description: data.description || undefined,
      })
    }
    setModalAberto(false)
  }

  async function alternarStatus(epi: EpiItem) {
    await updateEpiItem.mutateAsync({ id: epi.id, isActive: !epi.isActive })
  }

  const isSaving = createEpiItem.isPending || updateEpiItem.isPending

  return (
    <>
      <Topbar title="EPIs" subtitle="Catálogo de equipamentos de proteção individual, fichas e movimentações" />

      <div className="p-6 space-y-4">
        {/* Alertas do catálogo */}
        {(alertasCa > 0 || alertasEstoque > 0) && (
          <div className="flex gap-2 flex-wrap">
            {alertasCa > 0 && (
              <div className="flex items-center gap-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-md px-3 py-1.5 text-xs font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                {alertasCa} CA{alertasCa > 1 ? 's' : ''} vencido{alertasCa > 1 ? 's' : ''}
              </div>
            )}
            {alertasEstoque > 0 && (
              <div className="flex items-center gap-2 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-md px-3 py-1.5 text-xs font-medium">
                <Package className="h-3.5 w-3.5" />
                {alertasEstoque} item{alertasEstoque > 1 ? 's' : ''} com estoque baixo
              </div>
            )}
          </div>
        )}

        <Tabs defaultValue="catalogo">
          <TabsList>
            <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
            <TabsTrigger value="fichas">Fichas</TabsTrigger>
            <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
          </TabsList>

          {/* ── Aba: Catálogo ── */}
          <TabsContent value="catalogo" className="space-y-4 mt-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CA ou fabricante..."
                  className="pl-8 h-8 text-xs"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              <Button size="sm" onClick={abrirModalNovo}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Novo EPI
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">EPI</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">CA</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Validade CA</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estoque</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Empresa</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading && (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                            <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin opacity-50" />
                            Carregando EPIs...
                          </td>
                        </tr>
                      )}
                      {isError && (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-destructive text-sm">
                            Erro ao carregar EPIs.
                          </td>
                        </tr>
                      )}
                      {!isLoading && !isError && episFiltrados.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                            <HardHat className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            Nenhum EPI encontrado
                          </td>
                        </tr>
                      )}
                      {episFiltrados.map((epi) => (
                        <tr key={epi.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{epi.name}</p>
                            {epi.manufacturer && (
                              <p className="text-xs text-muted-foreground">{epi.manufacturer}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{epi.caNumber}</td>
                          <td className="px-4 py-3 text-xs">
                            {epi.caExpiry ? (
                              <span className={epi.isCaExpired ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                                {new Date(epi.caExpiry + 'T00:00:00').toLocaleDateString('pt-BR')}
                                {epi.isCaExpired && ' · Vencido'}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <span className={epi.isLowStock ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                              {epi.stockQuantity} {epi.unitOfMeasure}
                              {epi.isLowStock && ' · Baixo'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {companyMap[epi.companyId] ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={epi.isActive ? 'success' : 'secondary'}>
                              {epi.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirModalEditar(epi)} title="Editar">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => alternarStatus(epi)} title={epi.isActive ? 'Desativar' : 'Ativar'}>
                                <Power className={`h-3.5 w-3.5 ${epi.isActive ? 'text-destructive' : 'text-success'}`} />
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
              {episFiltrados.length} EPI{episFiltrados.length !== 1 ? 's' : ''} encontrado{episFiltrados.length !== 1 ? 's' : ''}
            </p>
          </TabsContent>

          {/* ── Aba: Fichas ── */}
          <TabsContent value="fichas" className="space-y-4 mt-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar colaborador..."
                className="pl-8 h-8 text-xs"
                value={buscaFicha}
                onChange={(e) => setBuscaFicha(e.target.value)}
              />
            </div>

            <EmptyModuleState
              icon={HardHat}
              title={buscaFicha ? 'Nenhuma ficha encontrada' : 'Nenhuma ficha de EPI registrada'}
              description="As fichas não exibem mais dados fictícios. Quando houver entregas reais vinculadas a colaboradores da empresa ativa, elas serão listadas aqui."
            />
          </TabsContent>

          {/* ── Aba: Movimentações ── */}
          <TabsContent value="movimentacoes" className="mt-4">
            <EmptyModuleState
              icon={Package}
              title="Nenhuma movimentação registrada"
              description="Esta aba também foi zerada para não simular entradas ou saídas de estoque. As movimentações reais aparecerão aqui quando o fluxo estiver integrado ao backend."
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal criar/editar EPI */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar EPI' : 'Novo EPI'}</DialogTitle>
            <DialogDescription>
              {editando ? 'Atualize os dados do EPI.' : 'Preencha os dados para cadastrar um novo EPI.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(salvar)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nomeEpi">Nome do EPI *</Label>
              <Input id="nomeEpi" placeholder="Ex: Protetor Auricular Tipo Concha" {...form.register('nome')} />
              {form.formState.errors.nome && (
                <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="caNumber">Número do CA *</Label>
                <Input id="caNumber" placeholder="Ex: 25462" {...form.register('caNumber')} />
                {form.formState.errors.caNumber && (
                  <p className="text-xs text-destructive">{form.formState.errors.caNumber.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="caExpiry">Validade do CA</Label>
                <Input id="caExpiry" type="date" {...form.register('caExpiry')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fabricante">Fabricante</Label>
              <Input id="fabricante" placeholder="Ex: 3M do Brasil" {...form.register('fabricante')} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="stockQuantity">Estoque</Label>
                <Input id="stockQuantity" type="number" min="0" {...form.register('stockQuantity')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="minStockQuantity">Estoque Mínimo</Label>
                <Input id="minStockQuantity" type="number" min="0" {...form.register('minStockQuantity')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="empresaIdEpi">Empresa *</Label>
              <select
                id="empresaIdEpi"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                disabled={!!editando}
                {...form.register('empresaId')}
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
              <Label htmlFor="descricaoEpi">Descrição (opcional)</Label>
              <Input id="descricaoEpi" placeholder="Ex: Atenuação mínima de 23dB" {...form.register('description')} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {editando ? 'Salvar Alterações' : 'Cadastrar EPI'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
