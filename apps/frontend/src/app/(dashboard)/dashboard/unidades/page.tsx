'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Pencil, Power, MapPin, Loader2 } from 'lucide-react'
import { Permission } from '@moby/shared'

import { Topbar } from '@/components/layout/topbar'
import { useAuthStore } from '@/store/auth.store'
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
import { useUnits, useCreateUnit, useUpdateUnit } from '@/hooks/use-units'
import type { Unit } from '@/lib/api/units.api'

// ─── Schema ──────────────────────────────────────────────────────────────────

const unidadeSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  empresaId: z.string().uuid('Selecione uma empresa'),
  addressStreet: z.string().optional(),
  addressNumber: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().length(2, 'UF deve ter 2 letras').optional().or(z.literal('')),
  addressZipCode: z.string().optional(),
})

type UnidadeFormData = z.infer<typeof unidadeSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  return digits.replace(/^(\d{5})(\d)/, '$1-$2')
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function UnidadesPage() {
  const accessContext = useAuthStore((state) => state.accessContext)
  const canManageUnits = (accessContext?.available_permissions ?? []).includes('units.write')
  const [busca, setBusca] = useState('')
  const [filtroEmpresaId, setFiltroEmpresaId] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Unit | null>(null)

  const { data: companiesData } = useCompanies({ page: 1, perPage: 100 })
  const { data: unitsData, isLoading, isError } = useUnits({ page: 1, perPage: 100 })
  const createUnit = useCreateUnit()
  const updateUnit = useUpdateUnit()

  const companies = companiesData?.data ?? []
  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c.tradeName ?? c.name]))

  const allUnits = unitsData?.data ?? []

  const unidadesFiltradas = allUnits.filter((u) => {
    const termo = busca.toLowerCase()
    const matchBusca =
      u.name.toLowerCase().includes(termo) ||
      (u.addressCity ?? '').toLowerCase().includes(termo) ||
      (companyMap[u.companyId] ?? '').toLowerCase().includes(termo)
    const matchEmpresa = filtroEmpresaId ? u.companyId === filtroEmpresaId : true
    return matchBusca && matchEmpresa
  })

  const form = useForm<UnidadeFormData>({
    resolver: zodResolver(unidadeSchema),
    defaultValues: { nome: '', empresaId: '', addressStreet: '', addressNumber: '', addressCity: '', addressState: '', addressZipCode: '' },
  })

  function abrirModalNova() {
    if (!canManageUnits) return
    setEditando(null)
    form.reset({ nome: '', empresaId: '', addressStreet: '', addressNumber: '', addressCity: '', addressState: '', addressZipCode: '' })
    setModalAberto(true)
  }

  function abrirModalEditar(unidade: Unit) {
    if (!canManageUnits) return
    setEditando(unidade)
    form.reset({
      nome: unidade.name,
      empresaId: unidade.companyId,
      addressStreet: unidade.addressStreet ?? '',
      addressNumber: unidade.addressNumber ?? '',
      addressCity: unidade.addressCity ?? '',
      addressState: unidade.addressState ?? '',
      addressZipCode: unidade.addressZipCode ? formatCep(unidade.addressZipCode) : '',
    })
    setModalAberto(true)
  }

  async function salvar(data: UnidadeFormData) {
    if (!canManageUnits) return
    const cepDigits = data.addressZipCode?.replace(/\D/g, '') || undefined

    try {
      if (editando) {
        await updateUnit.mutateAsync({
          id: editando.id,
          name: data.nome,
          addressStreet: data.addressStreet || undefined,
          addressNumber: data.addressNumber || undefined,
          addressCity: data.addressCity || undefined,
          addressState: data.addressState || undefined,
          addressZipCode: cepDigits,
        })
      } else {
        await createUnit.mutateAsync({
          companyId: data.empresaId,
          name: data.nome,
          addressStreet: data.addressStreet || undefined,
          addressNumber: data.addressNumber || undefined,
          addressCity: data.addressCity || undefined,
          addressState: data.addressState || undefined,
          addressZipCode: cepDigits,
        })
      }
      setModalAberto(false)
    } catch {
      // Erro já exibido via toast pelo interceptor do Axios — mantém o modal aberto
    }
  }

  async function alternarStatus(unidade: Unit) {
    if (!canManageUnits) return
    try {
      await updateUnit.mutateAsync({ id: unidade.id, isActive: !unidade.isActive })
    } catch {
      // Erro já exibido via toast pelo interceptor do Axios
    }
  }

  const isSaving = createUnit.isPending || updateUnit.isPending

  return (
    <>
      <Topbar title="Unidades" subtitle="Gerencie as unidades/filiais de cada empresa" />

      <div className="p-6 space-y-4">
        {/* Barra de ações */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou cidade..."
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
          {canManageUnits && (
            <Button size="sm" onClick={abrirModalNova}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Nova Unidade
            </Button>
          )}
        </div>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unidade</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Empresa</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cidade / UF</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                        <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin opacity-50" />
                        Carregando unidades...
                      </td>
                    </tr>
                  )}
                  {isError && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-destructive text-sm">
                        Erro ao carregar unidades.
                      </td>
                    </tr>
                  )}
                  {!isLoading && !isError && unidadesFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        Nenhuma unidade encontrada
                      </td>
                    </tr>
                  )}
                  {unidadesFiltradas.map((unidade) => (
                    <tr key={unidade.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{unidade.name}</p>
                        {unidade.cnpj && (
                          <p className="text-xs text-muted-foreground font-mono">{unidade.cnpj}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {companyMap[unidade.companyId] ?? unidade.companyId}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {[unidade.addressCity, unidade.addressState].filter(Boolean).join(' / ') || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={unidade.isActive ? 'success' : 'secondary'}>
                          {unidade.isActive ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {canManageUnits && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirModalEditar(unidade)} title="Editar">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => alternarStatus(unidade)} title={unidade.isActive ? 'Desativar' : 'Ativar'}>
                                <Power className={`h-3.5 w-3.5 ${unidade.isActive ? 'text-destructive' : 'text-success'}`} />
                              </Button>
                            </>
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

        <p className="text-xs text-muted-foreground">
          {unidadesFiltradas.length} unidade{unidadesFiltradas.length !== 1 ? 's' : ''} encontrada{unidadesFiltradas.length !== 1 ? 's' : ''}
        </p>
      </div>

      {canManageUnits && (
        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar Unidade' : 'Nova Unidade'}</DialogTitle>
              <DialogDescription>
                {editando ? 'Atualize os dados da unidade.' : 'Preencha os dados para cadastrar uma nova unidade.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(salvar)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nomeUnidade">Nome da Unidade *</Label>
                <Input id="nomeUnidade" placeholder="Ex: Filial — Campinas" {...form.register('nome')} />
                {form.formState.errors.nome && (
                  <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="empresaIdUnidade">Empresa *</Label>
                <select
                  id="empresaIdUnidade"
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="addressZipCode">CEP</Label>
                  <Input
                    id="addressZipCode"
                    placeholder="00000-000"
                    maxLength={9}
                    {...form.register('addressZipCode')}
                    onChange={(e) => form.setValue('addressZipCode', formatCep(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="addressNumber">Número</Label>
                  <Input id="addressNumber" placeholder="123" {...form.register('addressNumber')} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="addressStreet">Logradouro</Label>
                <Input id="addressStreet" placeholder="Av. Paulista" {...form.register('addressStreet')} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="addressCity">Cidade</Label>
                  <Input id="addressCity" placeholder="São Paulo" {...form.register('addressCity')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="addressState">UF</Label>
                  <Input
                    id="addressState"
                    placeholder="SP"
                    maxLength={2}
                    {...form.register('addressState')}
                    onChange={(e) => form.setValue('addressState', e.target.value.toUpperCase())}
                  />
                  {form.formState.errors.addressState && (
                    <p className="text-xs text-destructive">{form.formState.errors.addressState.message}</p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  {editando ? 'Salvar Alterações' : 'Cadastrar Unidade'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
