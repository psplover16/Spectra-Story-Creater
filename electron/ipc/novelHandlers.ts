import { readNovel, writeNovel } from '../../src/services/files/novelRepository'
import type { Novel } from '../../src/types/novel'

export const novelHandlers = {
  read(novelDir: string): Promise<Novel> {
    return readNovel(novelDir)
  },
  async write(novelDir: string, novel: Novel): Promise<Novel> {
    await writeNovel(novelDir, novel)
    return readNovel(novelDir)
  },
} as const

export interface IpcLike {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void
}

export function registerNovelHandlers(ipc: IpcLike): void {
  ipc.handle('novel:read', (_e, dir) => novelHandlers.read(dir as string))
  ipc.handle('novel:write', (_e, dir, novel) => novelHandlers.write(dir as string, novel as Novel))
}
