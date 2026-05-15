import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { createNovel } from '@/services/files/novelRepository'
import { readCharacter } from '@/services/files/characterRepository'
import { characterFile, novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-char-eq-breaking')

describe('characterRepository BREAKING equipment migration', () => {
  let novelFolder: string

  beforeEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
    await mkdir(ROOT, { recursive: true })
    await createNovel(ROOT, { name: 'br' })
    novelFolder = novelDir(ROOT, 'br')
  })

  afterEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
  })

  async function writeRaw(id: string, obj: unknown): Promise<void> {
    await mkdir(path.dirname(characterFile(novelFolder, id)), { recursive: true })
    await writeFile(characterFile(novelFolder, id), JSON.stringify(obj), 'utf-8')
  }

  it('舊 character-equipment-effects 階段檔（含 overrides）→ equipment 重設為 []，warn 一次', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await writeRaw('legacy-1', {
      id: 'legacy-1',
      name: '舊角',
      personality: '',
      abilities: [],
      appearance: '',
      factionIds: [],
      socialStatus: '',
      relationships: [],
      notes: '',
      equipment: [
        {
          id: 'eq-old',
          name: '玉佩',
          kind: 'wearable',
          defaultEffect: '飾品',
          overrides: { 'legacy-1': '康熙親賜' },
        },
      ],
      createdAt: '',
      updatedAt: '',
    })
    const c = await readCharacter(novelFolder, 'legacy-1')
    expect(c.equipment).toEqual([])
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('新檔（equipment 為 EquipmentReference[]）→ 欄位保真', async () => {
    await writeRaw('new-1', {
      id: 'new-1',
      name: '新角',
      personality: '',
      abilities: [],
      appearance: '',
      factionIds: [],
      socialStatus: '',
      relationships: [],
      notes: '',
      equipment: [
        { equipmentId: 'eq-yu', realEffect: '信物', extraEffect: '免搜身' },
        { equipmentId: 'eq-knife' },
      ],
      createdAt: '',
      updatedAt: '',
    })
    const c = await readCharacter(novelFolder, 'new-1')
    expect(c.equipment).toHaveLength(2)
    expect(c.equipment[0]).toMatchObject({
      equipmentId: 'eq-yu',
      realEffect: '信物',
      extraEffect: '免搜身',
    })
    expect(c.equipment[1]).toMatchObject({ equipmentId: 'eq-knife' })
  })

  it('空檔（無 equipment 欄位）→ equipment=[]，不 warn', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await writeRaw('empty-1', {
      id: 'empty-1',
      name: '無',
      personality: '',
      abilities: [],
      appearance: '',
      factionIds: [],
      socialStatus: '',
      relationships: [],
      notes: '',
      createdAt: '',
      updatedAt: '',
    })
    const c = await readCharacter(novelFolder, 'empty-1')
    expect(c.equipment).toEqual([])
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('reference 缺 equipmentId → 整個 equipment 陣列重設、warn', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await writeRaw('bad-ref', {
      id: 'bad-ref',
      name: '',
      personality: '',
      abilities: [],
      appearance: '',
      factionIds: [],
      socialStatus: '',
      relationships: [],
      notes: '',
      equipment: [{ realEffect: 'x' }],
      createdAt: '',
      updatedAt: '',
    })
    const c = await readCharacter(novelFolder, 'bad-ref')
    expect(c.equipment).toEqual([])
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
