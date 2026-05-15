import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { equipmentHandlers, registerEquipmentHandlers } from '../../../electron/ipc/equipmentHandlers'
import { createNovel } from '@/services/files/novelRepository'
import { novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-equipment-ipc-tests')

describe('equipmentHandlers IPC', () => {
  let novelFolder: string

  beforeEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
    await mkdir(ROOT, { recursive: true })
    await createNovel(ROOT, { name: 'ipc-novel' })
    novelFolder = novelDir(ROOT, 'ipc-novel')
  })

  afterEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
  })

  it('list 空時回 []', async () => {
    expect(await equipmentHandlers.list(novelFolder)).toEqual([])
  })

  it('write → list → 回該裝備', async () => {
    await equipmentHandlers.write(novelFolder, {
      id: 'eq-1',
      name: '玉佩',
      kind: 'wearable',
      defaultEffect: '飾品',
    })
    const list = await equipmentHandlers.list(novelFolder)
    expect(list).toHaveLength(1)
    expect(list[0]?.id).toBe('eq-1')
  })

  it('read 不存在 id → null', async () => {
    expect(await equipmentHandlers.read(novelFolder, 'missing')).toBeNull()
  })

  it('delete 後 read → null', async () => {
    await equipmentHandlers.write(novelFolder, {
      id: 'eq-del',
      name: '可刪',
      kind: 'misc',
      defaultEffect: '',
    })
    await equipmentHandlers.delete(novelFolder, 'eq-del')
    expect(await equipmentHandlers.read(novelFolder, 'eq-del')).toBeNull()
  })

  it('registerEquipmentHandlers 正確註冊四條 channel 名稱', () => {
    const registered: string[] = []
    const ipc = {
      handle(channel: string, _listener: unknown): void {
        registered.push(channel)
      },
    }
    registerEquipmentHandlers(ipc)
    expect(registered).toContain('equipment:list')
    expect(registered).toContain('equipment:read')
    expect(registered).toContain('equipment:write')
    expect(registered).toContain('equipment:delete')
  })
})
