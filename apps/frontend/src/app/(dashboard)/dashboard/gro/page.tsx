'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertTriangle,
  Building2,
  Gauge,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Power,
  Search,
  Shield,
} from 'lucide-react'
import {
  Permission,
  RiskLevel,
  RiskProbability,
  RiskSeverity,
  RiskType,
} from '@moby/shared'

import { useCompanyStore } from '@/store/company.store'
import { useAuthStore } from '@/store/auth.store'
import { Topbar } from '@/components/layout/topbar'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MetricCards } from '@/components/dashboard/metric-cards'
import { useUnits } from '@/hooks/use-units'
import { useJobFunctions } from '@/hooks/use-job-functions'
import { useCreateRisk, useRisks, useUpdateRisk } from '@/hooks/use-risks'
import type { Risk } from '@/lib/api/risks.api'

const riskSchema = z.object({
  unitId: z.string().uuid('Selecione uma unidade'),
  jobFunctionId: z.string().optional(),
  name: z.string().trim().min(2, 'Informe o risco com pelo menos 2 caracteres'),
  type: z.nativeEnum(RiskType, { message: 'Selecione o tipo do risco' }),
  level: z.nativeEnum(RiskLevel, { message: 'Selecione o nível do risco' }),
  probability: z.nativeEnum(RiskProbability, { message: 'Selecione a probabilidade' }),
  severity: z.nativeEnum(RiskSeverity, { message: 'Selecione a severidade' }),
  description: z.string().trim().max(2000, 'A descrição deve ter no máximo 2000 caracteres').optional(),
  controlMeasures: z.string().trim().max(2000, 'As medidas devem ter no máximo 2000 caracteres').optional(),
  isActive: z.boolean(),
})

type RiskFormData = z.infer<typeof riskSchema>

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

const RISK_PROBABILITY_LABELS: Record<RiskProbability, string> = {
  [RiskProbability.RARE]: 'Rara',
  [RiskProbability.UNLIKELY]: 'Improvável',
  [RiskProbability.POSSIBLE]: 'Possível',
  [RiskProbability.LIKELY]: 'Provável',
  [RiskProbability.ALMOST_CERTAIN]: 'Quase certa',
}

const RISK_SEVERITY_LABELS: Record<RiskSeverity, string> = {
  [RiskSeverity.INSIGNIFICANT]: 'Insignificante',
  [RiskSeverity.MINOR]: 'Leve',
  [RiskSeverity.MODERATE]: 'Moderada',
  [RiskSeverity.MAJOR]: 'Grave',
  [RiskSeverity.CATASTROPHIC]: 'Catastrófica',
}

