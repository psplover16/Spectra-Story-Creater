import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { exportChapter } from '@/services/export/htmlExporter'
import { writeChapter, listChapters } from '@/services/files/chapterRepository'
import { createNovel } from '@/services/files/novelRepository'
import { novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-export-web-page-int')

describe('integration: web-page 端到端匯出', () => {
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

  it('側欄連結指向同目錄相對路徑，未匯出章節顯示「尚未匯出」', async () => {
    const ch = await writeChapter(dir, {
      index: 1,
      title: '揚州街頭',
      content: '段一。\n\n段二。',
    })
    await writeChapter(dir, { index: 2, title: '京城風雲' })

    const chapters = await listChapters(dir)
    const allChapters = chapters.map((c) => ({
      id: c.id,
      index: c.index,
      title: c.title,
      exported: c.id === ch.id,
    }))

    const result = await exportChapter({
      novelDir: dir,
      novelName: '鹿鼎記',
      chapter: ch,
      format: 'web-page',
      allChapters,
    })

    const html = await readFile(result.filePath, { encoding: 'utf-8' })
    expect(html).toContain('chapter-1-揚州街頭-web-page.html')
    expect(html).toContain('尚未匯出')
    expect(html).not.toContain('https://')
  })
})
