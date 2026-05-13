import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { chapterHandlers } from '../../../electron/ipc/chapterHandlers'
import { createNovel } from '@/services/files/novelRepository'
import { novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-chapter-handlers-tests')

describe('chapterHandlers', () => {
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

  it('chapter CRUD + branch save/list/activate', async () => {
    const ch = await chapterHandlers.write(dir, { index: 3, title: '誤入禁地' })
    const list = await chapterHandlers.list(dir)
    expect(list).toHaveLength(1)

    const branch = await chapterHandlers.branchSave(dir, {
      chapterId: ch.id,
      branchName: 'alt-pov-茅十八',
      fromChapter: ch,
      overrides: { outline: '茅十八視角' },
    })
    expect(branch.branchOf).toBe(ch.id)

    const branches = await chapterHandlers.branchList(dir, ch.id)
    expect(branches).toHaveLength(1)

    const promoted = await chapterHandlers.branchActivate(dir, ch.id, branch.id)
    expect(promoted.outline).toBe('茅十八視角')
  })
})
