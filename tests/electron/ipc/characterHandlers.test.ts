import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { characterHandlers } from '../../../electron/ipc/characterHandlers'
import { createNovel } from '@/services/files/novelRepository'
import { novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-character-handlers-tests')

describe('characterHandlers', () => {
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

  it('write → list → read → delete 四步驟皆通', async () => {
    const created = await characterHandlers.write(dir, {
      name: '韋小寶',
      personality: '機靈狡黠',
    })
    const list = await characterHandlers.list(dir)
    expect(list).toHaveLength(1)

    const read = await characterHandlers.read(dir, created.id)
    expect(read.name).toBe('韋小寶')

    await characterHandlers.delete(dir, created.id)
    expect(await characterHandlers.list(dir)).toHaveLength(0)
  })
})
