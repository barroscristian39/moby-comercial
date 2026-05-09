const path = require('path')

// Modo standalone é necessário apenas para builds Docker (Render).
// No Vercel, o framework cuida da otimização nativamente.
const isDockerBuild = process.env.DOCKER_BUILD === '1'

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isDockerBuild && {
    output: 'standalone',
    experimental: {
      outputFileTracingRoot: path.join(__dirname, '../../'),
    },
  }),
  transpilePackages: ['@moby/shared'],
}

module.exports = nextConfig
