'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Pencil, Power, ShieldAlert, Loader2 } from 'lucide-react'

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
import { useRisks, useCreateRisk, useUpdateRisk } from '@/hooks/use-risks'
import { useAuthStore } from '@/store/auth.store'
import type { AxiosError } from 'axios'
import type { Risk } from '@/lib/api/risks.api'
import { Permission, RiskType, RiskLevel, RiskProbability, RiskSeverity } from '@moby/shared'

// ─── Constantes ───────────────────────────────────────────────────────────────

const RISK_TYPE_LABELS: Record<RiskType, string> = {
  [RiskType.PHYSICAL]: 'Físico',
  [RiskType.CHEMICAL]: 'Químico',
  [RiskType.BIOLOGICAL]: 'Biológico',
  [RiskType.ERGONOMIC]: 'Ergonômico',
  [RiskType.ACCIDENT]: 'Acidente',
}

const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  [RiskLevel.NEGLIGIBLE]: 'Desprezível',
  [RiskLevel.LOW]: 'Baixo',
  [RiskLevel.MEDIUM]: 'Médio',
  [RiskLevel.HIGH]: 'Alto',
  [RiskLevel.CRITICAL]: 'Crítico',
}

const RISK_PROB_LABELS: Record<RiskProbability, string> = {
  [RiskProbability.RARE]: 'Rara',
  [RiskProbability.UNLIKELY]: 'Improvável',
  [RiskProbability.POSSIBLE]: 'Possível',
  [RiskProbability.LIKELY]: 'Provável',
  [RiskProbability.ALMOST_CERTAIN]: 'Quase certa',
}

const RISK_SEV_LABELS: Record<RiskSeverity, string> = {
  [RiskSeverity.INSIGNIFICANT]: 'Insignificante',
  [RiskSeverity.MINOR]: 'Menor',
  [RiskSeverity.MODERATE]: 'Moderada',
  [RiskSeverity.MAJOR]: 'Maior',
  [RiskSeverity.CATASTROPHIC]: 'Catastrófica',
}

const RISK_LEVEL_VARIANTS: Record<RiskLevel, 'muted' | 'secondary' | 'warning' | 'destructive' | 'success'> = {
  [RiskLevel.NEGLIGIBLE]: 'muted',
  [RiskLevel.LOW]: 'success',
  [RiskLevel.MEDIUM]: 'warning',
  [RiskLevel.HIGH]: 'destructive',
  [RiskLevel.CRITICAL]: 'destructive',
}

const RISK_TYPE_VALUES = Object.values(RiskType) as RiskType[]
const RISK_LEVEL_VALUES = Object.values(RiskLevel) as RiskLevel[]
const RISK_PROB_VALUES = Object.values(RiskProbability) as RiskProbability[]
const RISK_SEV_VALUES = Object.values(RiskSeverity) as RiskSeverity[]

// ─── Schema ──────────────────────────────────────────────────────────────────

const riscoSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  tipo: z.nativeEnum(RiskType),
  nivel: z.nativeEnum(RiskLevel),
  probabilidade: z.nativeEnum(RiskProbability),
  severidade: z.nativeEnum(RiskSeverity),
  empresaId: z.string().uuid('Selecione a empresa'),
  unidadeId: z.string().uuid('Selecione a unidade'),
  funcaoId: z.string().optional(),
  descricao: z.string().optional(),
  medidasControle: z.string().optional(),
})

type RiscoFormData = z.infer<typeof riscoSchema>

// ─── Componente principal ─────────────────────────────────────────────────────

