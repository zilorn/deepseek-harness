/** The installed CLI uses the shared pnpm distribution with Electron's package-operation environment. */

import { delimiter, join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { runCli } from '@deepseek-ai/dsh/lib/bin.js'
import { resolveDesktopCliSupportDirectory, runDesktopCli } from '../../desktop-host/src/cli.ts'
import { installOfficeEngineResolution } from '../../desktop-host/src/office-engine.ts'

vi.mock('@deepseek-ai/dsh/lib/bin.js', () => ({ runCli: vi.fn() }))
vi.mock('../../desktop-host/src/office-engine.ts', () => ({ installOfficeEngineResolution: vi.fn() }))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

it.each([
  { name: 'prepared', tree: ['dsh'], resources: [] },
  { name: 'ASAR', tree: ['resources', 'app.asar', 'dsh'], resources: ['resources'] },
  { name: 'unpacked Linux', tree: ['resources', 'app', 'dsh'], resources: ['resources'] },
])('locates bundled pnpm outside the $name application tree', async ({ tree, resources }) => {
  const root = 'Application 中文 with spaces'
  const runtime = join(root, ...tree)
  const support = resolveDesktopCliSupportDirectory(runtime)
  expect(support).toBe(join(root, ...resources, 'runtime'))

  await runDesktopCli(runtime, support)

  expect(runCli).toHaveBeenCalledOnce()
  expect(vi.mocked(runCli).mock.calls[0]?.[0]?.packageManager?.args).toEqual([
    '--expose-internals', join(root, ...resources, 'runtime', 'primary-runtime', 'dependencies', 'pnpm', 'bin', 'pnpm.mjs'),
  ])
})

it.each(['system-bin', undefined])('dispatches with bundled pnpm when PATH is %s', async (path) => {
  vi.stubEnv('PATH', path)
  const runtime = join('Application 中文 with spaces', 'resources', 'app.asar', 'dsh')
  const support = join('Application 中文 with spaces', 'resources', 'runtime')

  await runDesktopCli(runtime, support)

  expect(installOfficeEngineResolution).toHaveBeenCalledExactlyOnceWith(runtime)
  expect(runCli).toHaveBeenCalledExactlyOnceWith({
    manageDesktopProfile: true,
    packageManager: {
      command: process.execPath,
      args: ['--expose-internals', join(support, 'primary-runtime', 'dependencies', 'pnpm', 'bin', 'pnpm.mjs')],
      env: {
        ELECTRON_RUN_AS_NODE: '1',
        DSH_DESKTOP_NODE_EXECUTABLE: process.execPath,
        PATH: `${join(support, 'bin')}${delimiter}${path ?? ''}`,
      },
    },
  })
})
