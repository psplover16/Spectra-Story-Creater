import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { exportChapter } from '@/services/export/htmlExporter'
import { createNovel } from '@/services/files/novelRepository'
import { novelDir, exportsDir } from '@/services/files/paths'
import type { Chapter, Scene } from '@/types/chapter'

const ROOT = path.join(tmpdir(), 'spectra-html-exporter-tests')

const emptyScene: Scene = { location: '', time: '', weather: '', props: [], mood: '' }

function ch(): Chapter {
  return {
    id: 'c1',
    index: 1,
    title: '揚州街頭',
    outline: '',
    scene: emptyScene,
    content: '韋小寶踏出麗春院。\n\n外頭風雨欲來。',
    presentCharacters: [],
    createdAt: '',
    updatedAt: '',
  }
}

describe('htmlExporter', () => {
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

  it('寫入 exports/ + self-contained 檢查通過 + UTF-8 無 BOM', async () => {
    const result = await exportChapter({
      novelDir: dir,
      novelName: '鹿鼎記',
      chapter: ch(),
      format: 'epub-like',
    })
    expect(result.selfContained).toBe(true)
    expect(result.filePath).toContain(exportsDir(dir))
    const raw = await readFile(result.filePath)
    expect(raw[0]).not.toBe(0xef) // 無 BOM
    expect(raw.toString('utf-8')).toContain('韋小寶踏出麗春院')
  })
})
