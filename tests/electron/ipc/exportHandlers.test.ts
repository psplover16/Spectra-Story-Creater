import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { exportHandlers } from '../../../electron/ipc/exportHandlers'
import { createNovel } from '@/services/files/novelRepository'
import { novelDir } from '@/services/files/paths'
import type { Chapter, Scene } from '@/types/chapter'

const ROOT = path.join(tmpdir(), 'spectra-export-handlers-tests')

const emptyScene: Scene = { location: '', time: '', weather: '', props: [], mood: '' }

describe('exportHandlers', () => {
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

  it('呼叫 chapter handler 正確走 htmlExporter 並回檔路徑', async () => {
    const chapter: Chapter = {
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
    const result = await exportHandlers.chapter({
      novelDir: dir,
      novelName: '鹿鼎記',
      chapter,
      format: 'epub-like',
    })
    expect(result.filePath).toContain('chapter-1-揚州街頭-epub-like.html')
    expect(result.selfContained).toBe(true)
  })
})
