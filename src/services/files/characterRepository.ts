import { mkdir, readdir, rm } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

import type { Character } from '@/types/character'

import { readUtf8Text, writeUtf8Text } from './encoding'
import { MissingRelationshipTargetError, SchemaValidationError } from './errors'
import { characterFile, charactersDir } from './paths'

export interface CharacterDraft extends Partial<Omit<Character, 'id' | 'createdAt' | 'updatedAt'>> {
  id?: string
  name: string
}

function validateCharacterShape(draft: CharacterDraft): void {
  if (typeof draft.name !== 'string' || draft.name.trim() === '') {
    throw new SchemaValidationError('character.name 必須是非空字串', 'name')
  }
}

export async function listCharacters(novelDir: string): Promise<Character[]> {
  const dir = charactersDir(novelDir)
  let entries: string[] = []
  try {
    entries = await readdir(dir)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
  const result: Character[] = []
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue
    const id = entry.slice(0, -'.json'.length)
    try {
      const c = await readCharacter(novelDir, id)
      result.push(c)
    } catch {
      // 略過壞檔
    }
  }
  return result
}

export async function readCharacter(novelDir: string, characterId: string): Promise<Character> {
  const raw = await readUtf8Text(characterFile(novelDir, characterId))
  return JSON.parse(raw) as Character
}

export async function writeCharacter(novelDir: string, draft: CharacterDraft): Promise<Character> {
  validateCharacterShape(draft)

  const targets = (draft.relationships ?? []).map((r) => r.targetCharacterId)
  if (targets.length > 0) {
    const existingIds = new Set((await listCharacters(novelDir)).map((c) => c.id))
    if (draft.id) existingIds.add(draft.id)
    for (const t of targets) {
      if (!existingIds.has(t)) {
        throw new MissingRelationshipTargetError(t)
      }
    }
  }

  const now = new Date().toISOString()
  const id = draft.id ?? randomUUID()
  let createdAt = now
  if (draft.id) {
    try {
      const existing = await readCharacter(novelDir, draft.id)
      createdAt = existing.createdAt
    } catch {
      // 不存在就用 now
    }
  }

  const character: Character = {
    id,
    name: draft.name,
    personality: draft.personality ?? '',
    abilities: draft.abilities ?? [],
    appearance: draft.appearance ?? '',
    factionId: draft.factionId ?? null,
    socialStatus: draft.socialStatus ?? '',
    relationships: draft.relationships ?? [],
    notes: draft.notes ?? '',
    createdAt,
    updatedAt: now,
  }

  await mkdir(charactersDir(novelDir), { recursive: true })
  await writeUtf8Text(characterFile(novelDir, id), JSON.stringify(character, null, 2))
  return character
}

export async function deleteCharacter(novelDir: string, characterId: string): Promise<void> {
  await rm(characterFile(novelDir, characterId), { force: true })
}
