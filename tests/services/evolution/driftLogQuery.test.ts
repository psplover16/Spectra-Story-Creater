import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { appendDriftFinding } from '@/services/evolution/driftLog'
import { queryDriftLog } from '@/services/evolution/driftLogQuery'
import { createNovel } from '@/services/files/novelRepository'
import { novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-drift-query-tests')

describe('queryDriftLog 三查詢', () => {
  let dir: string

  beforeEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
    await mkdir(ROOT, { recursive: true })
    await createNovel(ROOT, { name: '鹿鼎記' })
    dir = novelDir(ROOT, '鹿鼎記')
    for (let i = 0; i < 3; i++) {
      await appendDriftFinding(dir, {
        characterId: 'c1',
        detectedAt: `2026-05-${10 + i}T00:00:00.000Z`,
        chapterId: `ch${i + 1}`,
        evidence: '',
        suggestedRewrite: '',
        decision: i === 0 ? 'accept-as-suggested' : 'dismiss',
      })
    }
  })

  afterEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
  })

  it('by time：限定區間只回傳區間內', async () => {
    const records = await queryDriftLog({
      novelDir: dir,
      characterId: 'c1',
      filter: { fromTime: '2026-05-11T00:00:00.000Z' },
    })
    expect(records).toHaveLength(2)
  })

  it('by action：只回傳 accept-as-suggested', async () => {
    const records = await queryDriftLog({
      novelDir: dir,
      characterId: 'c1',
      filter: { actions: ['accept-as-suggested'] },
    })
    expect(records).toHaveLength(1)
    expect(records[0]?.decision).toBe('accept-as-suggested')
  })

  it('by character：只查 c1 = 3 筆', async () => {
    const records = await queryDriftLog({ novelDir: dir, characterId: 'c1' })
    expect(records).toHaveLength(3)
  })
})
