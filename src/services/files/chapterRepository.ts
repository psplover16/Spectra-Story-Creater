import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

import type { Chapter, ChapterBranch, Scene } from '@/types/chapter'

import { readUtf8Text, writeUtf8Text } from './encoding'
import { chapterBranchFile, chapterBranchesDir, chapterFile, chaptersDir } from './paths'

export interface ChapterDraft extends Partial<Omit<Chapter, 'id' | 'createdAt' | 'updatedAt'>> {
  id?: string
  index: number
  title: string
}

const emptyScene = (): Scene => ({
  location: '',
  time: '',
  weather: '',
  props: [],
  mood: '',
})

export async function listChapters(novelDir: string): Promise<Chapter[]> {
  const dir = chaptersDir(novelDir)
  let entries: string[] = []
  try {
    entries = await readdir(dir)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
  const result: Chapter[] = []
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue
    if (entry.endsWith('.branches.json')) continue
    const id = entry.slice(0, -'.json'.length)
    try {
      const ch = await readChapter(novelDir, id)
      result.push(ch)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') continue
      throw err
    }
  }
  result.sort((a, b) => a.index - b.index)
  return result
}

export async function readChapter(novelDir: string, chapterId: string): Promise<Chapter> {
  const raw = await readUtf8Text(chapterFile(novelDir, chapterId))
  return JSON.parse(raw) as Chapter
}

export async function writeChapter(novelDir: string, draft: ChapterDraft): Promise<Chapter> {
  const now = new Date().toISOString()
  const id = draft.id ?? randomUUID()
  let createdAt = now
  if (draft.id) {
    try {
      const existing = await readChapter(novelDir, draft.id)
      createdAt = existing.createdAt
    } catch {
      // 不存在
    }
  }

  const chapter: Chapter = {
    id,
    index: draft.index,
    title: draft.title,
    outline: draft.outline ?? '',
    scene: draft.scene ?? emptyScene(),
    content: draft.content ?? '',
    presentCharacters: draft.presentCharacters ?? [],
    createdAt,
    updatedAt: now,
  }

  await mkdir(chaptersDir(novelDir), { recursive: true })
  await writeUtf8Text(chapterFile(novelDir, id), JSON.stringify(chapter, null, 2))
  return chapter
}

export async function deleteChapter(novelDir: string, chapterId: string): Promise<void> {
  await rm(chapterFile(novelDir, chapterId), { force: true })
  await rm(chapterBranchesDir(novelDir, chapterId), { recursive: true, force: true })
}

export interface SaveBranchInput {
  chapterId: string
  branchName: string
  fromChapter: Chapter
  overrides?: Partial<Omit<Chapter, 'id' | 'createdAt' | 'updatedAt'>>
}

export async function saveBranch(novelDir: string, input: SaveBranchInput): Promise<ChapterBranch> {
  const branchId = randomUUID()
  const now = new Date().toISOString()
  const branch: ChapterBranch = {
    ...input.fromChapter,
    ...input.overrides,
    id: branchId,
    branchOf: input.chapterId,
    branchedAt: now,
    branchName: input.branchName,
    createdAt: now,
    updatedAt: now,
  }
  await mkdir(chapterBranchesDir(novelDir, input.chapterId), { recursive: true })
  await writeUtf8Text(
    chapterBranchFile(novelDir, input.chapterId, branchId),
    JSON.stringify(branch, null, 2),
  )
  return branch
}

export async function listBranches(novelDir: string, chapterId: string): Promise<ChapterBranch[]> {
  const dir = chapterBranchesDir(novelDir, chapterId)
  let entries: string[] = []
  try {
    const dirStat = await stat(dir)
    if (!dirStat.isDirectory()) return []
    entries = await readdir(dir)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
  const result: ChapterBranch[] = []
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue
    const branchId = entry.slice(0, -'.json'.length)
    try {
      const raw = await readUtf8Text(chapterBranchFile(novelDir, chapterId, branchId))
      result.push(JSON.parse(raw) as ChapterBranch)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') continue
      throw err
    }
  }
  result.sort((a, b) => a.branchedAt.localeCompare(b.branchedAt))
  return result
}

export async function readBranch(
  novelDir: string,
  chapterId: string,
  branchId: string,
): Promise<ChapterBranch> {
  const raw = await readUtf8Text(chapterBranchFile(novelDir, chapterId, branchId))
  return JSON.parse(raw) as ChapterBranch
}

export async function activateBranch(
  novelDir: string,
  chapterId: string,
  branchId: string,
): Promise<Chapter> {
  const branch = await readBranch(novelDir, chapterId, branchId)
  const promoted: Chapter = {
    id: chapterId,
    index: branch.index,
    title: branch.title,
    outline: branch.outline,
    scene: branch.scene,
    content: branch.content,
    presentCharacters: branch.presentCharacters,
    createdAt: branch.createdAt,
    updatedAt: new Date().toISOString(),
  }
  await writeUtf8Text(chapterFile(novelDir, chapterId), JSON.stringify(promoted, null, 2))
  return promoted
}
