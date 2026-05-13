import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { createNovel } from '@/services/files/novelRepository'
import {
  activateBranch,
  listBranches,
  listChapters,
  readChapter,
  saveBranch,
  writeChapter,
} from '@/services/files/chapterRepository'
import { novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-chapter-repo-tests')

describe('chapterRepository', () => {
  let novelFolder: string

  beforeEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
    await mkdir(ROOT, { recursive: true })
    await createNovel(ROOT, { name: '鹿鼎記' })
    novelFolder = novelDir(ROOT, '鹿鼎記')
  })

  afterEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
  })

  it('主 chapter CRUD：write → list 按 index 排序 → read → 修改後寫回', async () => {
    const ch2 = await writeChapter(novelFolder, { index: 2, title: '京城風雲' })
    const ch1 = await writeChapter(novelFolder, { index: 1, title: '揚州街頭' })
    const list = await listChapters(novelFolder)
    expect(list.map((c) => c.title)).toEqual(['揚州街頭', '京城風雲'])

    const reread = await readChapter(novelFolder, ch1.id)
    expect(reread.title).toBe('揚州街頭')

    await writeChapter(novelFolder, { id: ch2.id, index: 2, title: '京城風雲（修訂）' })
    const after = await readChapter(novelFolder, ch2.id)
    expect(after.title).toBe('京城風雲（修訂）')
  })

  it('branch 建立並驗證 branchOf 與 branchedAt 設定', async () => {
    const ch = await writeChapter(novelFolder, {
      index: 3,
      title: '韋小寶誤入禁地',
      outline: '韋小寶意外撞見天地會聚會',
    })
    const branch = await saveBranch(novelFolder, {
      chapterId: ch.id,
      branchName: 'alt-pov-茅十八',
      fromChapter: ch,
      overrides: { outline: '從茅十八視角看韋小寶誤入' },
    })
    expect(branch.branchOf).toBe(ch.id)
    expect(branch.branchName).toBe('alt-pov-茅十八')
    expect(branch.outline).toBe('從茅十八視角看韋小寶誤入')
    expect(branch.branchedAt).toMatch(/\d{4}-\d{2}-\d{2}T/)
    const promoted = await activateBranch(novelFolder, ch.id, branch.id)
    expect(promoted.outline).toBe('從茅十八視角看韋小寶誤入')
  })

  it('branch list 列出同一 chapter 下多個分支', async () => {
    const ch = await writeChapter(novelFolder, { index: 3, title: '誤入禁地' })
    await saveBranch(novelFolder, {
      chapterId: ch.id,
      branchName: 'alt-pov-茅十八',
      fromChapter: ch,
    })
    await new Promise((r) => setTimeout(r, 5))
    await saveBranch(novelFolder, {
      chapterId: ch.id,
      branchName: 'alt-tone-荒誕',
      fromChapter: ch,
    })
    const branches = await listBranches(novelFolder, ch.id)
    expect(branches).toHaveLength(2)
    expect(branches.map((b) => b.branchName).sort()).toEqual(
      ['alt-pov-茅十八', 'alt-tone-荒誕'].sort(),
    )
  })
})
