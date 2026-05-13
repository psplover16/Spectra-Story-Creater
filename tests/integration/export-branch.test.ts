import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { exportChapter } from '@/services/export/htmlExporter'
import { writeChapter, saveBranch } from '@/services/files/chapterRepository'
import { createNovel } from '@/services/files/novelRepository'
import { novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-export-branch-int')

describe('integration: 分支匯出 — 檔名規則', () => {
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

  it('分支匯出檔名包含 branch-<name>', async () => {
    const ch = await writeChapter(dir, { index: 3, title: '誤入禁地' })
    const branch = await saveBranch(dir, {
      chapterId: ch.id,
      branchName: 'alt-pov-茅十八',
      fromChapter: ch,
    })
    const result = await exportChapter({
      novelDir: dir,
      novelName: '鹿鼎記',
      chapter: branch,
      format: 'epub-like',
      isBranch: true,
    })
    expect(result.fileName).toBe('chapter-3-branch-alt-pov-茅十八-epub-like.html')
  })
})
