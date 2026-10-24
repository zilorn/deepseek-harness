/** Public dsh commands using the immutable runtime carried by the Desktop installation. */

import { basename, delimiter, dirname, join, resolve } from 'node:path'
import { runCli } from '@deepseek-ai/dsh/lib/bin.js'
import { installOfficeEngineResolution } from './office-engine.ts'

/**
 * Locate bundled interpreters beside a prepared tree or outside the packaged app directory or ASAR.
 * @param runtimeDir - Prepared, unpacked or ASAR-contained production DSH package tree.
 * @returns Physical runtime directory containing primary-runtime and the Node launchers.
 */
export function resolveDesktopCliSupportDirectory(runtimeDir: string): string {
  const parent = dirname(runtimeDir)
  const packaged = basename(parent) === 'app' || basename(parent) === 'app.asar'
  return join(packaged ? dirname(parent) : parent, 'runtime')
}

/**
 * Run the ordinary CLI with Desktop's bundled package manager and reserved-profile plugin access.
 * @param runtimeDir - Prepared, unpacked or ASAR-contained production DSH package tree.
 * @param supportDir - Physical Desktop runtime directory containing the primary-runtime payload and Node launchers.
 * @returns Completion of the selected CLI command; profile plugins own their process lifetime.
 */
export async function runDesktopCli(runtimeDir: string, supportDir: string): Promise<void> {
  installOfficeEngineResolution(runtimeDir)
  await runCli({
    manageDesktopProfile: true,
    packageManager: {
      command: process.execPath,
      args: ['--expose-internals', join(supportDir, 'primary-runtime', 'dependencies', 'pnpm', 'bin', 'pnpm.mjs')],
      env: {
        ELECTRON_RUN_AS_NODE: '1',
        DSH_DESKTOP_NODE_EXECUTABLE: process.execPath,
        PATH: `${join(supportDir, 'bin')}${delimiter}${process.env.PATH ?? ''}`,
      },
    },
  })
}

if (import.meta.main) {
  if (process.platform === 'win32') {
    const { installWindowsCliSignals } = await import('./windows-cli-signals.ts')
    await installWindowsCliSignals()
  }
  const runtimeDir = resolve(import.meta.dirname, '../../../..')
  await runDesktopCli(runtimeDir, resolveDesktopCliSupportDirectory(runtimeDir))
}
