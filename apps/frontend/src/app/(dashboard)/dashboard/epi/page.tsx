'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Search, Pencil, Power, HardHat,
  AlertTriangle, Package, Loader2, User,
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

import { useCompanies } from '@/hooks/use-companies'
import { useEmployees } from '@/hooks/use-employees'
import { useEpiItems, useCreateEpiItem, useUpdateEpiItem } from '@/hooks/use-epi-items'
import { useEpiDeliveries, useCreateEpiDelivery } from '@/hooks/use-epi-deliveries'
import type { EpiItem } from '@/lib/api/epi-items.api'
import type { EpiDeliveryReason, EpiDeliveryCondition } from '@/lib/api/epi-deliveries.api'

// ─── Constantes ──────────────────────────────────────────────────────────────

const REASON_LABELS: Record<EpiDeliveryReason, string> = {
  ADMISSION: 'Admissão',
  PERIODIC: 'Periódica',
  REPLACEMENT: 'Reposição',
  FUNCTION_CHANGE: 'Mudança de função',
  CA_RENEWAL: 'Renovação CA',
  OTHER: 'Outro',
}

const CONDITION_LABELS: Record<EpiDeliveryCondition, string> = {
  NEW: 'Novo',
  USED: 'Usado',
}

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

// ─── Schema entrega ───────────────────────────────────────────────────────────

const entregaSchema = z.object({
  empresaId: z.string().uuid('Selecione a empresa'),
  employeeId: z.string().uuid('Selecione o colaborador'),
  epiItemId: z.string().uuid('Selecione o EPI'),
  quantity: z.coerce.number().int().min(1, 'Mínimo 1'),
  deliveredAt: z.string().min(1, 'Informe a data'),
  reason: z.enum(['ADMISSION', 'PERIODIC', 'REPLACEMENT', 'FUNCTION_CHANGE', 'CA_RENEWAL', 'OTHER']),
  condition: z.enum(['NEW', 'USED']),
  deliveredBy: z.string().optional(),
  notes: z.string().optional(),
})
type EntregaFormData = z.infer<typeof entregaSchema>

// ─── Componente principal ─────────────────────────────────────────────────────

