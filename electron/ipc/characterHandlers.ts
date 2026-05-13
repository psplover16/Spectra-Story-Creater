import {
  deleteCharacter,
  listCharacters,
  readCharacter,
  writeCharacter,
  type CharacterDraft,
} from '../../src/services/files/characterRepository'
import type { Character } from '../../src/types/character'

export const characterHandlers = {
  list(novelDir: string): Promise<Character[]> {
    return listCharacters(novelDir)
  },
  read(novelDir: string, characterId: string): Promise<Character> {
    return readCharacter(novelDir, characterId)
  },
  write(novelDir: string, draft: CharacterDraft): Promise<Character> {
    return writeCharacter(novelDir, draft)
  },
  delete(novelDir: string, characterId: string): Promise<void> {
    return deleteCharacter(novelDir, characterId)
  },
} as const

export interface IpcLike {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void
}

export function registerCharacterHandlers(ipc: IpcLike): void {
  ipc.handle('character:list', (_e, dir) => characterHandlers.list(dir as string))
  ipc.handle('character:read', (_e, dir, id) => characterHandlers.read(dir as string, id as string))
  ipc.handle('character:write', (_e, dir, draft) =>
    characterHandlers.write(dir as string, draft as CharacterDraft),
  )
  ipc.handle('character:delete', (_e, dir, id) =>
    characterHandlers.delete(dir as string, id as string),
  )
}
