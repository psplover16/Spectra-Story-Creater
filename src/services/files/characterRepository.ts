import { mkdir, readdir, rm } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

import type { Character, Relationship } from '@/types/character'
import type { EquipmentReference } from '@/types/equipment'

import { readUtf8Text, writeUtf8TextAtomic } from './encoding'
import { MissingRelationshipTargetError, SchemaValidationError } from './errors'
import { characterFile, charactersDir } from './paths'

const LEGACY_INLINE_FIELDS = ['name', 'kind', 'defaultEffect', 'overrides'] as const

function migrateEquipmentReferences(raw: unknown, sourcePath: string): EquipmentReference[] {
  if (!Array.isArray(raw)) return []
  const refs: EquipmentReference[] = []
  for (let i = 0; i < raw.length; i++) {
    const entry = raw[i]
    if (entry === null || typeof entry !== 'object') {
      console.warn(
        `[characterRepository] ${sourcePath} equipment[${i}] 非物件，丟棄整個 equipment 陣列`,
      )
      return []
    }
    const obj = entry as Record<string, unknown>
    const hasLegacyInlineField = LEGACY_INLINE_FIELDS.some((f) => f in obj)
    if (hasLegacyInlineField) {
      console.warn(
        `[characterRepository] ${sourcePath} equipment 含 character-equipment-effects 階段的 inline EquipmentItem 形狀（${LEGACY_INLINE_FIELDS.join('/')}），BREAKING：整個 equipment 陣列重設為空`,
      )
      return []
    }
    if (typeof obj.equipmentId !== 'string' || obj.equipmentId.length === 0) {
      console.warn(
        `[characterRepository] ${sourcePath} equipment[${i}] 缺合法 equipmentId，BREAKING：整個 equipment 陣列重設為空`,
      )
      return []
    }
    const ref: EquipmentReference = { equipmentId: obj.equipmentId }
    if (typeof obj.realEffect === 'string') ref.realEffect = obj.realEffect
    if (typeof obj.extraEffect === 'string') ref.extraEffect = obj.extraEffect
    refs.push(ref)
  }
  return refs
}

export interface CharacterDraft extends Partial<Omit<Character, 'id' | 'createdAt' | 'updatedAt'>> {
  id?: string
  name: string
}

function validateCharacterShape(draft: CharacterDraft): void {
  if (typeof draft.name !== 'string' || draft.name.trim() === '') {
    throw new SchemaValidationError('character.name 必須是非空字串', 'name')
  }
}

interface LegacyCharacterFile {
  id: string
  name: string
  personality?: string
  abilities?: string[]
  appearance?: string
  factionId?: string | null
  factionIds?: string[]
  socialStatus?: string
  relationships?: Relationship[]
  notes?: string
  equipment?: unknown
  createdAt?: string
  updatedAt?: string
}

function migrateLegacyCharacterShape(obj: LegacyCharacterFile, sourcePath: string): Character {
  let factionIds: string[]
  if (Array.isArray(obj.factionIds)) {
    factionIds = obj.factionIds.filter((x): x is string => typeof x === 'string')
    if (obj.factionId !== undefined && obj.factionId !== null) {
      console.warn(
        `[characterRepository] ${sourcePath} 同時含 factionId 與 factionIds，採用 factionIds，忽略 legacy factionId`,
      )
    }
  } else if (typeof obj.factionId === 'string' && obj.factionId.length > 0) {
    factionIds = [obj.factionId]
  } else {
    factionIds = []
  }
  return {
    id: obj.id,
    name: obj.name,
    personality: obj.personality ?? '',
    abilities: Array.isArray(obj.abilities) ? obj.abilities : [],
    appearance: obj.appearance ?? '',
    factionIds,
    socialStatus: obj.socialStatus ?? '',
    relationships: Array.isArray(obj.relationships) ? obj.relationships : [],
    notes: obj.notes ?? '',
    equipment: migrateEquipmentReferences(obj.equipment, sourcePath),
    createdAt: obj.createdAt ?? '',
    updatedAt: obj.updatedAt ?? '',
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
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') continue
      throw err
    }
  }
  return result
}

export async function readCharacter(novelDir: string, characterId: string): Promise<Character> {
  const path = characterFile(novelDir, characterId)
  const raw = await readUtf8Text(path)
  const parsed = JSON.parse(raw) as LegacyCharacterFile
  return migrateLegacyCharacterShape(parsed, path)
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
    factionIds: draft.factionIds ?? [],
    socialStatus: draft.socialStatus ?? '',
    relationships: draft.relationships ?? [],
    notes: draft.notes ?? '',
    equipment: draft.equipment ?? [],
    createdAt,
    updatedAt: now,
  }

  await mkdir(charactersDir(novelDir), { recursive: true })
  await writeUtf8TextAtomic(characterFile(novelDir, id), JSON.stringify(character, null, 2))
  return character
}

export async function deleteCharacter(novelDir: string, characterId: string): Promise<void> {
  await rm(characterFile(novelDir, characterId), { force: true })
}
