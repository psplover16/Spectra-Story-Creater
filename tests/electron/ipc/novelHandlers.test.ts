import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { novelHandlers } from '../../../electron/ipc/novelHandlers'
import { createNovel } from '@/services/files/novelRepository'
import { novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-novel-handlers-tests')

describe('novelHandlers', () => {
  beforeEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
    await mkdir(ROOT, { recursive: true })
  })

  afterEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
  })

  it('read 與 write 走通 repository', async () => {
    const novel = await createNovel(ROOT, { name: '鹿鼎記', style: '武俠' })
    const dir = novelDir(ROOT, '鹿鼎記')
    const read = await novelHandlers.read(dir)
    expect(read.id).toBe(novel.id)

    const updated = await novelHandlers.write(dir, { ...read, style: '武俠喜劇' })
    expect(updated.style).toBe('武俠喜劇')
    expect(updated.updatedAt).not.toBe(read.updatedAt)
  })
})