export default function EpiPage() {
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const [buscaFicha, setBuscaFicha] = useState('')
  const [filtroEmpresaId, setFiltroEmpresaId] = useState('')
  const [modalEpiAberto, setModalEpiAberto] = useState(false)
  const [modalEntregaAberto, setModalEntregaAberto] = useState(false)
  const [editando, setEditando] = useState<EpiItem | null>(null)
  const [erroEntrega, setErroEntrega] = useState<string | null>(null)

  const { data: companiesData } = useCompanies({ page: 1, perPage: 100 })
  const { data: epiData, isLoading, isError } = useEpiItems({ page: 1, perPage: 100 })
  const { data: deliveriesData, isLoading: loadingDeliveries } = useEpiDeliveries({
    page: 1, perPage: 200,
    companyId: filtroEmpresaId || undefined,
  })
  const createEpiItem = useCreateEpiItem()
  const updateEpiItem = useUpdateEpiItem()
  const createDelivery = useCreateEpiDelivery()

  const companies = companiesData?.data ?? []
  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c.tradeName ?? c.name]))
  const allEpis = epiData?.data ?? []
  const allDeliveries = deliveriesData?.data ?? []

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

  // Fichas: agrupar entregas por colaborador
  const fichasColaboradores = useMemo(() => {
    const map = new Map<string, {
      employeeId: string
      employeeName: string
      totalDeliveries: number
      lastDeliveredAt: string
    }>()
    for (const d of allDeliveries) {
      const ex = map.get(d.employeeId)
      if (!ex) {
        map.set(d.employeeId, {
          employeeId: d.employeeId,
          employeeName: d.employeeName,
          totalDeliveries: 1,
          lastDeliveredAt: d.deliveredAt,
        })
      } else {
        ex.totalDeliveries++
        if (new Date(d.deliveredAt) > new Date(ex.lastDeliveredAt)) {
          ex.lastDeliveredAt = d.deliveredAt
        }
      }
    }
    const lista = Array.from(map.values())
    if (!buscaFicha) return lista
    const t = buscaFicha.toLowerCase()
    return lista.filter((f) => f.employeeName.toLowerCase().includes(t))
  }, [allDeliveries, buscaFicha])

  // Formulário EPI
  const formEpi = useForm<EpiFormData>({
    resolver: zodResolver(epiSchema),
    defaultValues: { nome: '', caNumber: '', fabricante: '', caExpiry: '', stockQuantity: 0, minStockQuantity: 0, empresaId: '', description: '' },
  })

  // Formulário Entrega
  const formEntrega = useForm<EntregaFormData>({
    resolver: zodResolver(entregaSchema),
    defaultValues: {
      empresaId: '', employeeId: '', epiItemId: '',
      quantity: 1,
      deliveredAt: new Date().toISOString().split('T')[0],
      reason: 'ADMISSION', condition: 'NEW',
      deliveredBy: '', notes: '',
    },
  })

  const empresaEntregaId = formEntrega.watch('empresaId')
  const { data: employeesData } = useEmployees({
    page: 1, perPage: 200,
    companyId: empresaEntregaId || undefined,
  })
  const employees = employeesData?.data ?? []
  const episEmpresa = allEpis.filter((e) => e.isActive && e.companyId === empresaEntregaId)

  // EPI — handlers
  function abrirModalNovo() {
    setEditando(null)
    formEpi.reset({ nome: '', caNumber: '', fabricante: '', caExpiry: '', stockQuantity: 0, minStockQuantity: 0, empresaId: '', description: '' })
    setModalEpiAberto(true)
  }

  function abrirModalEditar(epi: EpiItem) {
    setEditando(epi)
    formEpi.reset({
      nome: epi.name, caNumber: epi.caNumber, fabricante: epi.manufacturer ?? '',
      caExpiry: epi.caExpiry ? epi.caExpiry.split('T')[0] : '',
      stockQuantity: epi.stockQuantity, minStockQuantity: epi.minStockQuantity,
      empresaId: epi.companyId, description: epi.description ?? '',
    })
    setModalEpiAberto(true)
  }

  async function salvarEpi(data: EpiFormData) {
    try {
      if (editando) {
        await updateEpiItem.mutateAsync({
          id: editando.id,
          name: data.nome, caNumber: data.caNumber,
          manufacturer: data.fabricante || undefined,
          caExpiry: data.caExpiry || undefined,
          stockQuantity: data.stockQuantity,
          minStockQuantity: data.minStockQuantity,
          description: data.description || undefined,
        })
      } else {
        await createEpiItem.mutateAsync({
          companyId: data.empresaId, name: data.nome, caNumber: data.caNumber,
          manufacturer: data.fabricante || undefined, caExpiry: data.caExpiry || undefined,
          stockQuantity: data.stockQuantity, minStockQuantity: data.minStockQuantity,
          description: data.description || undefined,
        })
      }
      setModalEpiAberto(false)
    } catch {
      // Erro já exibido via toast pelo interceptor do Axios — mantém o modal aberto
    }
  }

  async function alternarStatus(epi: EpiItem) {
    try {
      await updateEpiItem.mutateAsync({ id: epi.id, isActive: !epi.isActive })
    } catch {
      // Erro já exibido via toast pelo interceptor do Axios
    }
  }

  // Entrega — handlers
  function abrirModalEntrega() {
    setErroEntrega(null)
    formEntrega.reset({
      empresaId: filtroEmpresaId, employeeId: '', epiItemId: '',
      quantity: 1,
      deliveredAt: new Date().toISOString().split('T')[0],
      reason: 'ADMISSION', condition: 'NEW',
      deliveredBy: '', notes: '',
    })
    setModalEntregaAberto(true)
  }

  async function salvarEntrega(data: EntregaFormData) {
    setErroEntrega(null)
    try {
      await createDelivery.mutateAsync({
        companyId: data.empresaId,
        employeeId: data.employeeId,
        epiItemId: data.epiItemId,
        quantity: data.quantity,
        deliveredAt: data.deliveredAt,
        reason: data.reason,
        condition: data.condition,
        deliveredBy: data.deliveredBy || undefined,
        notes: data.notes || undefined,
      })
      setModalEntregaAberto(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message
      setErroEntrega(msg ?? 'Erro ao registrar entrega. Verifique o estoque disponível.')
    }
  }

  const isSavingEpi = createEpiItem.isPending || updateEpiItem.isPending
  const selectClass = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50'

  return (
    <>
      <Topbar title="EPIs" subtitle="Catálogo de equipamentos de proteção individual, fichas e movimentações" />

      <div className="p-6 space-y-4">
        {/* Alertas */}
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
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, CA ou fabricante..."
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
                        <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm"><Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin opacity-50" />Carregando EPIs...</td></tr>
                      )}
                      {isError && (
                        <tr><td colSpan={7} className="text-center py-12 text-destructive text-sm">Erro ao carregar EPIs.</td></tr>
                      )}
                      {!isLoading && !isError && episFiltrados.length === 0 && (
                        <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm"><HardHat className="h-8 w-8 mx-auto mb-2 opacity-30" />Nenhum EPI encontrado</td></tr>
                      )}
                      {episFiltrados.map((epi) => (
                        <tr key={epi.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3"><p className="font-medium text-foreground">{epi.name}</p>{epi.manufacturer && <p className="text-xs text-muted-foreground">{epi.manufacturer}</p>}</td>
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
                          <td className="px-4 py-3 text-muted-foreground text-xs">{companyMap[epi.companyId] ?? '—'}</td>
                          <td className="px-4 py-3"><Badge variant={epi.isActive ? 'success' : 'secondary'}>{epi.isActive ? 'Ativo' : 'Inativo'}</Badge></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirModalEditar(epi)} title="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => alternarStatus(epi)} title={epi.isActive ? 'Desativar' : 'Ativar'}><Power className={`h-3.5 w-3.5 ${epi.isActive ? 'text-destructive' : 'text-success'}`} /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">{episFiltrados.length} EPI{episFiltrados.length !== 1 ? 's' : ''} encontrado{episFiltrados.length !== 1 ? 's' : ''}</p>
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

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Colaborador</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qtd. Entregas</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Última entrega</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {loadingDeliveries && (
                        <tr><td colSpan={4} className="text-center py-12 text-muted-foreground text-sm"><Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin opacity-50" />Carregando fichas...</td></tr>
                      )}
                      {!loadingDeliveries && fichasColaboradores.length === 0 && (
                        <tr><td colSpan={4} className="text-center py-12 text-muted-foreground text-sm"><User className="h-8 w-8 mx-auto mb-2 opacity-30" />{buscaFicha ? 'Nenhum colaborador encontrado' : 'Nenhuma entrega de EPI registrada'}</td></tr>
                      )}
                      {fichasColaboradores.map((f) => (
                        <tr
                          key={f.employeeId}
                          className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => router.push(`/dashboard/epi/fichas/${f.employeeId}`)}
                        >
                          <td className="px-4 py-3 font-medium text-foreground">{f.employeeName}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{f.totalDeliveries} entrega{f.totalDeliveries !== 1 ? 's' : ''}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(f.lastDeliveredAt).toLocaleDateString('pt-BR')}</td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="sm" className="h-7 text-xs">Ver ficha →</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Aba: Movimentações ── */}
          <TabsContent value="movimentacoes" className="space-y-4 mt-4">
            <div className="flex items-center justify-between gap-4">
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
              <Button size="sm" onClick={abrirModalEntrega}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Registrar Entrega
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Colaborador</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">EPI</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">CA</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qtd.</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Data</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Motivo</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Devolvido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingDeliveries && (
                        <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm"><Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin opacity-50" />Carregando movimentações...</td></tr>
                      )}
                      {!loadingDeliveries && allDeliveries.length === 0 && (
                        <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm"><Package className="h-8 w-8 mx-auto mb-2 opacity-30" />Nenhuma movimentação registrada</td></tr>
                      )}
                      {allDeliveries.map((d) => (
                        <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground text-xs">{d.employeeName}</td>
                          <td className="px-4 py-3 text-xs"><p className="font-medium text-foreground">{d.epiItemName}</p></td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{d.caNumberSnapshot}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{d.quantity}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(d.deliveredAt).toLocaleDateString('pt-BR')}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{REASON_LABELS[d.reason]}</td>
                          <td className="px-4 py-3"><Badge variant={d.condition === 'NEW' ? 'success' : 'secondary'}>{CONDITION_LABELS[d.condition]}</Badge></td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{d.returnedAt ? new Date(d.returnedAt).toLocaleDateString('pt-BR') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">{allDeliveries.length} movimentaç{allDeliveries.length !== 1 ? 'ões' : 'ão'}</p>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal criar/editar EPI */}
      <Dialog open={modalEpiAberto} onOpenChange={setModalEpiAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar EPI' : 'Novo EPI'}</DialogTitle>
            <DialogDescription>{editando ? 'Atualize os dados do EPI.' : 'Preencha os dados para cadastrar um novo EPI.'}</DialogDescription>
          </DialogHeader>

          <form onSubmit={formEpi.handleSubmit(salvarEpi)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nomeEpi">Nome do EPI *</Label>
              <Input id="nomeEpi" placeholder="Ex: Protetor Auricular Tipo Concha" {...formEpi.register('nome')} />
              {formEpi.formState.errors.nome && <p className="text-xs text-destructive">{formEpi.formState.errors.nome.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="caNumber">Número do CA *</Label>
                <Input id="caNumber" placeholder="Ex: 25462" {...formEpi.register('caNumber')} />
                {formEpi.formState.errors.caNumber && <p className="text-xs text-destructive">{formEpi.formState.errors.caNumber.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="caExpiry">Validade do CA</Label>
                <Input id="caExpiry" type="date" {...formEpi.register('caExpiry')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fabricante">Fabricante</Label>
              <Input id="fabricante" placeholder="Ex: 3M do Brasil" {...formEpi.register('fabricante')} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="stockQuantity">Estoque</Label>
                <Input id="stockQuantity" type="number" min="0" {...formEpi.register('stockQuantity')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="minStockQuantity">Estoque Mínimo</Label>
                <Input id="minStockQuantity" type="number" min="0" {...formEpi.register('minStockQuantity')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="empresaIdEpi">Empresa *</Label>
              <select id="empresaIdEpi" className={selectClass} disabled={!!editando} {...formEpi.register('empresaId')}>
                <option value="">Selecione a empresa</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.tradeName ?? c.name}</option>)}
              </select>
              {formEpi.formState.errors.empresaId && <p className="text-xs text-destructive">{formEpi.formState.errors.empresaId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descricaoEpi">Descrição (opcional)</Label>
              <Input id="descricaoEpi" placeholder="Ex: Atenuação mínima de 23dB" {...formEpi.register('description')} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalEpiAberto(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSavingEpi}>
                {isSavingEpi && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {editando ? 'Salvar Alterações' : 'Cadastrar EPI'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Registrar Entrega */}
      <Dialog open={modalEntregaAberto} onOpenChange={setModalEntregaAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Entrega de EPI</DialogTitle>
            <DialogDescription>Selecione o colaborador e o EPI a ser entregue. O estoque será descontado automaticamente.</DialogDescription>
          </DialogHeader>

          <form onSubmit={formEntrega.handleSubmit(salvarEntrega)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="empresaEntrega">Empresa *</Label>
              <select id="empresaEntrega" className={selectClass}
                {...formEntrega.register('empresaId')}
                onChange={(e) => {
                  formEntrega.setValue('empresaId', e.target.value)
                  formEntrega.setValue('employeeId', '')
                  formEntrega.setValue('epiItemId', '')
                }}>
                <option value="">Selecione a empresa</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.tradeName ?? c.name}</option>)}
              </select>
              {formEntrega.formState.errors.empresaId && <p className="text-xs text-destructive">{formEntrega.formState.errors.empresaId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="employeeEntrega">Colaborador *</Label>
              <select id="employeeEntrega" className={selectClass} disabled={!empresaEntregaId} {...formEntrega.register('employeeId')}>
                <option value="">Selecione o colaborador</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              {formEntrega.formState.errors.employeeId && <p className="text-xs text-destructive">{formEntrega.formState.errors.employeeId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="epiItemEntrega">EPI *</Label>
              <select id="epiItemEntrega" className={selectClass} disabled={!empresaEntregaId} {...formEntrega.register('epiItemId')}>
                <option value="">Selecione o EPI</option>
                {episEmpresa.map((e) => <option key={e.id} value={e.id}>{e.name} (CA {e.caNumber}) — Estoque: {e.stockQuantity}</option>)}
              </select>
              {formEntrega.formState.errors.epiItemId && <p className="text-xs text-destructive">{formEntrega.formState.errors.epiItemId.message}</p>}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="quantityEntrega">Quantidade *</Label>
                <Input id="quantityEntrega" type="number" min="1" {...formEntrega.register('quantity')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deliveredAtEntrega">Data *</Label>
                <Input id="deliveredAtEntrega" type="date" {...formEntrega.register('deliveredAt')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="conditionEntrega">Estado</Label>
                <select id="conditionEntrega" className={selectClass} {...formEntrega.register('condition')}>
                  <option value="NEW">Novo</option>
                  <option value="USED">Usado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="reasonEntrega">Motivo *</Label>
                <select id="reasonEntrega" className={selectClass} {...formEntrega.register('reason')}>
                  {Object.entries(REASON_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deliveredByEntrega">Entregue por</Label>
                <Input id="deliveredByEntrega" placeholder="Nome do responsável" {...formEntrega.register('deliveredBy')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notesEntrega">Observações</Label>
              <Input id="notesEntrega" placeholder="Observações adicionais..." {...formEntrega.register('notes')} />
            </div>

            {erroEntrega && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{erroEntrega}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalEntregaAberto(false)}>Cancelar</Button>
              <Button type="submit" disabled={createDelivery.isPending}>
                {createDelivery.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Registrar Entrega
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
