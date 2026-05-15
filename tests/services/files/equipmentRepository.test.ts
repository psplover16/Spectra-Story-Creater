import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { createNovel } from '@/services/files/novelRepository'
import {
  deleteEquipment,
  listEquipment,
  readEquipment,
  writeEquipment,
} from '@/services/files/equipmentRepository'
import { equipmentFile, novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-equipment-repo-tests')

describe('equipmentRepository', () => {
  let novelFolder: string

  beforeEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
    await mkdir(ROOT, { recursive: true })
    await createNovel(ROOT, { name: 'eq-novel' })
    novelFolder = novelDir(ROOT, 'eq-novel')
  })

  afterEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
  })

  it('write → list → read 三步驟保真', async () => {
    const created = await writeEquipment(novelFolder, {
      id: 'eq-yu',
      name: '玉佩',
      kind: 'wearable',
      defaultEffect: '飾品',
    })
    expect(created.id).toBe('eq-yu')

    const list = await listEquipment(novelFolder)
    expect(list).toHaveLength(1)
    expect(list[0]?.name).toBe('玉佩')

    const reread = await readEquipment(novelFolder, 'eq-yu')
    expect(reread).not.toBeNull()
    expect(reread?.kind).toBe('wearable')
    expect(reread?.defaultEffect).toBe('飾品')
  })

  it('read 不存在 id → 回 null 不丟例外', async () => {
    const result = await readEquipment(novelFolder, 'no-such-id')
    expect(result).toBeNull()
  })

  it('delete 後再 read → 回 null', async () => {
    await writeEquipment(novelFolder, {
      id: 'eq-temp',
      name: '臨時',
      kind: 'misc',
      defaultEffect: '',
    })
    await deleteEquipment(novelFolder, 'eq-temp')
    expect(await readEquipment(novelFolder, 'eq-temp')).toBeNull()
  })

  it('髒檔 item 缺 kind/defaultEffect → 補預設值（misc / 空字串）', async () => {
    const id = 'dirty-eq'
    await mkdir(path.dirname(equipmentFile(novelFolder, id)), { recursive: true })
    await writeFile(
      equipmentFile(novelFolder, id),
      JSON.stringify({ id, name: '不完整裝備' }),
      'utf-8',
    )
    const eq = await readEquipment(novelFolder, id)
    expect(eq).not.toBeNull()
    expect(eq?.kind).toBe('misc')
    expect(eq?.defaultEffect).toBe('')
  })

  it('write 後檔案是 UTF-8 無 BOM', async () => {
    await writeEquipment(novelFolder, {
      id: 'eq-utf8',
      name: '玉佩',
      kind: 'wearable',
      defaultEffect: '飾品',
    })
    const { readFile } = await import('node:fs/promises')
    const buf = await readFile(equipmentFile(novelFolder, 'eq-utf8'))
    expect(buf[0]).not.toBe(0xef)
    expect(buf[1]).not.toBe(0xbb)
    expect(buf[2]).not.toBe(0xbf)
  })
})
