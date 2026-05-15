import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSettingsHandlers, registerSettingsHandlers } from '../../../electron/ipc/settingsHandlers'

vi.mock('../../../electron/ai/cliDetector', () => ({
  detectCli: vi.fn(async (name: string) => `/mock/${name}`),
}))

describe('settingsHandlers', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'settings-handlers-test-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('readCli 不存在的設定檔 → 回傳空物件、不丟例外', async () => {
    const handlers = createSettingsHandlers({
      cliSettingsPath: () => join(dir, 'cli.json'),
    })
    const result = await handlers.readCli()
    expect(result).toEqual({ codex: null, claude: null, lastDetectedAt: null })
  })

  it('writeCli → readCli round-trip 一致', async () => {
    const handlers = createSettingsHandlers({
      cliSettingsPath: () => join(dir, 'cli.json'),
    })
    await handlers.writeCli({
      codex: '/usr/bin/codex',
      claude: '/usr/bin/claude',
      lastDetectedAt: '2026-05-15T00:00:00.000Z',
    })
    const result = await handlers.readCli()
    expect(result.codex).toBe('/usr/bin/codex')
    expect(result.claude).toBe('/usr/bin/claude')
  })

  it('autoDetect 觸發 detectCli 並寫盤', async () => {
    const handlers = createSettingsHandlers({
      cliSettingsPath: () => join(dir, 'cli.json'),
      now: () => '2026-05-15T00:00:00.000Z',
    })
    const result = await handlers.autoDetect()
    expect(result).toEqual({
      codex: '/mock/codex',
      claude: '/mock/claude',
      lastDetectedAt: '2026-05-15T00:00:00.000Z',
    })
    const reread = await handlers.readCli()
    expect(reread).toEqual(result)
  })

  it('registerSettingsHandlers 註冊四個 channel', () => {
    const channels: string[] = []
    const ipc = {
      handle(channel: string): void {
        channels.push(channel)
      },
    }
    registerSettingsHandlers(ipc, { cliSettingsPath: () => join(dir, 'cli.json') })
    expect(channels).toEqual([
      'settings:cli:read',
      'settings:cli:write',
      'settings:cli:autoDetect',
      'settings:cli:ensure',
    ])
  })

  it('ensureCli：首次無檔 → autoDetect 兩個 CLI、寫盤', async () => {
    const handlers = createSettingsHandlers({
      cliSettingsPath: () => join(dir, 'cli.json'),
      pathExists: async () => false,
      now: () => '2026-05-15T00:00:00.000Z',
    })
    const result = await handlers.ensureCli()
    expect(result.codex).toBe('/mock/codex')
    expect(result.claude).toBe('/mock/claude')
    expect(result.lastDetectedAt).toBe('2026-05-15T00:00:00.000Z')
  })

  it('ensureCli：持久化檔仍有效 → 直接回傳，不重偵測', async () => {
    const path = join(dir, 'cli.json')
    const handlers = createSettingsHandlers({
      cliSettingsPath: () => path,
      pathExists: async () => true,
      now: () => '2026-05-15T01:00:00.000Z',
    })
    await handlers.writeCli({
      codex: '/manual/codex',
      claude: '/manual/claude',
      lastDetectedAt: '2025-01-01T00:00:00.000Z',
    })
    const result = await handlers.ensureCli()
    expect(result.codex).toBe('/manual/codex')
    expect(result.claude).toBe('/manual/claude')
    expect(result.lastDetectedAt).toBe('2025-01-01T00:00:00.000Z')
  })

  it('ensureCli：持久化路徑失效 → 重新偵測，覆寫', async () => {
    const path = join(dir, 'cli.json')
    const handlers = createSettingsHandlers({
      cliSettingsPath: () => path,
      pathExists: async (p) => p === '/manual/claude',
      now: () => '2026-05-15T02:00:00.000Z',
    })
    await handlers.writeCli({
      codex: '/stale/codex',
      claude: '/manual/claude',
      lastDetectedAt: '2025-01-01T00:00:00.000Z',
    })
    const result = await handlers.ensureCli()
    expect(result.codex).toBe('/mock/codex')
    expect(result.claude).toBe('/manual/claude')
    expect(result.lastDetectedAt).toBe('2026-05-15T02:00:00.000Z')
  })
})
