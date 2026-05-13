import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { writeFaction, readSituationHistory } from '@/services/files/factionRepository'
import { buildFactionSummarySlices } from '@/services/faction/factionSummarySlice'
import { createNovel } from '@/services/files/novelRepository'
import { novelDir } from '@/services/files/paths'
import type { Character } from '@/types/character'

const ROOT = path.join(tmpdir(), 'spectra-faction-tracking-flow-tests')

describe('integration: faction-tracking-flow（situation 更新 → history append → 下次 context 反映）', () => {
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

  it('situation 更新後 history.jsonl append；buildFactionSummarySlices 取得最新狀態', async () => {
    const created = await writeFaction(dir, {
      name: '天地會',
      alignment: 'protagonist',
      currentSituation: '勢力初成',
    })
    const updated = await writeFaction(dir, {
      id: created.id,
      name: '天地會',
      alignment: 'protagonist',
      currentSituation: '韋小寶加入後勢力大增',
    })
    const history = await readSituationHistory(dir)
    expect(history).toHaveLength(1)
    expect(history[0]?.newSituation).toBe('韋小寶加入後勢力大增')

    const presentCharacters: Character[] = [
      {
        id: 'c1',
        name: '韋小寶',
        personality: '',
        abilities: [],
        appearance: '',
        factionId: created.id,
        socialStatus: '',
        relationships: [],
        notes: '',
        createdAt: '',
        updatedAt: '',
      },
    ]
    const slices = buildFactionSummarySlices(presentCharacters, [updated])
    expect(slices).toHaveLength(1)
    expect(slices[0]?.currentSituation).toBe('韋小寶加入後勢力大增')
  })
})
