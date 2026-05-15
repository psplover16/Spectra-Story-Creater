import { describe, expect, it } from 'vitest'

import { detectCli } from '../../../electron/ai/cliDetector'

describe('detectCli', () => {
  it('PATH 命中且檔案存在 → 回傳 PATH 解析的路徑', async () => {
    const result = await detectCli('codex', {
      spawnLookup: async () => '/usr/local/bin/codex',
      pathExists: async () => true,
      fallbacks: () => [],
    })
    expect(result).toBe('/usr/local/bin/codex')
  })

  it('PATH 落空 + fallback 命中 → 回傳第一個存在的 fallback 路徑', async () => {
    const result = await detectCli('claude', {
      spawnLookup: async () => null,
      pathExists: async (p) => p === '/fallback/claude',
      fallbacks: () => ['/missing/claude', '/fallback/claude', '/another/claude'],
    })
    expect(result).toBe('/fallback/claude')
  })

  it('PATH 落空且 fallback 全部缺檔 → null', async () => {
    const result = await detectCli('codex', {
      spawnLookup: async () => null,
      pathExists: async () => false,
      fallbacks: () => ['/x/codex', '/y/codex'],
    })
    expect(result).toBeNull()
  })

  it('PATH 命中但檔案已不存在 → fallback 命中時回傳 fallback', async () => {
    const result = await detectCli('codex', {
      spawnLookup: async () => '/stale/path/codex',
      pathExists: async (p) => p === '/fallback/codex',
      fallbacks: () => ['/fallback/codex'],
    })
    expect(result).toBe('/fallback/codex')
  })
})
