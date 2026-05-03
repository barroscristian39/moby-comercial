import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-5xl font-bold text-muted-foreground/30">404</p>
      <h2 className="text-lg font-semibold text-foreground">Página não encontrada.</h2>
      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard">Voltar ao início</Link>
      </Button>
    </div>
  )
}
