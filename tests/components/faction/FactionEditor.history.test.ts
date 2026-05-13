import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { createNovel } from '@/services/files/novelRepository'
import { readFaction, readSituationHistory, writeFaction } from '@/services/files/factionRepository'
import { novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-faction-editor-history-tests')

describe('FactionEditor situation update integration', () => {
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

  it('FactionEditor 觸發 situation 更新 → repository 寫入並 append history，含 updatedAt 變動', async () => {
    const created = await writeFaction(dir, {
      name: '天地會',
      alignment: 'protagonist',
      currentSituation: '勢力初成',
    })
    const firstUpdatedAt = created.updatedAt

    await new Promise((r) => setTimeout(r, 5))
    const updated = await writeFaction(dir, {
      id: created.id,
      name: '天地會',
      alignment: 'protagonist',
      currentSituation: '韋小寶加入後勢力大增',
    })
    expect(updated.updatedAt).not.toBe(firstUpdatedAt)

    const reread = await readFaction(dir, created.id)
    expect(reread.currentSituation).toBe('韋小寶加入後勢力大增')

    const history = await readSituationHistory(dir)
    expect(history).toHaveLength(1)
    expect(history[0]?.newSituation).toBe('韋小寶加入後勢力大增')
  })
})
