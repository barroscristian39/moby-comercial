'use client'

import { Shield } from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { EmptyModuleState } from '@/components/dashboard/empty-module-state'

export default function ControlesPage() {
  return (
    <>
      <Topbar title="Controles de Risco" subtitle="Medidas de controle vinculadas aos riscos reais" />
      <div className="p-6">
        <EmptyModuleState
          icon={Shield}
          title="Nenhum controle cadastrado"
          description="A listagem foi limpa para não mostrar controles fictícios. Quando o módulo estiver conectado ao backend definitivo, os controles reais aparecerão aqui de acordo com a empresa ativa."
        />
      </div>
    </>
  )
}
