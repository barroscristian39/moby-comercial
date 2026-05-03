'use client'

import { GraduationCap } from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { EmptyModuleState } from '@/components/dashboard/empty-module-state'

export default function TreinamentosPage() {
  return (
    <>
      <Topbar title="Treinamentos" subtitle="Treinamentos obrigatórios da empresa ativa" />
      <div className="p-6">
        <EmptyModuleState
          icon={GraduationCap}
          title="Nenhum treinamento registrado"
          description="A tela foi zerada para não exibir nenhum treinamento fictício. Os treinamentos reais aparecerão aqui quando esse módulo estiver integrado ao backend produtivo."
        />
      </div>
    </>
  )
}
