import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  EMPTY_CLI_SETTINGS,
  readCliSettings,
  writeCliSettings,
} from '@/services/files/cliSettingsRepository'

describe('cliSettingsRepository', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cli-settings-test-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('read 不存在的檔案 → 回傳 EMPTY_CLI_SETTINGS、不丟例外', async () => {
    const path = join(dir, 'nonexistent.json')
    const result = await readCliSettings(path)
    expect(result).toEqual(EMPTY_CLI_SETTINGS)
  })

  it('write 後 read round-trip 一致', async () => {
    const path = join(dir, 'cli.json')
    await writeCliSettings(path, {
      codex: '/usr/local/bin/codex',
      claude: '/usr/local/bin/claude',
      lastDetectedAt: '2026-05-15T00:00:00.000Z',
    })
    const result = await readCliSettings(path)
    expect(result).toEqual({
      codex: '/usr/local/bin/codex',
      claude: '/usr/local/bin/claude',
      lastDetectedAt: '2026-05-15T00:00:00.000Z',
    })
  })

  it('write null 欄位 → read 後仍為 null', async () => {
    const path = join(dir, 'cli.json')
    await writeCliSettings(path, {
      codex: null,
      claude: '/usr/local/bin/claude',
      lastDetectedAt: '2026-05-15T00:00:00.000Z',
    })
    const result = await readCliSettings(path)
    expect(result.codex).toBeNull()
    expect(result.claude).toBe('/usr/local/bin/claude')
  })

  it('read 含 non-string 欄位 → 回傳 null（型別清理）', async () => {
    const path = join(dir, 'cli.json')
    const { writeFile } = await import('node:fs/promises')
    await writeFile(path, JSON.stringify({ codex: 123, claude: null, lastDetectedAt: false }))
    const result = await readCliSettings(path)
    expect(result).toEqual({ codex: null, claude: null, lastDetectedAt: null })
  })
})
