import { describe, expect, it } from 'vitest'

import { detectCli, pickWindowsCandidate } from '../../../electron/ai/cliDetector'

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

describe('pickWindowsCandidate', () => {
  const cases: Array<{ note: string; input: string[]; expected: string | null }> = [
    {
      note: 'mixed unix shim + cmd shim → returns .cmd (Unix shim ignored)',
      input: ['C:\\nvm4w\\nodejs\\codex', 'C:\\nvm4w\\nodejs\\codex.cmd'],
      expected: 'C:\\nvm4w\\nodejs\\codex.cmd',
    },
    {
      note: '.exe then .cmd → .cmd outranks .exe by priority',
      input: ['C:\\path\\codex.exe', 'C:\\path\\codex.cmd'],
      expected: 'C:\\path\\codex.cmd',
    },
    {
      note: '.cmd then .exe → .cmd first either way',
      input: ['C:\\path\\codex.cmd', 'C:\\path\\codex.exe'],
      expected: 'C:\\path\\codex.cmd',
    },
    {
      note: '.exe vs .bat → .exe outranks .bat',
      input: ['C:\\path\\codex.bat', 'C:\\path\\codex.exe'],
      expected: 'C:\\path\\codex.exe',
    },
    {
      note: 'only unsuffixed unix shim → null (falls through to fallbacks)',
      input: ['C:\\nvm4w\\nodejs\\codex'],
      expected: null,
    },
    {
      note: 'lowest-priority .bat alone → still selected',
      input: ['C:\\path\\codex.bat'],
      expected: 'C:\\path\\codex.bat',
    },
    {
      note: 'blank lines and whitespace are normalized',
      input: ['  ', '', '  C:\\path\\codex.cmd  ', ''],
      expected: 'C:\\path\\codex.cmd',
    },
    {
      note: 'case-insensitive extension matching preserves original casing',
      input: ['C:\\path\\codex.CMD'],
      expected: 'C:\\path\\codex.CMD',
    },
  ]

  it.each(cases)('$note', ({ input, expected }) => {
    expect(pickWindowsCandidate(input)).toBe(expected)
  })

  it('empty input → null', () => {
    expect(pickWindowsCandidate([])).toBeNull()
  })

  it('detectCli on Windows uses pickWindowsCandidate via spawnLookup (integration smoke)', async () => {
    // spawnLookup 由 caller 提供，driver test：呼叫者餵 unix shim 路徑時，detectCli 應視為「無命中」
    // 並走 fallback（因為 fallback 的存在性檢查仍由 pathExists 把關）。
    const result = await detectCli('codex', {
      spawnLookup: async () => null, // 模擬 defaultSpawnLookup 對純文字 shim 已過濾為 null
      pathExists: async (p) => p === 'C:\\fallback\\codex.cmd',
      fallbacks: () => ['C:\\fallback\\codex.cmd'],
    })
    expect(result).toBe('C:\\fallback\\codex.cmd')
  })
})
