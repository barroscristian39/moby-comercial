'use client'

import { FileText } from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { EmptyModuleState } from '@/components/dashboard/empty-module-state'

export default function DocumentosPage() {
  return (
    <>
      <Topbar title="Documentos SST" subtitle="Documentos emitidos e versionados da empresa ativa" />
      <div className="p-6">
        <EmptyModuleState
          icon={FileText}
          title="Nenhum documento emitido"
          description="O módulo foi limpo para operar sem dados mockados. Os documentos reais aparecerão aqui quando forem gerados no ambiente da empresa ativa."
        />
      </div>
    </>
  )
}
