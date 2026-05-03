'use client'

import { Stethoscope } from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { EmptyModuleState } from '@/components/dashboard/empty-module-state'

export default function ExamesPage() {
  return (
    <>
      <Topbar title="Exames Ocupacionais" subtitle="Controle de exames da empresa ativa" />
      <div className="p-6">
        <EmptyModuleState
          icon={Stethoscope}
          title="Nenhum exame ocupacional cadastrado"
          description="Os registros mockados foram removidos. Este módulo passará a exibir apenas exames reais quando a integração definitiva do backend estiver conectada ao banco da empresa."
        />
      </div>
    </>
  )
}
