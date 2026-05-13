import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { createNovel } from '@/services/files/novelRepository'
import { listCharacters, readCharacter, writeCharacter } from '@/services/files/characterRepository'
import { MissingRelationshipTargetError, SchemaValidationError } from '@/services/files/errors'
import { novelDir } from '@/services/files/paths'

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
})
