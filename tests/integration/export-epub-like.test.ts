import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { exportChapter } from '@/services/export/htmlExporter'
import { writeChapter, readChapter, listChapters } from '@/services/files/chapterRepository'
import { createNovel } from '@/services/files/novelRepository'
import { novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-export-epub-like-int')

describe('integration: epub-like 端到端匯出', () => {
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

  it('章節寫入後匯出，HTML 含內容、UTF-8、self-contained，snapshot 穩定', async () => {
    const ch = await writeChapter(dir, {
      index: 1,
      title: '揚州街頭',
      outline: '',
      content: '韋小寶踏出麗春院。\n\n外頭風雨欲來。',
    })
    const result = await exportChapter({
      novelDir: dir,
      novelName: '鹿鼎記',
      chapter: await readChapter(dir, ch.id),
      format: 'epub-like',
    })
    expect(result.selfContained).toBe(true)
    const html = await readFile(result.filePath, { encoding: 'utf-8' })
    expect(html).toContain('韋小寶踏出麗春院')
    const chapters = await listChapters(dir)
    expect(chapters).toHaveLength(1)
  })
})
