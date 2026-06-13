'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight, Loader2, Shield } from 'lucide-react'
import { RiskLevel, RiskType } from '@moby/shared'
import { Topbar } from '@/components/layout/topbar'
import { EmptyModuleState } from '@/components/dashboard/empty-module-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useRisks } from '@/hooks/use-risks'
import { useCompanyStore } from '@/store/company.store'

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

const RISK_LEVEL_VARIANTS: Record<RiskLevel, 'muted' | 'secondary' | 'warning' | 'destructive' | 'success'> = {
  [RiskLevel.NEGLIGIBLE]: 'muted',
  [RiskLevel.LOW]: 'success',
  [RiskLevel.MEDIUM]: 'warning',
  [RiskLevel.HIGH]: 'destructive',
  [RiskLevel.CRITICAL]: 'destructive',
}

function extractMeasures(controlMeasures: string | null) {
  if (!controlMeasures) return []

  return controlMeasures
    .split(/\r?\n|;/)
    .map((measure) => measure.replace(/^[-*•]\s*/, '').trim())
    .filter((measure) => measure.length > 0)
}

function MetricCard({
  label,
  value,
  variant,
}: {
  label: string
  value: number
  variant: 'success' | 'warning' | 'secondary'
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="flex items-center justify-between gap-3">
          <span className="text-3xl font-bold text-foreground">{value}</span>
          <Badge variant={variant}>{label}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ControlesPage() {
  const router = useRouter()
  const { activeCompany, hydrate } = useCompanyStore()
  const [hasHydratedCompany, setHasHydratedCompany] = useState(false)

  useEffect(() => {
    hydrate()
    setHasHydratedCompany(true)
  }, [hydrate])

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useRisks({
    page: 1,
    perPage: 200,
    companyId: activeCompany?.id ?? undefined,
  }, hasHydratedCompany)

  useEffect(() => {
    if (!hasHydratedCompany) return
    void refetch()
  }, [activeCompany?.id, hasHydratedCompany, refetch])

  const risks = data?.data ?? []
  const risksWithMeasures = useMemo(
    () => risks.filter((risk) => risk.controlMeasures && risk.controlMeasures.trim().length > 0),
    [risks],
  )
  const risksWithoutMeasures = useMemo(
    () => risks.filter((risk) => !risk.controlMeasures || risk.controlMeasures.trim().length === 0),
    [risks],
  )
  const controls = useMemo(
    () =>
      risksWithMeasures.flatMap((risk) =>
        extractMeasures(risk.controlMeasures).map((measure, index) => ({
          id: `${risk.id}-${index}`,
          riskId: risk.id,
          riskName: risk.name,
          riskType: risk.type,
          riskLevel: risk.level,
          unitName: risk.unitName,
          jobFunctionName: risk.jobFunctionName,
          isActive: risk.isActive,
          measure,
        })),
      ),
    [risksWithMeasures],
  )

  return (
    <>
      <Topbar
        title="Controles de Risco"
        subtitle={
          activeCompany
            ? `Medidas de controle vinculadas aos riscos da empresa ${activeCompany.tradeName ?? activeCompany.name}`
            : 'Medidas de controle vinculadas aos riscos em seu escopo'
        }
      />

      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Riscos com medidas" value={risksWithMeasures.length} variant="success" />
          <MetricCard label="Riscos sem medidas" value={risksWithoutMeasures.length} variant="warning" />
          <MetricCard label="Medidas cadastradas" value={controls.length} variant="secondary" />
        </div>

        {isLoading && (
          <Card>
            <CardContent className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando medidas de controle...
            </CardContent>
          </Card>
        )}

        {isError && (
          <Card>
            <CardContent className="py-16 text-center text-sm text-destructive">
              Não foi possível carregar as medidas de controle.
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && controls.length === 0 && (
          <EmptyModuleState
            icon={Shield}
            title="Nenhuma medida de controle encontrada"
            description="Os controles exibidos aqui são puxados diretamente do campo de medidas de controle cadastrado em cada risco. Cadastre ou complemente essas medidas no inventário de riscos para visualizá-las nesta área."
            actionLabel="Ir para riscos"
            onAction={() => router.push('/dashboard/gro')}
          />
        )}

        {!isLoading && !isError && controls.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Medida de controle</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Risco de origem</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo / nível</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unidade / função</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {controls.map((control) => (
                      <tr key={control.id} className="border-b border-border align-top last:border-0">
                        <td className="px-4 py-4">
                          <p className="text-sm leading-relaxed text-foreground">{control.measure}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{control.riskName}</p>
                            <Badge variant={control.isActive ? 'success' : 'secondary'}>
                              {control.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-2">
                            <p className="text-muted-foreground">{RISK_TYPE_LABELS[control.riskType]}</p>
                            <Badge variant={RISK_LEVEL_VARIANTS[control.riskLevel]}>
                              {RISK_LEVEL_LABELS[control.riskLevel]}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          <p>{control.unitName}</p>
                          <p className="text-xs opacity-75">{control.jobFunctionName ?? 'Todas as funções'}</p>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/gro')}>
                            Revisar
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && risksWithoutMeasures.length > 0 && (
          <Card className="border-warning/25">
            <CardContent className="flex items-start gap-3 p-5">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">
                  Existem {risksWithoutMeasures.length} risco{risksWithoutMeasures.length !== 1 ? 's' : ''} sem medidas de controle cadastradas.
                </p>
                <p className="text-sm text-muted-foreground">
                  Esses riscos continuam visíveis no GRO, mas não aparecem na lista acima até receberem medidas de controle.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
