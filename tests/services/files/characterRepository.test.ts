import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { createNovel } from '@/services/files/novelRepository'
import { listCharacters, readCharacter, writeCharacter } from '@/services/files/characterRepository'
import { MissingRelationshipTargetError, SchemaValidationError } from '@/services/files/errors'
import { characterFile, charactersDir, novelDir } from '@/services/files/paths'

const ROOT = path.join(tmpdir(), 'spectra-character-repo-tests')

describe('characterRepository', () => {
  let novelFolder: string

  beforeEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
    await mkdir(ROOT, { recursive: true })
    await createNovel(ROOT, { name: '鹿鼎記' })
    novelFolder = novelDir(ROOT, '鹿鼎記')
  })

  afterEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
  })

  it('happy path：寫入、列出、讀回三步驟成功', async () => {
    const created = await writeCharacter(novelFolder, {
      name: '韋小寶',
      personality: '機靈狡黠',
      abilities: ['口才'],
    })
    expect(created.id).toMatch(/[0-9a-f-]{36}/)

    const list = await listCharacters(novelFolder)
    expect(list).toHaveLength(1)
    expect(list[0]?.name).toBe('韋小寶')
    expect(list[0]?.relationships).toEqual([])

    const reread = await readCharacter(novelFolder, created.id)
    expect(reread.personality).toBe('機靈狡黠')
  })

  it('缺 name 時拋 SchemaValidationError，且不寫入任何檔', async () => {
    await expect(
      writeCharacter(novelFolder, { name: '' } as { name: string }),
    ).rejects.toBeInstanceOf(SchemaValidationError)
    expect(await listCharacters(novelFolder)).toHaveLength(0)
  })

  it('relationship 指向不存在的角色拒絕 MissingRelationshipTargetError', async () => {
    await expect(
      writeCharacter(novelFolder, {
        name: '韋小寶',
        relationships: [
          { targetCharacterId: 'nonexistent-id', kind: 'friend', description: '初識' },
        ],
      }),
    ).rejects.toBeInstanceOf(MissingRelationshipTargetError)
  })

  describe('legacy factionId migration on read', () => {
    async function writeLegacyCharacter(id: string, body: Record<string, unknown>): Promise<void> {
      await mkdir(charactersDir(novelFolder), { recursive: true })
      await writeFile(characterFile(novelFolder, id), JSON.stringify(body, null, 2), 'utf-8')
    }

    it('legacy factionId 為非空字串 → factionIds 變單元素陣列', async () => {
      await writeLegacyCharacter('c-legacy-1', {
        id: 'c-legacy-1',
        name: '韋小寶',
        personality: '',
        abilities: [],
        appearance: '',
        factionId: 'f-tdh',
        socialStatus: '',
        relationships: [],
        notes: '',
        createdAt: '',
        updatedAt: '',
      })
      const result = await readCharacter(novelFolder, 'c-legacy-1')
      expect(result.factionIds).toEqual(['f-tdh'])
      expect('factionId' in result).toBe(false)
    })

    it('legacy factionId 為 null → factionIds 變空陣列', async () => {
      await writeLegacyCharacter('c-legacy-2', {
        id: 'c-legacy-2',
        name: '茅十八',
        personality: '',
        abilities: [],
        appearance: '',
        factionId: null,
        socialStatus: '',
        relationships: [],
        notes: '',
        createdAt: '',
        updatedAt: '',
      })
      const result = await readCharacter(novelFolder, 'c-legacy-2')
      expect(result.factionIds).toEqual([])
    })

    it('legacy 完全沒有 factionId / factionIds → factionIds 變空陣列', async () => {
      await writeLegacyCharacter('c-legacy-3', {
        id: 'c-legacy-3',
        name: '吳六奇',
        personality: '',
        abilities: [],
        appearance: '',
        socialStatus: '',
        relationships: [],
        notes: '',
        createdAt: '',
        updatedAt: '',
      })
      const result = await readCharacter(novelFolder, 'c-legacy-3')
      expect(result.factionIds).toEqual([])
    })

    it('同時含 factionId 與 factionIds → 採用 factionIds 並產生 warn log', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      try {
        await writeLegacyCharacter('c-legacy-4', {
          id: 'c-legacy-4',
          name: '康熙',
          personality: '',
          abilities: [],
          appearance: '',
          factionId: 'f-old',
          factionIds: ['f-court', 'f-imperial'],
          socialStatus: '',
          relationships: [],
          notes: '',
          createdAt: '',
          updatedAt: '',
        })
        const result = await readCharacter(novelFolder, 'c-legacy-4')
        expect(result.factionIds).toEqual(['f-court', 'f-imperial'])
        expect(warnSpy).toHaveBeenCalled()
      } finally {
        warnSpy.mockRestore()
      }
    })

    it('write 後檔案不再含 legacy factionId 欄位', async () => {
      await writeLegacyCharacter('c-legacy-5', {
        id: 'c-legacy-5',
        name: '建寧公主',
        personality: '',
        abilities: [],
        appearance: '',
        factionId: 'f-imperial',
        socialStatus: '',
        relationships: [],
        notes: '',
        createdAt: '',
        updatedAt: '',
      })
      const loaded = await readCharacter(novelFolder, 'c-legacy-5')
      await writeCharacter(novelFolder, {
        id: loaded.id,
        name: loaded.name,
        personality: loaded.personality,
        abilities: loaded.abilities,
        appearance: loaded.appearance,
        factionIds: loaded.factionIds,
        socialStatus: loaded.socialStatus,
        relationships: loaded.relationships,
        notes: loaded.notes,
      })
      const raw = await readFile(characterFile(novelFolder, 'c-legacy-5'), 'utf-8')
      const parsed = JSON.parse(raw) as Record<string, unknown>
      expect('factionId' in parsed).toBe(false)
      expect(parsed.factionIds).toEqual(['f-imperial'])
    })
  })
})
