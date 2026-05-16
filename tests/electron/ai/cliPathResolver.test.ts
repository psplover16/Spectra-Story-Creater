import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  isUsableCliPath,
  resolveCliPath,
  type CliPathResolverDeps,
} from '../../../electron/ai/cliPathResolver'
import type { CliSettings } from '@/services/files/cliSettingsRepository'

describe('isUsableCliPath truth table', () => {
  let originalPlatform: NodeJS.Platform

  beforeEach(() => {
    originalPlatform = process.platform
  })
  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
  })

  function setPlatform(p: NodeJS.Platform): void {
    Object.defineProperty(process, 'platform', { value: p, configurable: true })
  }

  const cases: Array<{ platform: NodeJS.Platform; path: string; expected: boolean; note: string }> = [
    { platform: 'win32', path: 'C:\\a\\codex.cmd', expected: true, note: 'win .cmd lowercase' },
    { platform: 'win32', path: 'C:\\a\\codex.CMD', expected: true, note: 'win .CMD uppercase' },
    { platform: 'win32', path: 'C:\\a\\codex.exe', expected: true, note: 'win .exe' },
    { platform: 'win32', path: 'C:\\a\\codex.bat', expected: true, note: 'win .bat' },
    { platform: 'win32', path: 'C:\\nvm4w\\nodejs\\codex', expected: false, note: 'win unsuffixed unix shim' },
    { platform: 'win32', path: 'C:\\a\\codex.ps1', expected: false, note: 'win .ps1 not in scope' },
    { platform: 'win32', path: 'C:\\a\\codex.txt', expected: false, note: 'win arbitrary extension' },
    { platform: 'linux', path: '/usr/local/bin/codex', expected: true, note: 'linux unsuffixed accepted' },
    { platform: 'linux', path: '/usr/local/bin/codex.sh', expected: true, note: 'linux .sh accepted' },
    { platform: 'darwin', path: '/opt/homebrew/bin/codex', expected: true, note: 'darwin unsuffixed accepted' },
    { platform: 'darwin', path: '/opt/homebrew/bin/codex.cmd', expected: true, note: 'darwin .cmd accepted (no ext rule)' },
  ]

  it.each(cases)('$platform | $path → $expected ($note)', ({ platform, path, expected }) => {
    setPlatform(platform)
    expect(isUsableCliPath(path)).toBe(expected)
  })
})

