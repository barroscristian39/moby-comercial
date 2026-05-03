import { Sidebar } from '@/components/layout/sidebar'
import { NavigationProgress } from '@/components/layout/navigation-progress'
import { CompanyGuard } from '@/components/layout/company-guard'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <CompanyGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        {/* relative necessário para o overlay do NavigationProgress se posicionar corretamente */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          <NavigationProgress />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </CompanyGuard>
  )
}
