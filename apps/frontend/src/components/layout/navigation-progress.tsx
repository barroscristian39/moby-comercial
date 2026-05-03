'use client'

// Spinner de navegação — exibido no centro da área de conteúdo
// enquanto o Next.js carrega a próxima página entre cliques no sidebar

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useNavigationStore } from '@/store/navigation.store'

export function NavigationProgress() {
  const { isLoading, setLoading } = useNavigationStore()
  const pathname = usePathname()

  // Desativa o spinner assim que o pathname muda — página foi carregada
  useEffect(() => {
    setLoading(false)
  }, [pathname, setLoading])

  if (!isLoading) return null

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-background/60 backdrop-blur-sm text-muted-foreground">
      <div className="h-10 w-10 rounded-full border-4 border-muted border-t-primary animate-spin" />
      <p className="text-sm font-medium">Carregando página...</p>
    </div>
  )
}