describe('resolveCliPath', () => {
  let originalPlatform: NodeJS.Platform

  beforeEach(() => {
    originalPlatform = process.platform
  })
  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
  })

  function setPlatform(p: NodeJS.Platform): void {
    Object.defineProperty(process, 'platform', { value: p, configurable: true })
  }

  function makeDeps(overrides: Partial<CliPathResolverDeps> & { settings?: CliSettings }): {
    deps: CliPathResolverDeps
    writeSettings: ReturnType<typeof vi.fn>
    detect: ReturnType<typeof vi.fn>
    pathExists: ReturnType<typeof vi.fn>
    readSettings: ReturnType<typeof vi.fn>
  } {
    const settings: CliSettings = overrides.settings ?? {
      codex: null,
      claude: null,
      lastDetectedAt: null,
    }
    const readSettings = vi.fn(async () => settings)
    const writeSettings = vi.fn(async (_p: string, _s: CliSettings) => {})
    const detect = vi.fn(async (_n: 'codex' | 'claude') => null as string | null)
    const pathExists = vi.fn(async (_p: string) => true)
    const deps: CliPathResolverDeps = {
      cliJsonPath: overrides.cliJsonPath ?? (() => '/fake/cli.json'),
      readSettings: overrides.readSettings ?? readSettings,
      writeSettings: overrides.writeSettings ?? writeSettings,
      detect: overrides.detect ?? detect,
      pathExists: overrides.pathExists ?? pathExists,
      nowIso: overrides.nowIso ?? (() => '2026-05-16T03:30:00.000Z'),
    }
    return {
      deps,
      writeSettings: (overrides.writeSettings ?? writeSettings) as ReturnType<typeof vi.fn>,
      detect: (overrides.detect ?? detect) as ReturnType<typeof vi.fn>,
      pathExists: (overrides.pathExists ?? pathExists) as ReturnType<typeof vi.fn>,
      readSettings: (overrides.readSettings ?? readSettings) as ReturnType<typeof vi.fn>,
    }
  }

  it('Windows + codex 壞 cache (無副檔名) + detect 回 .cmd → 回 .cmd 並覆寫 cli.json (codex 改、claude 不動、lastDetectedAt 更新)', async () => {
    setPlatform('win32')
    const { deps, writeSettings, detect, pathExists } = makeDeps({
      settings: {
        codex: 'C:\\nvm4w\\nodejs\\codex',
        claude: 'C:\\nvm4w\\nodejs\\claude.cmd',
        lastDetectedAt: '2026-05-15T18:31:26.968Z',
      },
      detect: vi.fn(async (n) => (n === 'codex' ? 'C:\\nvm4w\\nodejs\\codex.cmd' : null)),
      pathExists: vi.fn(async () => true),
    })
    const result = await resolveCliPath('codex', deps)
    expect(result).toBe('C:\\nvm4w\\nodejs\\codex.cmd')
    expect(detect).toHaveBeenCalledWith('codex')
    expect(pathExists).not.toHaveBeenCalled()
    expect(writeSettings).toHaveBeenCalledTimes(1)
    const writtenSettings = writeSettings.mock.calls[0][1] as CliSettings
    expect(writtenSettings.codex).toBe('C:\\nvm4w\\nodejs\\codex.cmd')
    expect(writtenSettings.claude).toBe('C:\\nvm4w\\nodejs\\claude.cmd')
    expect(writtenSettings.lastDetectedAt).toBe('2026-05-16T03:30:00.000Z')
  })

  it('Windows + claude 壞 cache (無副檔名) + detect 回 .cmd → 對等行為 (claude 改、codex 不動)', async () => {
    setPlatform('win32')
    const { deps, writeSettings } = makeDeps({
      settings: {
        codex: 'C:\\nvm4w\\nodejs\\codex.cmd',
        claude: 'C:\\nvm4w\\nodejs\\claude',
        lastDetectedAt: '2026-05-15T18:31:26.968Z',
      },
      detect: vi.fn(async (n) => (n === 'claude' ? 'C:\\nvm4w\\nodejs\\claude.cmd' : null)),
    })
    const result = await resolveCliPath('claude', deps)
    expect(result).toBe('C:\\nvm4w\\nodejs\\claude.cmd')
    const writtenSettings = writeSettings.mock.calls[0][1] as CliSettings
    expect(writtenSettings.claude).toBe('C:\\nvm4w\\nodejs\\claude.cmd')
    expect(writtenSettings.codex).toBe('C:\\nvm4w\\nodejs\\codex.cmd')
  })

  it('Windows + 好 cache (.cmd) + pathExists 通過 → 直接回，不呼叫 detect 或 writeSettings', async () => {
    setPlatform('win32')
    const { deps, writeSettings, detect, pathExists } = makeDeps({
      settings: {
        codex: 'C:\\path\\codex.cmd',
        claude: null,
        lastDetectedAt: '2026-05-15T18:31:26.968Z',
      },
      pathExists: vi.fn(async () => true),
    })
    const result = await resolveCliPath('codex', deps)
    expect(result).toBe('C:\\path\\codex.cmd')
    expect(pathExists).toHaveBeenCalledWith('C:\\path\\codex.cmd')
    expect(detect).not.toHaveBeenCalled()
    expect(writeSettings).not.toHaveBeenCalled()
  })

  it('Windows + stale 好 cache (.cmd 檔不存在) + detect 回新 .cmd → 覆寫 + 回新 path', async () => {
    setPlatform('win32')
    const { deps, writeSettings } = makeDeps({
      settings: {
        codex: 'C:\\stale\\codex.cmd',
        claude: null,
        lastDetectedAt: '2026-05-01T00:00:00.000Z',
      },
      pathExists: vi.fn(async (p) => p === 'C:\\new\\codex.cmd'),
      detect: vi.fn(async () => 'C:\\new\\codex.cmd'),
    })
    const result = await resolveCliPath('codex', deps)
    expect(result).toBe('C:\\new\\codex.cmd')
    const writtenSettings = writeSettings.mock.calls[0][1] as CliSettings
    expect(writtenSettings.codex).toBe('C:\\new\\codex.cmd')
  })

  it('Windows + 壞 cache + detect 回 null → 回 null 且 writeSettings 仍寫 codex=null (打破壞 cache 迴圈)', async () => {
    setPlatform('win32')
    const { deps, writeSettings } = makeDeps({
      settings: {
        codex: 'C:\\nvm4w\\nodejs\\codex',
        claude: 'C:\\nvm4w\\nodejs\\claude.cmd',
        lastDetectedAt: '2026-05-15T18:31:26.968Z',
      },
      detect: vi.fn(async () => null),
    })
    const result = await resolveCliPath('codex', deps)
    expect(result).toBeNull()
    expect(writeSettings).toHaveBeenCalledTimes(1)
    const writtenSettings = writeSettings.mock.calls[0][1] as CliSettings
    expect(writtenSettings.codex).toBeNull()
    expect(writtenSettings.claude).toBe('C:\\nvm4w\\nodejs\\claude.cmd')
    expect(writtenSettings.lastDetectedAt).toBe('2026-05-16T03:30:00.000Z')
  })

  it('Windows + cli.json 不存在 (EMPTY) + detect 回 .cmd → 寫新檔', async () => {
    setPlatform('win32')
    const { deps, writeSettings } = makeDeps({
      settings: { codex: null, claude: null, lastDetectedAt: null },
      detect: vi.fn(async () => 'C:\\path\\codex.cmd'),
    })
    const result = await resolveCliPath('codex', deps)
    expect(result).toBe('C:\\path\\codex.cmd')
    expect(writeSettings).toHaveBeenCalledTimes(1)
    const writtenSettings = writeSettings.mock.calls[0][1] as CliSettings
    expect(writtenSettings.codex).toBe('C:\\path\\codex.cmd')
    expect(writtenSettings.claude).toBeNull()
  })

  it('POSIX + 無副檔名 cache + pathExists 通過 → 直接回 (不引入副檔名規則)', async () => {
    setPlatform('linux')
    const { deps, writeSettings, detect, pathExists } = makeDeps({
      settings: {
        codex: '/usr/local/bin/codex',
        claude: null,
        lastDetectedAt: '2026-05-15T18:31:26.968Z',
      },
      pathExists: vi.fn(async () => true),
    })
    const result = await resolveCliPath('codex', deps)
    expect(result).toBe('/usr/local/bin/codex')
    expect(pathExists).toHaveBeenCalledWith('/usr/local/bin/codex')
    expect(detect).not.toHaveBeenCalled()
    expect(writeSettings).not.toHaveBeenCalled()
  })

  it('POSIX + stale cache + detect 回新 path → 覆寫 (沿用既有契約)', async () => {
    setPlatform('darwin')
    const { deps, writeSettings } = makeDeps({
      settings: {
        codex: '/old/codex',
        claude: null,
        lastDetectedAt: '2026-05-01T00:00:00.000Z',
      },
      pathExists: vi.fn(async () => false),
      detect: vi.fn(async () => '/new/codex'),
    })
    const result = await resolveCliPath('codex', deps)
    expect(result).toBe('/new/codex')
    expect(writeSettings).toHaveBeenCalledTimes(1)
    const writtenSettings = writeSettings.mock.calls[0][1] as CliSettings
    expect(writtenSettings.codex).toBe('/new/codex')
  })

  it('writeSettings reject (磁碟錯誤) → 不阻斷主流程，仍回 detect 出的新 path', async () => {
    setPlatform('win32')
    const { deps } = makeDeps({
      settings: {
        codex: 'C:\\nvm4w\\nodejs\\codex',
        claude: null,
        lastDetectedAt: null,
      },
      detect: vi.fn(async () => 'C:\\nvm4w\\nodejs\\codex.cmd'),
      writeSettings: vi.fn(async () => {
        throw new Error('EACCES: permission denied')
      }),
    })
    const result = await resolveCliPath('codex', deps)
    expect(result).toBe('C:\\nvm4w\\nodejs\\codex.cmd')
  })
})
