import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { appendSituationHistory } from '@/services/faction/situationHistory'
import { queryFactionHistory } from '@/services/faction/historyQuery'
import { createNovel } from '@/services/files/novelRepository'
import { novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-faction-history-query-tests')

describe('queryFactionHistory', () => {
  let dir: string

  beforeEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
    await mkdir(ROOT, { recursive: true })
    await createNovel(ROOT, { name: '鹿鼎記' })
    dir = novelDir(ROOT, '鹿鼎記')
    for (let i = 0; i < 3; i++) {
      await appendSituationHistory(dir, {
        factionId: i === 0 ? 'tdh' : 'court',
        at: `2026-05-${10 + i}T00:00:00.000Z`,
        previousSituation: 'old',
        newSituation: 'new',
      })
    }
  })

  afterEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
  })

  it('依 factionId 過濾', async () => {
    const tdh = await queryFactionHistory({ novelDir: dir, filter: { factionId: 'tdh' } })
    expect(tdh).toHaveLength(1)
    const court = await queryFactionHistory({ novelDir: dir, filter: { factionId: 'court' } })
    expect(court).toHaveLength(2)
  })

  it('依時間區間過濾', async () => {
    const since11 = await queryFactionHistory({
      novelDir: dir,
      filter: { fromTime: '2026-05-11T00:00:00.000Z' },
    })
    expect(since11).toHaveLength(2)
  })
})