export default function RiscosPage() {
  const [busca, setBusca] = useState('')
  const [filtroEmpresaId, setFiltroEmpresaId] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroNivel, setFiltroNivel] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Risk | null>(null)

  const accessContext = useAuthStore((state) => state.accessContext)

  const { data: companiesData } = useCompanies({ page: 1, perPage: 100 })
  const { data: unitsData } = useUnits({ page: 1, perPage: 100 })
  const { data: functionsData } = useJobFunctions({ page: 1, perPage: 100 })
  const { data: risksData, isLoading, isError, error } = useRisks({
    page: 1,
    perPage: 200,
    companyId: filtroEmpresaId || undefined,
    type: filtroTipo as RiskType || undefined,
    level: filtroNivel as RiskLevel || undefined,
  })
  const createRisk = useCreateRisk()
  const updateRisk = useUpdateRisk()

  const canReadRisks = (accessContext?.available_permissions ?? []).includes('risks.read')
  const riskErrorMessage = (() => {
    if (!isError || !error) return null
    if ((error as AxiosError).isAxiosError) {
      const responseData = (error as AxiosError<{ error?: { message?: string } }>).response?.data
      return responseData?.error?.message || (error as Error).message
    }
    return error instanceof Error ? error.message : 'Erro ao carregar riscos.'
  })()

  const companies = companiesData?.data ?? []
  const allUnits = unitsData?.data ?? []
  const allFunctions = functionsData?.data ?? []
  const allRisks = risksData?.data ?? []

  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c.tradeName ?? c.name]))
  const unitMap = Object.fromEntries(allUnits.map((u) => [u.id, u.name]))
  const functionMap = Object.fromEntries(allFunctions.map((f) => [f.id, f.name]))

  const riscosFiltrados = allRisks.filter((r) => {
    if (!busca) return true
    const t = busca.toLowerCase()
    return (
      r.name.toLowerCase().includes(t) ||
      (r.description ?? '').toLowerCase().includes(t) ||
      RISK_TYPE_LABELS[r.type].toLowerCase().includes(t)
    )
  })

  const form = useForm<RiscoFormData>({
    resolver: zodResolver(riscoSchema),
    defaultValues: {
      nome: '', tipo: RiskType.PHYSICAL, nivel: RiskLevel.MEDIUM,
      probabilidade: RiskProbability.POSSIBLE, severidade: RiskSeverity.MODERATE,
      empresaId: '', unidadeId: '', funcaoId: '', descricao: '', medidasControle: '',
    },
  })

  const empresaIdSelecionada = form.watch('empresaId')
  const unidadesDisponiveis = allUnits.filter((u) => u.companyId === empresaIdSelecionada)
  const funcoesDisponiveis = allFunctions.filter((f) => f.companyId === empresaIdSelecionada)

  const backendFieldMap: Record<string, keyof RiscoFormData> = {
    unitId: 'unidadeId',
    jobFunctionId: 'funcaoId',
    name: 'nome',
    type: 'tipo',
    level: 'nivel',
    probability: 'probabilidade',
    severity: 'severidade',
    description: 'descricao',
    controlMeasures: 'medidasControle',
  }

  function applyValidationErrors(error: unknown) {
    if (!error || typeof error !== 'object' || !('response' in error)) return false
    const axiosError = error as AxiosError
    const apiError = axiosError.response?.data?.error as any
    if (!apiError || apiError.code !== 'VALIDATION_ERROR' || !Array.isArray(apiError.details)) {
      return false
    }

    apiError.details.forEach((detail: any) => {
      const field = backendFieldMap[detail.field]
      if (field) {
        form.setError(field, {
          type: 'server',
          message: detail.message,
        })
      }
    })

    return true
  }

  function abrirModalNovo() {
    setEditando(null)
    form.reset({
      nome: '', tipo: RiskType.PHYSICAL, nivel: RiskLevel.MEDIUM,
      probabilidade: RiskProbability.POSSIBLE, severidade: RiskSeverity.MODERATE,
      empresaId: filtroEmpresaId, unidadeId: '', funcaoId: '', descricao: '', medidasControle: '',
    })
    setModalAberto(true)
  }

  function abrirModalEditar(risco: Risk) {
    setEditando(risco)
    form.reset({
      nome: risco.name,
      tipo: risco.type,
      nivel: risco.level,
      probabilidade: risco.probability,
      severidade: risco.severity,
      empresaId: risco.companyId,
      unidadeId: risco.unitId,
      funcaoId: risco.jobFunctionId ?? '',
      descricao: risco.description ?? '',
      medidasControle: risco.controlMeasures ?? '',
    })
    setModalAberto(true)
  }

  async function salvar(data: RiscoFormData) {
    try {
      if (editando) {
        await updateRisk.mutateAsync({
          id: editando.id,
          name: data.nome,
          type: data.tipo,
          level: data.nivel,
          probability: data.probabilidade,
          severity: data.severidade,
          unitId: data.unidadeId,
          jobFunctionId: data.funcaoId || null,
          description: data.descricao || undefined,
          controlMeasures: data.medidasControle || undefined,
        })
      } else {
        await createRisk.mutateAsync({
          name: data.nome,
          type: data.tipo,
          level: data.nivel,
          probability: data.probabilidade,
          severity: data.severidade,
          unitId: data.unidadeId,
          jobFunctionId: data.funcaoId || null,
          description: data.descricao || undefined,
          controlMeasures: data.medidasControle || undefined,
        })
      }
      setModalAberto(false)
    } catch (error) {
      const handled = applyValidationErrors(error)
      if (handled) return
      // Erro já exibido via toast pelo interceptor do Axios — mantém o modal aberto
    }
  }

  async function alternarStatus(risco: Risk) {
    try {
      await updateRisk.mutateAsync({ id: risco.id, isActive: !risco.isActive })
    } catch {
      // Erro já exibido via toast pelo interceptor do Axios
    }
  }

  const isSaving = createRisk.isPending || updateRisk.isPending

  const selectClass = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <>
      <Topbar title="Riscos Ocupacionais" subtitle="Inventário de riscos do GRO/PGR por unidade e função" />

      <div className="p-6 space-y-4">
        {/* Barra de ações */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou descrição..."
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

            <select
              className="h-8 rounded-md border border-input bg-background px-3 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="">Todos os tipos</option>
              {RISK_TYPE_VALUES.map((t) => (
                <option key={t} value={t}>{RISK_TYPE_LABELS[t]}</option>
              ))}
            </select>

            <select
              className="h-8 rounded-md border border-input bg-background px-3 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              value={filtroNivel}
              onChange={(e) => setFiltroNivel(e.target.value)}
            >
              <option value="">Todos os níveis</option>
              {RISK_LEVEL_VALUES.map((l) => (
                <option key={l} value={l}>{RISK_LEVEL_LABELS[l]}</option>
              ))}
            </select>
          </div>

          <Button size="sm" onClick={abrirModalNovo}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo Risco
          </Button>
        </div>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Risco</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nível</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Probabilidade</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Severidade</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unidade</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                        <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin opacity-50" />
                        Carregando riscos...
                      </td>
                    </tr>
                  )}
                  {isError && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-destructive text-sm">
                        {canReadRisks
                          ? riskErrorMessage ?? 'Erro ao carregar riscos.'
                          : 'Você não tem permissão para visualizar riscos.'}
                      </td>
                    </tr>
                  )}
                  {!isLoading && !isError && riscosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                        <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        Nenhum risco encontrado
                      </td>
                    </tr>
                  )}
                  {riscosFiltrados.map((risco) => (
                    <tr key={risco.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{risco.name}</p>
                        {risco.jobFunctionId && (
                          <p className="text-xs text-muted-foreground">{functionMap[risco.jobFunctionId] ?? '—'}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{RISK_TYPE_LABELS[risco.type]}</td>
                      <td className="px-4 py-3">
                        <Badge variant={RISK_LEVEL_VARIANTS[risco.level]}>
                          {RISK_LEVEL_LABELS[risco.level]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{RISK_PROB_LABELS[risco.probability]}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{RISK_SEV_LABELS[risco.severity]}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        <p>{risco.unitName ?? unitMap[risco.unitId] ?? '—'}</p>
                        {risco.companyName && (
                          <p className="text-[11px] opacity-60">{risco.companyName}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={risco.isActive ? 'success' : 'secondary'}>
                          {risco.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirModalEditar(risco)} title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => alternarStatus(risco)} title={risco.isActive ? 'Desativar' : 'Ativar'}>
                            <Power className={`h-3.5 w-3.5 ${risco.isActive ? 'text-destructive' : 'text-success'}`} />
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
          {riscosFiltrados.length} risco{riscosFiltrados.length !== 1 ? 's' : ''} encontrado{riscosFiltrados.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Modal criar/editar */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Risco' : 'Novo Risco Ocupacional'}</DialogTitle>
            <DialogDescription>
              {editando ? 'Atualize os dados do risco.' : 'Cadastre um novo risco no inventário do GRO.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(salvar)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nomeRisco">Nome do Risco *</Label>
              <Input id="nomeRisco" placeholder="Ex: Exposição a ruído acima de 85 dB" {...form.register('nome')} />
              {form.formState.errors.nome && (
                <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tipoRisco">Tipo *</Label>
                <select id="tipoRisco" className={selectClass} {...form.register('tipo')}>
                  {RISK_TYPE_VALUES.map((t) => (
                    <option key={t} value={t}>{RISK_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="probabilidadeRisco">Probabilidade *</Label>
                <select id="probabilidadeRisco" className={selectClass} {...form.register('probabilidade')}>
                  {RISK_PROB_VALUES.map((p) => (
                    <option key={p} value={p}>{RISK_PROB_LABELS[p]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="severidadeRisco">Severidade *</Label>
                <select id="severidadeRisco" className={selectClass} {...form.register('severidade')}>
                  {RISK_SEV_VALUES.map((s) => (
                    <option key={s} value={s}>{RISK_SEV_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nivelRisco">Nível de Risco *</Label>
              <select id="nivelRisco" className={selectClass} {...form.register('nivel')}>
                {RISK_LEVEL_VALUES.map((l) => (
                  <option key={l} value={l}>{RISK_LEVEL_LABELS[l]}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="empresaIdRisco">Empresa *</Label>
                <select
                  id="empresaIdRisco"
                  className={`${selectClass} disabled:opacity-50`}
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
              <div className="space-y-1.5">
                <Label htmlFor="unidadeIdRisco">Unidade *</Label>
                <select
                  id="unidadeIdRisco"
                  className={`${selectClass} disabled:opacity-50`}
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="funcaoIdRisco">Função (opcional)</Label>
              <select
                id="funcaoIdRisco"
                className={`${selectClass} disabled:opacity-50`}
                disabled={!empresaIdSelecionada}
                {...form.register('funcaoId')}
              >
                <option value="">Todas as funções</option>
                {funcoesDisponiveis.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descricaoRisco">Descrição (opcional)</Label>
              <textarea
                id="descricaoRisco"
                rows={2}
                placeholder="Descreva o agente de risco e as condições de exposição..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                {...form.register('descricao')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="medidasControle">Medidas de Controle (opcional)</Label>
              <textarea
                id="medidasControle"
                rows={2}
                placeholder="Ex: EPI auditivo, enclausuramento acústico, limitação de jornada..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                {...form.register('medidasControle')}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {editando ? 'Salvar Alterações' : 'Cadastrar Risco'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
