'use client'

import { ShieldAlert } from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { EmptyModuleState } from '@/components/dashboard/empty-module-state'

export default function RiscosPage() {
  return (
    <>
      <Topbar title="Riscos Ocupacionais" subtitle="Inventário real de riscos do GRO/PGR" />
      <div className="p-6">
        <EmptyModuleState
          icon={ShieldAlert}
          title="Nenhum risco cadastrado"
          description="Os riscos mockados foram removidos. Assim que o módulo de GRO estiver operando com dados reais da empresa ativa, este inventário passará a listar apenas registros persistidos no banco."
        />
      </div>
    </>
  )
}
