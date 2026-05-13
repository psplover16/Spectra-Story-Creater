import {
  deleteFaction,
  listFactions,
  readFaction,
  readSituationHistory,
  writeFaction,
  type FactionDraft,
} from '../../src/services/files/factionRepository'
import type { Faction, FactionSituationHistoryEntry } from '../../src/types/faction'

export const factionHandlers = {
  list(novelDir: string): Promise<Faction[]> {
    return listFactions(novelDir)
  },
  read(novelDir: string, factionId: string): Promise<Faction> {
    return readFaction(novelDir, factionId)
  },
  write(novelDir: string, draft: FactionDraft): Promise<Faction> {
    return writeFaction(novelDir, draft)
  },
  delete(novelDir: string, factionId: string): Promise<void> {
    return deleteFaction(novelDir, factionId)
  },
  history(novelDir: string): Promise<FactionSituationHistoryEntry[]> {
    return readSituationHistory(novelDir)
  },
} as const

export interface IpcLike {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void
}

export function registerFactionHandlers(ipc: IpcLike): void {
  ipc.handle('faction:list', (_e, dir) => factionHandlers.list(dir as string))
  ipc.handle('faction:read', (_e, dir, id) => factionHandlers.read(dir as string, id as string))
  ipc.handle('faction:write', (_e, dir, draft) =>
    factionHandlers.write(dir as string, draft as FactionDraft),
  )
  ipc.handle('faction:delete', (_e, dir, id) => factionHandlers.delete(dir as string, id as string))
  ipc.handle('faction:history', (_e, dir) => factionHandlers.history(dir as string))
}
