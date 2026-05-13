import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { appendSituationHistory } from '@/services/files/factionRepository'
import { createNovel } from '@/services/files/novelRepository'
import { factionHistoryFile } from '@/services/files/paths'
import { novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-situation-history-utf8-tests')

describe('history.jsonl UTF-8 無 BOM', () => {
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

  it('寫入後檔案開頭不含 BOM bytes', async () => {
    await appendSituationHistory(dir, {
      factionId: 'f1',
      at: '2026-05-13T00:00:00.000Z',
      previousSituation: '初成',
      newSituation: '大增',
    })
    const raw = await readFile(factionHistoryFile(dir))
    expect(raw[0]).not.toBe(0xef)
    expect(raw[1]).not.toBe(0xbb)
    expect(raw[2]).not.toBe(0xbf)
  })
})
