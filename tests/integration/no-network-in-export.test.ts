import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { exportChapter } from '@/services/export/htmlExporter'
import { createNovel } from '@/services/files/novelRepository'
import { novelDir } from '@/services/files/paths'
import type { Chapter, Scene } from '@/types/chapter'

const ROOT = path.join(tmpdir(), 'spectra-no-network-in-export-int')
const emptyScene: Scene = { location: '', time: '', weather: '', props: [], mood: '' }

describe('integration: 匯出 HTML 不含外部 http(s) 連結', () => {
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

  it('grep http(s):// 命中 0 次（epub-like）', async () => {
    const ch: Chapter = {
      id: 'c1',
      index: 1,
      title: '揚州街頭',
      outline: '',
      scene: emptyScene,
      content: '段一',
      presentCharacters: [],
      createdAt: '',
      updatedAt: '',
    }
    const result = await exportChapter({
      novelDir: dir,
      novelName: '鹿鼎記',
      chapter: ch,
      format: 'epub-like',
    })
    const html = await readFile(result.filePath, { encoding: 'utf-8' })
    expect(html).not.toMatch(/https?:\/\//)
  })
})
