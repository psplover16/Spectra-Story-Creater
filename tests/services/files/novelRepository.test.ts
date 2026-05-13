import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  createNovel,
  deleteNovel,
  listNovels,
  readNovel,
  writeNovel,
} from '@/services/files/novelRepository'
import { DuplicateNovelError } from '@/services/files/errors'
import { novelDir, novelMetaFile } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-novel-repo-tests')

describe('novelRepository', () => {
  beforeEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
    await mkdir(ROOT, { recursive: true })
  })

  afterEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
  })

  it('happy path：create → list 含該本 → read 回傳完整資料 → write 更新 → delete 移除', async () => {
    const novel = await createNovel(ROOT, { name: '鹿鼎記', style: '武俠' })
    expect(novel.id).toMatch(/[0-9a-f-]{36}/)
    expect(novel.name).toBe('鹿鼎記')
    expect(novel.style).toBe('武俠')

    const listed = await listNovels(ROOT)
    expect(listed).toHaveLength(1)
    expect(listed[0]?.name).toBe('鹿鼎記')

    const reread = await readNovel(novelDir(ROOT, '鹿鼎記'))
    expect(reread.id).toBe(novel.id)

    await writeNovel(novelDir(ROOT, '鹿鼎記'), { ...reread, style: '武俠喜劇' })
    const after = await readNovel(novelDir(ROOT, '鹿鼎記'))
    expect(after.style).toBe('武俠喜劇')
    expect(after.updatedAt).not.toBe(reread.updatedAt)

    await deleteNovel(novelDir(ROOT, '鹿鼎記'))
    expect(await listNovels(ROOT)).toHaveLength(0)
  })

  it('重複名稱拒絕 DuplicateNovelError 且不動檔案系統', async () => {
    await createNovel(ROOT, { name: '鹿鼎記' })
    await expect(createNovel(ROOT, { name: '鹿鼎記' })).rejects.toBeInstanceOf(DuplicateNovelError)
    const listed = await listNovels(ROOT)
    expect(listed).toHaveLength(1)
  })

  it('UTF-8 BOM 讀取：手動寫入 BOM 開頭的 novel.json 仍可正確 parse', async () => {
    const folder = novelDir(ROOT, '帶BOM小說')
    await mkdir(folder, { recursive: true })
    const novel = {
      id: 'fixed-id',
      name: '帶BOM小說',
      style: '',
      worldview: [],
      factionsSummary: [],
      overallOutline: { summary: '', chapters: [] },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const bom = Buffer.from([0xef, 0xbb, 0xbf])
    const body = Buffer.from(JSON.stringify(novel), 'utf-8')
    await writeFile(novelMetaFile(folder), Buffer.concat([bom, body]))
    const read = await readNovel(folder)
    expect(read.id).toBe('fixed-id')
    expect(read.name).toBe('帶BOM小說')
  })
})
