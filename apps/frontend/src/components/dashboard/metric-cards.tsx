'use client'

import { Card, CardContent } from '@/components/ui/card'
import {
  Building2,
  Users,
  AlertTriangle,
  CheckCircle,
  Stethoscope,
  BookOpen,
  Shield,
  TrendingUp,
  LucideIcon,
} from 'lucide-react'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface MetricCard {
  id: string
  title: string
  value: number
  icon: LucideIcon
  color: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'indigo'
}

interface MetricCardsProps {
  metrics: MetricCard[]
  loading?: boolean
}

// ─── Mapa de cores para cada tipo de métrica ──────────────────────────────────

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  green: 'bg-green-50 text-green-600 border-green-200',
  red: 'bg-red-50 text-red-600 border-red-200',
  orange: 'bg-orange-50 text-orange-600 border-orange-200',
  purple: 'bg-purple-50 text-purple-600 border-purple-200',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
}

const iconColorClasses = {
  blue: 'text-blue-400',
  green: 'text-green-400',
  red: 'text-red-400',
  orange: 'text-orange-400',
  purple: 'text-purple-400',
  indigo: 'text-indigo-400',
}

// ─── Componente de Card Individual ──────────────────────────────────────────

function MetricCardItem({ metric }: { metric: MetricCard }) {
  const IconComponent = metric.icon
  const bgColor = colorClasses[metric.color]
  const iconColor = iconColorClasses[metric.color]

  return (
    <Card className={`border ${bgColor}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {metric.title}
            </p>
            <p className="text-3xl font-bold text-foreground">
              {metric.value.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className={`${iconColor} opacity-30`}>
            <IconComponent className="h-10 w-10" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Componente Principal ──────────────────────────────────────────────────

export function MetricCards({ metrics, loading = false }: MetricCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="h-24 animate-pulse bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <MetricCardItem key={metric.id} metric={metric} />
      ))}
    </div>
  )
}

// ─── Factory para métrica padrão do GRO (reutilizável) ───────────────────────

export function createGROMetrics(): MetricCard[] {
  return [
    {
      id: 'active-environments',
      title: 'Ambientes Ativos',
      value: 0,
      icon: Building2,
      color: 'blue',
    },
    {
      id: 'lives-managed',
      title: 'Vidas Gerenciadas',
      value: 0,
      icon: Users,
      color: 'green',
    },
    {
      id: 'risks',
      title: 'Riscos Identificados',
      value: 0,
      icon: AlertTriangle,
      color: 'red',
    },
    {
      id: 'asos-issued',
      title: "ASO's Emitidos",
      value: 0,
      icon: Stethoscope,
      color: 'orange',
    },
    {
      id: 'trainings-pending',
      title: 'Treinamentos Vencidos',
      value: 0,
      icon: BookOpen,
      color: 'red',
    },
    {
      id: 'epis-pending',
      title: 'EPIs Vencidos',
      value: 0,
      icon: Shield,
      color: 'red',
    },
    {
      id: 'exams-pending',
      title: 'Exames Vencidos',
      value: 0,
      icon: Stethoscope,
      color: 'orange',
    },
    {
      id: 'actions-open',
      title: 'Ações Abertas',
      value: 0,
      icon: TrendingUp,
      color: 'purple',
    },
  ]
}
