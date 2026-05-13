import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { readGlobalDefaults, writeGlobalDefaults } from '@/services/ai/globalDefaultStore'

const ROOT = path.join(tmpdir(), 'spectra-global-defaults-tests')

describe('globalDefaultStore', () => {
  beforeEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
    await mkdir(ROOT, { recursive: true })
  })

  afterEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
  })

  it('預設 defaultSource=codex；寫入後讀回 claude', async () => {
    expect((await readGlobalDefaults(ROOT)).defaultSource).toBe('codex')
    await writeGlobalDefaults(ROOT, { defaultSource: 'claude' })
    expect((await readGlobalDefaults(ROOT)).defaultSource).toBe('claude')
  })
})
