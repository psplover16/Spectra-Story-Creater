import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { createNovel } from '@/services/files/novelRepository'
import {
  listFactions,
  readFaction,
  readSituationHistory,
  writeFaction,
} from '@/services/files/factionRepository'
import { novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-faction-repo-tests')

describe('factionRepository', () => {
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

  it('CRUD：write 後 list 含此 faction，read 回原資料', async () => {
    const created = await writeFaction(novelFolder, {
      name: '天地會',
      alignment: 'protagonist',
      description: '反清復明',
      currentSituation: '勢力初成',
    })
    expect(created.id).toMatch(/[0-9a-f-]{36}/)

    const list = await listFactions(novelFolder)
    expect(list).toHaveLength(1)
    expect(list[0]?.name).toBe('天地會')

    const reread = await readFaction(novelFolder, created.id)
    expect(reread.currentSituation).toBe('勢力初成')
  })

  it('currentSituation 變更時 history.jsonl 自動 append 一行', async () => {
    const f = await writeFaction(novelFolder, {
      name: '天地會',
      alignment: 'protagonist',
      currentSituation: '勢力初成',
    })
    await writeFaction(novelFolder, {
      id: f.id,
      name: '天地會',
      alignment: 'protagonist',
      currentSituation: '韋小寶加入後勢力大增',
    })
    const history = await readSituationHistory(novelFolder)
    expect(history).toHaveLength(1)
    expect(history[0]?.factionId).toBe(f.id)
    expect(history[0]?.previousSituation).toBe('勢力初成')
    expect(history[0]?.newSituation).toBe('韋小寶加入後勢力大增')
  })
})
