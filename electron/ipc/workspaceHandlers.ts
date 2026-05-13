import {
  createNovel,
  listNovels,
  type CreateNovelInput,
} from '../../src/services/files/novelRepository'
import type { Novel } from '../../src/types/novel'

interface WorkspaceState {
  activeNovelName: string | null
}

const state: WorkspaceState = { activeNovelName: null }

export interface OpenResult {
  requiresConfirmation: boolean
  activeNovelName: string | null
}

export const workspaceHandlers = {
  list(root: string): Promise<Novel[]> {
    return listNovels(root)
  },

  async open(_root: string, name: string, opts: { confirmed?: boolean } = {}): Promise<OpenResult> {
    const requiresConfirmation =
      state.activeNovelName !== null && state.activeNovelName !== name && !opts.confirmed
    if (!requiresConfirmation) {
      state.activeNovelName = name
    }
    return { requiresConfirmation, activeNovelName: state.activeNovelName }
  },

  close(): void {
    state.activeNovelName = null
  },

  detectActive(): { activeNovelName: string | null } {
    return { activeNovelName: state.activeNovelName }
  },

  create(root: string, input: CreateNovelInput): Promise<Novel> {
    return createNovel(root, input)
  },
} as const

export function __resetWorkspaceState(): void {
  state.activeNovelName = null
}

export interface IpcLike {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void
}

export function registerWorkspaceHandlers(ipc: IpcLike): void {
  ipc.handle('workspace:list', (_event, root) => workspaceHandlers.list(root as string))
  ipc.handle('workspace:open', (_event, root, name, opts) =>
    workspaceHandlers.open(root as string, name as string, opts as { confirmed?: boolean }),
  )
  ipc.handle('workspace:close', () => workspaceHandlers.close())
  ipc.handle('workspace:detectActive', () => workspaceHandlers.detectActive())
  ipc.handle('workspace:create', (_event, root, input) =>
    workspaceHandlers.create(root as string, input as CreateNovelInput),
  )
}
