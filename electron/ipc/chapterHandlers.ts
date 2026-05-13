import {
  activateBranch,
  deleteChapter,
  listBranches,
  listChapters,
  readChapter,
  saveBranch,
  writeChapter,
  type ChapterDraft,
  type SaveBranchInput,
} from '../../src/services/files/chapterRepository'
import type { Chapter, ChapterBranch } from '../../src/types/chapter'

export const chapterHandlers = {
  list(novelDir: string): Promise<Chapter[]> {
    return listChapters(novelDir)
  },
  read(novelDir: string, chapterId: string): Promise<Chapter> {
    return readChapter(novelDir, chapterId)
  },
  write(novelDir: string, draft: ChapterDraft): Promise<Chapter> {
    return writeChapter(novelDir, draft)
  },
  delete(novelDir: string, chapterId: string): Promise<void> {
    return deleteChapter(novelDir, chapterId)
  },
  branchList(novelDir: string, chapterId: string): Promise<ChapterBranch[]> {
    return listBranches(novelDir, chapterId)
  },
  branchSave(novelDir: string, input: SaveBranchInput): Promise<ChapterBranch> {
    return saveBranch(novelDir, input)
  },
  branchActivate(novelDir: string, chapterId: string, branchId: string): Promise<Chapter> {
    return activateBranch(novelDir, chapterId, branchId)
  },
} as const

export interface IpcLike {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void
}

export function registerChapterHandlers(ipc: IpcLike): void {
  ipc.handle('chapter:list', (_e, dir) => chapterHandlers.list(dir as string))
  ipc.handle('chapter:read', (_e, dir, id) => chapterHandlers.read(dir as string, id as string))
  ipc.handle('chapter:write', (_e, dir, draft) =>
    chapterHandlers.write(dir as string, draft as ChapterDraft),
  )
  ipc.handle('chapter:delete', (_e, dir, id) => chapterHandlers.delete(dir as string, id as string))
  ipc.handle('chapter:branch:list', (_e, dir, id) =>
    chapterHandlers.branchList(dir as string, id as string),
  )
  ipc.handle('chapter:branch:save', (_e, dir, input) =>
    chapterHandlers.branchSave(dir as string, input as SaveBranchInput),
  )
  ipc.handle('chapter:branch:activate', (_e, dir, id, branchId) =>
    chapterHandlers.branchActivate(dir as string, id as string, branchId as string),
  )
}