export default function GRODashboardPage() {
  const router = useRouter()
  const { activeCompany, hydrate } = useCompanyStore()
  const accessContext = useAuthStore((state) => state.accessContext)
  const canManageRisks = (accessContext?.available_permissions ?? []).includes(Permission.RISKS_WRITE)

  const [search, setSearch] = useState('')
  const [unitFilter, setUnitFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (!activeCompany) {
      router.push('/dashboard/empresas')
    }
  }, [activeCompany, router])

  const { data: unitsData } = useUnits(
    activeCompany ? { page: 1, perPage: 100, companyId: activeCompany.id } : undefined,
  )
  const { data: functionsData } = useJobFunctions({ page: 1, perPage: 100 })
  const { data: risksData, isLoading, isError, refetch } = useRisks(
    activeCompany
      ? {
          page: 1,
          perPage: 100,
          companyId: activeCompany.id,
          unitId: unitFilter || undefined,
          search: search || undefined,
          isActive: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
        }
      : undefined,
    !!activeCompany,
  )
  const createRisk = useCreateRisk()
  const updateRisk = useUpdateRisk()

  const units = unitsData?.data ?? []
  const allFunctions = functionsData?.data ?? []
  const risks = risksData?.data ?? []

  const form = useForm<RiskFormData>({
    resolver: zodResolver(riskSchema),
    defaultValues: {
      unitId: '',
      jobFunctionId: '',
      name: '',
      type: RiskType.PHYSICAL,
      level: RiskLevel.MEDIUM,
      probability: RiskProbability.POSSIBLE,
      severity: RiskSeverity.MODERATE,
      description: '',
      controlMeasures: '',
      isActive: true,
    },
  })

  const selectedUnitId = form.watch('unitId')
  const availableFunctions = useMemo(() => {
    if (!activeCompany) return []
    return allFunctions.filter((jobFunction) => {
      const sameCompany = jobFunction.companyId === activeCompany.id
      if (!sameCompany || !jobFunction.isActive) return false
      if (!selectedUnitId) return true
      return (jobFunction.unitIds ?? []).includes(selectedUnitId)
    })
  }, [activeCompany, allFunctions, selectedUnitId])

  const metrics = useMemo(() => {
    const activeRisks = risks.filter((risk) => risk.isActive)
    const criticalRisks = activeRisks.filter((risk) => risk.level === RiskLevel.CRITICAL)
    const highOrCritical = activeRisks.filter((risk) =>
      risk.level === RiskLevel.HIGH || risk.level === RiskLevel.CRITICAL,
    )
    const coveredUnits = new Set(activeRisks.map((risk) => risk.unitId))

    return [
      {
        id: 'risks-total',
        title: 'Riscos Cadastrados',
        value: risks.length,
        icon: AlertTriangle,
        color: 'red' as const,
      },
      {
        id: 'risks-active',
        title: 'Riscos Ativos',
        value: activeRisks.length,
        icon: Shield,
        color: 'green' as const,
      },
      {
        id: 'risks-critical',
        title: 'Altos / Críticos',
        value: highOrCritical.length,
        icon: Gauge,
        color: 'orange' as const,
      },
      {
        id: 'risks-units',
        title: 'Unidades Cobertas',
        value: coveredUnits.size,
        icon: Building2,
        color: criticalRisks.length > 0 ? 'orange' as const : 'blue' as const,
      },
    ]
  }, [risks])

  function sairDaEmpresa() {
    useCompanyStore.setState({ activeCompany: null })
    router.push('/dashboard/empresas')
  }

  function abrirModalNovo() {
    if (!canManageRisks) return
    setEditingRisk(null)
    form.reset({
      unitId: '',
      jobFunctionId: '',
      name: '',
      type: RiskType.PHYSICAL,
      level: RiskLevel.MEDIUM,
      probability: RiskProbability.POSSIBLE,
      severity: RiskSeverity.MODERATE,
      description: '',
      controlMeasures: '',
      isActive: true,
    })
    setModalOpen(true)
  }

  function abrirModalEditar(risk: Risk) {
    if (!canManageRisks) return
    setEditingRisk(risk)
    form.reset({
      unitId: risk.unitId,
      jobFunctionId: risk.jobFunctionId ?? '',
      name: risk.name,
      type: risk.type,
      level: risk.level,
      probability: risk.probability,
      severity: risk.severity,
      description: risk.description ?? '',
      controlMeasures: risk.controlMeasures ?? '',
      isActive: risk.isActive,
    })
    setModalOpen(true)
  }

  async function salvar(data: RiskFormData) {
    const payload = {
      unitId: data.unitId,
      jobFunctionId: data.jobFunctionId || null,
      name: data.name.trim(),
      type: data.type,
      level: data.level,
      probability: data.probability,
      severity: data.severity,
      description: data.description?.trim() || undefined,
      controlMeasures: data.controlMeasures?.trim() || undefined,
    }

    try {
      if (editingRisk) {
        await updateRisk.mutateAsync({
          id: editingRisk.id,
          ...payload,
          isActive: data.isActive,
        })
      } else {
        await createRisk.mutateAsync(payload)
      }

      setModalOpen(false)
      await refetch()
    } catch {
      // Erro já exibido via toast pelo interceptor do Axios — mantém o modal aberto
    }
  }

  async function alternarStatus(risk: Risk) {
    if (!canManageRisks) return
    try {
      await updateRisk.mutateAsync({
        id: risk.id,
        isActive: !risk.isActive,
      })
    } catch {
      // Erro já exibido via toast pelo interceptor do Axios
    }
  }

  function badgeVariantForLevel(level: RiskLevel) {
    if (level === RiskLevel.CRITICAL) return 'destructive' as const
    if (level === RiskLevel.HIGH) return 'warning' as const
    if (level === RiskLevel.MEDIUM) return 'secondary' as const
    return 'outline' as const
  }

  const isSaving = createRisk.isPending || updateRisk.isPending
  const hasUnits = units.length > 0

  return (
    <>
      <Topbar
        title={activeCompany?.name || 'GRO'}
        subtitle={activeCompany?.cnpj ? `CNPJ: ${activeCompany.cnpj}` : 'Gestão de riscos ocupacionais'}
      />

      <div className="p-6 space-y-6">
        <div className="flex justify-between gap-3">
          <div className="space-y-1.5">
            <p className="text-base font-semibold text-foreground">Riscos ocupacionais</p>
            <p className="text-sm text-muted-foreground">
              Cadastre, revise e acompanhe os riscos reais da empresa ativa para iniciar a gestão do GRO.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={sairDaEmpresa}
            className="gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            Selecionar outra empresa
          </Button>
        </div>

        {!hasUnits && !isLoading && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            Cadastre pelo menos uma unidade nesta empresa antes de lançar riscos no GRO.
          </div>
        )}

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Resumo de Riscos
          </h2>
          <MetricCards metrics={metrics} loading={isLoading} />
        </div>

        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">Cadastro e Gestão de Riscos</CardTitle>
              {canManageRisks && (
                <Button size="sm" onClick={abrirModalNovo} disabled={!hasUnits}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Novo Risco
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar risco, descrição ou controle..."
                  className="h-8 pl-8 text-xs"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <select
                className="h-8 rounded-md border border-input bg-background px-3 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={unitFilter}
                onChange={(event) => setUnitFilter(event.target.value)}
              >
                <option value="">Todas as unidades</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))}
              </select>

              <select
                className="h-8 rounded-md border border-input bg-background px-3 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
              >
                <option value="ALL">Todos os status</option>
                <option value="ACTIVE">Somente ativos</option>
                <option value="INACTIVE">Somente inativos</option>
              </select>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Risco</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Unidade / Função</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Criticidade</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Atualização</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                        <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin opacity-50" />
                        Carregando riscos...
                      </td>
                    </tr>
                  )}

                  {isError && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-destructive">
                        Erro ao carregar os riscos desta empresa.
                      </td>
                    </tr>
                  )}

                  {!isLoading && !isError && risks.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                        <AlertTriangle className="mx-auto mb-2 h-8 w-8 opacity-30" />
                        Nenhum risco cadastrado ainda.
                      </td>
                    </tr>
                  )}

                  {risks.map((risk) => (
                    <tr key={risk.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-foreground">{risk.name}</p>
                        {risk.description && (
                          <p className="mt-1 max-w-md text-xs text-muted-foreground line-clamp-2">
                            {risk.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                        {RISK_TYPE_LABELS[risk.type]}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="text-xs font-medium text-foreground">{risk.unitName}</p>
                        <p className="text-xs text-muted-foreground">{risk.jobFunctionName ?? 'Todas as funções da unidade'}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1">
                          <Badge variant={badgeVariantForLevel(risk.level)}>
                            {RISK_LEVEL_LABELS[risk.level]}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {RISK_PROBABILITY_LABELS[risk.probability]} / {RISK_SEVERITY_LABELS[risk.severity]}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Badge variant={risk.isActive ? 'success' : 'secondary'}>
                          {risk.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                        {new Date(risk.updatedAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center justify-end gap-1">
                          {canManageRisks && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => abrirModalEditar(risk)}
                                title="Editar risco"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => alternarStatus(risk)}
                                title={risk.isActive ? 'Desativar risco' : 'Ativar risco'}
                              >
                                <Power className={`h-3.5 w-3.5 ${risk.isActive ? 'text-destructive' : 'text-success'}`} />
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
      </div>

      {canManageRisks && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingRisk ? 'Editar Risco' : 'Novo Risco'}</DialogTitle>
              <DialogDescription>
                Cadastre o risco ocupacional e vincule-o à unidade da empresa ativa.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(salvar)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="riskName">Risco / Agente *</Label>
                  <Input
                    id="riskName"
                    placeholder="Ex: Ruído contínuo acima de 85 dB"
                    {...form.register('name')}
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="riskType">Tipo *</Label>
                  <select
                    id="riskType"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    {...form.register('type')}
                  >
                    {Object.values(RiskType).map((type) => (
                      <option key={type} value={type}>{RISK_TYPE_LABELS[type]}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="riskUnit">Unidade *</Label>
                  <select
                    id="riskUnit"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    {...form.register('unitId')}
                    onChange={(event) => {
                      form.setValue('unitId', event.target.value, { shouldValidate: true })
                      form.setValue('jobFunctionId', '')
                    }}
                  >
                    <option value="">Selecione a unidade</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                  {form.formState.errors.unitId && (
                    <p className="text-xs text-destructive">{form.formState.errors.unitId.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="riskFunction">Função vinculada</Label>
                  <select
                    id="riskFunction"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    disabled={!selectedUnitId}
                    {...form.register('jobFunctionId')}
                  >
                    <option value="">Todas as funções da unidade</option>
                    {availableFunctions.map((jobFunction) => (
                      <option key={jobFunction.id} value={jobFunction.id}>{jobFunction.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="riskLevel">Nível *</Label>
                  <select
                    id="riskLevel"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    {...form.register('level')}
                  >
                    {Object.values(RiskLevel).map((level) => (
                      <option key={level} value={level}>{RISK_LEVEL_LABELS[level]}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="riskProbability">Probabilidade *</Label>
                  <select
                    id="riskProbability"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    {...form.register('probability')}
                  >
                    {Object.values(RiskProbability).map((probability) => (
                      <option key={probability} value={probability}>{RISK_PROBABILITY_LABELS[probability]}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="riskSeverity">Severidade *</Label>
                  <select
                    id="riskSeverity"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    {...form.register('severity')}
                  >
                    {Object.values(RiskSeverity).map((severity) => (
                      <option key={severity} value={severity}>{RISK_SEVERITY_LABELS[severity]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="riskDescription">Descrição</Label>
                <textarea
                  id="riskDescription"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  placeholder="Descreva a fonte, exposição ou contexto do risco..."
                  {...form.register('description')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="riskControls">Medidas de controle</Label>
                <textarea
                  id="riskControls"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  placeholder="Ex: enclausuramento, EPC, EPI, procedimento, treinamento..."
                  {...form.register('controlMeasures')}
                />
              </div>

              {editingRisk && (
                <label className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={form.watch('isActive')}
                    onChange={(event) => form.setValue('isActive', event.target.checked)}
                  />
                  Risco ativo
                </label>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  {editingRisk ? 'Salvar Alterações' : 'Cadastrar Risco'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
