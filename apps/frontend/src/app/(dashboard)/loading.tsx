// Exibido automaticamente pelo Next.js App Router durante a navegação entre páginas

export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
      {/* Spinner circular */}
      <div className="h-10 w-10 rounded-full border-4 border-muted border-t-primary animate-spin" />
      <p className="text-sm font-medium">Carregando página...</p>
    </div>
  )
}
