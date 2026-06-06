import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MOBY SST',
    short_name: 'MOBY',
    description: 'Plataforma de Seguranca e Saude do Trabalho',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#ffffff',
    lang: 'pt-BR',
    icons: [
      {
        src: '/pwa/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/pwa/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
