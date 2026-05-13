import { describe, expect, it } from 'vitest'

import { probeCli, type CliProbeRunner } from '@/services/ai/cliDetection'

function makeRunner(overrides: Partial<CliProbeRunner>): CliProbeRunner {
  return {
    exists: async () => true,
    isExecutable: async () => true,
    resolvePath: async () => '/usr/local/bin/codex',
    ...overrides,
  }
}

describe('probeCli', () => {
  it('已安裝 → installed', async () => {
    const r = await probeCli('codex', makeRunner({}))
    expect(r.kind).toBe('installed')
  })

  it('找不到 → not-found', async () => {
    const r = await probeCli('claude', makeRunner({ resolvePath: async () => null }))
    expect(r.kind).toBe('not-found')
  })

  it('找到但無執行權限 → no-execute-permission', async () => {
    const r = await probeCli('codex', makeRunner({ isExecutable: async () => false }))
    expect(r.kind).toBe('no-execute-permission')
  })
})
