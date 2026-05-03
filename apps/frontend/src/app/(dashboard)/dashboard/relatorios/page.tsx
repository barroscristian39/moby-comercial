'use client'

import { BarChart3 } from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { EmptyModuleState } from '@/components/dashboard/empty-module-state'

export default function RelatoriosPage() {
  return (
    <>
      <Topbar title="Relatórios" subtitle="Central de relatórios do ambiente ativo" />
      <div className="p-6">
        <EmptyModuleState
          icon={BarChart3}
          title="Nenhum relatório disponível"
          description="A tela foi deixada sem catálogo mockado. Quando os relatórios reais estiverem conectados ao backend, eles passarão a aparecer aqui com base nos dados do tenant e da empresa ativos."
        />
      </div>
    </>
  )
}
