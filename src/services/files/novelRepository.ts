import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

import type { Novel } from '@/types/novel'

import { readUtf8Text, writeUtf8Text } from './encoding'
import { DuplicateNovelError } from './errors'
import { charactersDir, chaptersDir, factionsDir, novelDir, novelMetaFile } from './paths'

export interface CreateNovelInput {
  name: string
  style?: string
}

export async function createNovel(workspaceRoot: string, input: CreateNovelInput): Promise<Novel> {
  const folder = novelDir(workspaceRoot, input.name)
  try {
    const folderStat = await stat(folder)
    if (folderStat.isDirectory()) {
      throw new DuplicateNovelError(input.name)
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err
    }
  }

  const now = new Date().toISOString()
  const novel: Novel = {
    id: randomUUID(),
    name: input.name,
    style: input.style ?? '',
    worldview: [],
    factionsSummary: [],
    overallOutline: { summary: '', chapters: [] },
    createdAt: now,
    updatedAt: now,
  }

  await mkdir(folder, { recursive: true })
  await mkdir(charactersDir(folder), { recursive: true })
  await mkdir(chaptersDir(folder), { recursive: true })
  await mkdir(factionsDir(folder), { recursive: true })
  await writeUtf8Text(novelMetaFile(folder), JSON.stringify(novel, null, 2))
  return novel
}

export async function readNovel(novelFolder: string): Promise<Novel> {
  const raw = await readUtf8Text(novelMetaFile(novelFolder))
  return JSON.parse(raw) as Novel
}

export async function writeNovel(novelFolder: string, novel: Novel): Promise<void> {
  const next: Novel = { ...novel, updatedAt: new Date().toISOString() }
  await writeUtf8Text(novelMetaFile(novelFolder), JSON.stringify(next, null, 2))
}

export async function listNovels(workspaceRoot: string): Promise<Novel[]> {
  let entries: string[] = []
  try {
    entries = await readdir(workspaceRoot)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
  const result: Novel[] = []
  for (const entry of entries) {
    const folder = novelDir(workspaceRoot, entry)
    try {
      const folderStat = await stat(folder)
      if (!folderStat.isDirectory()) continue
      const novel = await readNovel(folder)
      result.push(novel)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') continue
      throw err
    }
  }
  return result
}

export async function deleteNovel(novelFolder: string): Promise<void> {
  await rm(novelFolder, { recursive: true, force: true })
}
