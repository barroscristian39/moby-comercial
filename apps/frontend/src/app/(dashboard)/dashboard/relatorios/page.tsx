'use client'

import { BarChart3, Clock, FileCheck2, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Topbar } from '@/components/layout/topbar'

const phaseSixItems = [
  {
    title: 'Relatórios gerenciais',
    description: 'Painéis exportáveis, consolidações por empresa/unidade e indicadores comparativos.',
    icon: BarChart3,
  },
  {
    title: 'eSocial SST',
    description: 'Envios S-2210, S-2220, S-2240, S-3000, recibos e histórico de retorno.',
    icon: FileCheck2,
  },
  {
    title: 'Auditoria avançada',
    description: 'Trilhas detalhadas, filtros por entidade, usuário, período e exportação de evidências.',
    icon: ShieldCheck,
  },
]

export default function RelatoriosPage() {
  return (
    <>
      <Topbar title="Fase 6" subtitle="Relatórios, eSocial e auditoria avançada" />
      <div className="space-y-5 p-6">
        <Card>
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">Em desenvolvimento</h2>
                  <Badge variant="warning">Em breve</Badge>
                </div>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  A Fase 6 ficará para depois. Esta área está reservada para os módulos finais de relatórios,
                  integração com eSocial e auditoria avançada.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {phaseSixItems.map((item) => {
            const Icon = item.icon

            return (
              <Card key={item.title}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="muted">Planejado</Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </>
  )
}
