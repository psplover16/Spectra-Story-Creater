import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { factionHandlers } from '../../../electron/ipc/factionHandlers'
import { createNovel } from '@/services/files/novelRepository'
import { novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-faction-handlers-tests')

describe('factionHandlers', () => {
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

  it('CRUD + history append on situation change', async () => {
    const created = await factionHandlers.write(dir, {
      name: '天地會',
      alignment: 'protagonist',
      currentSituation: '勢力初成',
    })
    expect(await factionHandlers.list(dir)).toHaveLength(1)

    await factionHandlers.write(dir, {
      id: created.id,
      name: '天地會',
      alignment: 'protagonist',
      currentSituation: '勢力大增',
    })
    const history = await factionHandlers.history(dir)
    expect(history).toHaveLength(1)
    expect(history[0]?.newSituation).toBe('勢力大增')

    await factionHandlers.delete(dir, created.id)
    expect(await factionHandlers.list(dir)).toHaveLength(0)
  })
})
