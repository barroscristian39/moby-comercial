'use client'

import { FileText } from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { EmptyModuleState } from '@/components/dashboard/empty-module-state'

export default function EpiFichaPage() {
  return (
    <>
      <Topbar title="Ficha de EPI" subtitle="Histórico real de entregas por colaborador" />
      <div className="p-6">
        <EmptyModuleState
          icon={FileText}
          title="Nenhuma ficha de EPI disponível"
          description="A ficha detalhada não exibe mais dados mockados. Quando existirem entregas reais registradas para colaboradores da empresa ativa, elas aparecerão aqui."
        />
      </div>
    </>
  )
}
