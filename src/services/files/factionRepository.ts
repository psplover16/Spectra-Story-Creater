import { appendFile, mkdir, readFile, readdir, rm } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

import type { Faction, FactionSituationHistoryEntry } from '@/types/faction'

import { readUtf8Text, writeUtf8Text } from './encoding'
import { factionFile, factionHistoryFile, factionsDir } from './paths'

export interface FactionDraft extends Partial<Omit<Faction, 'id' | 'createdAt' | 'updatedAt'>> {
  id?: string
  name: string
  alignment: Faction['alignment']
}

export async function listFactions(novelDir: string): Promise<Faction[]> {
  const dir = factionsDir(novelDir)
  let entries: string[] = []
  try {
    entries = await readdir(dir)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
  const result: Faction[] = []
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue
    const id = entry.slice(0, -'.json'.length)
    if (id === 'history') continue
    try {
      const f = await readFaction(novelDir, id)
      result.push(f)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') continue
      throw err
    }
  }
  return result
}

export async function readFaction(novelDir: string, factionId: string): Promise<Faction> {
  const raw = await readUtf8Text(factionFile(novelDir, factionId))
  return JSON.parse(raw) as Faction
}

export async function writeFaction(novelDir: string, draft: FactionDraft): Promise<Faction> {
  const now = new Date().toISOString()
  const id = draft.id ?? randomUUID()
  let createdAt = now
  let previousSituation = ''
  if (draft.id) {
    try {
      const existing = await readFaction(novelDir, draft.id)
      createdAt = existing.createdAt
      previousSituation = existing.currentSituation
    } catch {
      // 不存在
    }
  }

  const faction: Faction = {
    id,
    name: draft.name,
    alignment: draft.alignment,
    description: draft.description ?? '',
    currentSituation: draft.currentSituation ?? '',
    keyMembers: draft.keyMembers ?? [],
    createdAt,
    updatedAt: now,
  }

  await mkdir(factionsDir(novelDir), { recursive: true })
  await writeUtf8Text(factionFile(novelDir, id), JSON.stringify(faction, null, 2))

  if (previousSituation !== faction.currentSituation && draft.id) {
    await appendSituationHistory(novelDir, {
      factionId: id,
      at: now,
      previousSituation,
      newSituation: faction.currentSituation,
    })
  }

  return faction
}

export async function deleteFaction(novelDir: string, factionId: string): Promise<void> {
  await rm(factionFile(novelDir, factionId), { force: true })
}

export async function appendSituationHistory(
  novelDir: string,
  entry: FactionSituationHistoryEntry,
): Promise<void> {
  await mkdir(factionsDir(novelDir), { recursive: true })
  const line = JSON.stringify(entry) + '\n'
  await appendFile(factionHistoryFile(novelDir), line, { encoding: 'utf-8' })
}

export async function readSituationHistory(
  novelDir: string,
): Promise<FactionSituationHistoryEntry[]> {
  try {
    const raw = await readFile(factionHistoryFile(novelDir), { encoding: 'utf-8' })
    return raw
      .split('\n')
      .filter((l) => l.length > 0)
      .map((l) => JSON.parse(l) as FactionSituationHistoryEntry)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
}
