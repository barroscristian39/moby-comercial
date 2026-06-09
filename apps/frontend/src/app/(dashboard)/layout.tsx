import { Sidebar } from '@/components/layout/sidebar'
import { NavigationProgress } from '@/components/layout/navigation-progress'
import { CompanyGuard } from '@/components/layout/company-guard'
import { MobileDashboardNav } from '@/components/layout/mobile-dashboard-nav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <CompanyGuard>
      <div className="flex min-h-screen overflow-hidden bg-background md:h-screen">
        <div className="hidden md:flex">
          <Sidebar />
        </div>
        {/* relative necessário para o overlay do NavigationProgress se posicionar corretamente */}
        <div className="relative flex flex-1 flex-col overflow-hidden bg-background">
          <NavigationProgress />
          <main className="flex-1 overflow-y-auto bg-background pb-24 md:pb-0">
            {children}
          </main>
          <MobileDashboardNav />
        </div>
      </div>
    </CompanyGuard>
  )
}
