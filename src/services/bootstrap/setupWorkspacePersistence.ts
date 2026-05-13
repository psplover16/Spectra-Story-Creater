import {
  loadWorkspaceState,
  saveWorkspaceState,
} from '@/services/files/workspaceStateRepository'

export interface WorkspacePersistenceStore {
  workspaceRoot: string | null
  activeNovelName: string | null
  collaborationMode: 'companion' | 'ghostwriter' | 'auto' | null
  hydrate(snapshot: {
    workspaceRoot?: string | null
    activeNovelName?: string | null
    collaborationMode?: 'companion' | 'ghostwriter' | 'auto' | null
  }): void
  $subscribe(
    cb: () => void,
    options?: { detached?: boolean; flush?: 'pre' | 'post' | 'sync' },
  ): () => void
}

export interface SetupOptions {
  storage?: Storage
  debounceMs?: number
}

export function setupWorkspacePersistence(
  store: WorkspacePersistenceStore,
  opts: SetupOptions = {},
): () => void {
  const storage = opts.storage ?? window.localStorage
  const debounceMs = opts.debounceMs ?? 500

  const loaded = loadWorkspaceState(storage)
  if (loaded !== null) {
    store.hydrate({
      workspaceRoot: loaded.workspacePath,
      activeNovelName: loaded.activeNovelName,
      collaborationMode: loaded.collaborationMode,
    })
  }

  let timer: ReturnType<typeof setTimeout> | null = null
  const flush = (): void => {
    timer = null
    saveWorkspaceState(
      {
        workspacePath: store.workspaceRoot ?? '',
        activeNovelName: store.activeNovelName,
        collaborationMode: store.collaborationMode,
      },
      storage,
    )
  }

  return store.$subscribe(
    () => {
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(flush, debounceMs)
    },
    { flush: 'sync' },
  )
}
