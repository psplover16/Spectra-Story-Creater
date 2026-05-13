import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { appendDismissal, readDismissals } from '@/services/evolution/dismissalStore'
import { createNovel } from '@/services/files/novelRepository'
import { novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-dismissal-store-tests')

describe('dismissalStore', () => {
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

  it('append + read', async () => {
    await appendDismissal(dir, {
      characterId: 'c1',
      chapterId: 'ch1',
      dismissedAt: '2026-05-13T00:00:00.000Z',
      reason: 'AI 推斷的演化太誇張',
    })
    const list = await readDismissals(dir)
    expect(list).toHaveLength(1)
    expect(list[0]?.reason).toBe('AI 推斷的演化太誇張')
  })
})
