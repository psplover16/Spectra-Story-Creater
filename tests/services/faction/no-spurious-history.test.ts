import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { writeFaction, readSituationHistory } from '@/services/files/factionRepository'
import { createNovel } from '@/services/files/novelRepository'
import { novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-no-spurious-history-tests')

describe('integration: 未更動 situation 不會 append history', () => {
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

  it('同樣的 currentSituation 寫兩次 → history 仍為空', async () => {
    const created = await writeFaction(dir, {
      name: '天地會',
      alignment: 'protagonist',
      currentSituation: '勢力初成',
    })
    await writeFaction(dir, {
      id: created.id,
      name: '天地會',
      alignment: 'protagonist',
      currentSituation: '勢力初成',
    })
    const history = await readSituationHistory(dir)
    expect(history).toEqual([])
  })
})
