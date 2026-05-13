import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { appendDriftFinding, readDriftLog } from '@/services/evolution/driftLog'
import { createNovel } from '@/services/files/novelRepository'
import { novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-drift-log-tests')

describe('driftLog', () => {
  let dir: string

  beforeEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
    await mkdir(ROOT, { recursive: true })
    await createNovel(ROOT, { name: '鹿鼎記' })
    dir = novelDir(ROOT, '鹿鼎記')
  })

  afterEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
  })

  it('append-only：兩筆 finding 寫入後可讀回；UTF-8 無 BOM', async () => {
    await appendDriftFinding(dir, {
      characterId: 'c1',
      detectedAt: '2026-05-13T00:00:00.000Z',
      chapterId: 'ch1',
      evidence: '...',
      suggestedRewrite: '...',
      decision: null,
    })
    await appendDriftFinding(dir, {
      characterId: 'c1',
      detectedAt: '2026-05-13T00:00:01.000Z',
      chapterId: 'ch2',
      evidence: '...',
      suggestedRewrite: '...',
      decision: 'accept-as-suggested',
    })
    const records = await readDriftLog(dir, 'c1')
    expect(records).toHaveLength(2)

    const raw = await readFile(path.join(dir, 'characters', 'c1.drift-log.jsonl'))
    expect(raw[0]).not.toBe(0xef) // 無 BOM
  })
})
