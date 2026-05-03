const { spawn } = require('child_process')

const nextBin = require.resolve('next/dist/bin/next')
const nextArgs = process.argv.slice(2)
const cleanEnv = { ...process.env }

// pnpm injects npm/pnpm config variables into lifecycle scripts. Next may spawn
// npm internally, which causes noisy "Unknown env config" warnings on Windows.
for (const key of Object.keys(cleanEnv)) {
  if (key.startsWith('npm_config_') || key.startsWith('pnpm_config_')) {
    delete cleanEnv[key]
  }
}

const child = spawn(process.execPath, [nextBin, ...nextArgs], {
  stdio: 'inherit',
  env: cleanEnv,
})

child.on('error', (error) => {
  console.error(error)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
