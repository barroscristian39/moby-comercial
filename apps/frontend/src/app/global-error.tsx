'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <h2 className="text-lg font-semibold">Erro crítico na aplicação.</h2>
        <button
          onClick={reset}
          className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
        >
          Tentar novamente
        </button>
      </body>
    </html>
  )
}
