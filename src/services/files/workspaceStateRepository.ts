import type { CollaborationMode } from '@/types/collaboration'

export const STORAGE_KEY = 'spectra:workspace-state'

const VALID_MODES: ReadonlyArray<CollaborationMode | null> = [
  'companion',
  'ghostwriter',
  'auto',
  null,
]

export interface PersistedWorkspaceState {
  workspacePath: string
  activeNovelName: string | null
  collaborationMode: CollaborationMode | null
  lastUpdated: string
}

export type SaveWorkspaceInput = Omit<PersistedWorkspaceState, 'lastUpdated'>

function defaultStorage(): Storage {
  return window.localStorage
}

function isValid(x: unknown): x is PersistedWorkspaceState {
  if (typeof x !== 'object' || x === null) return false
  const o = x as Record<string, unknown>
  if (typeof o.workspacePath !== 'string') return false
  if (o.activeNovelName !== null && typeof o.activeNovelName !== 'string') return false
  if (!VALID_MODES.includes(o.collaborationMode as CollaborationMode | null)) return false
  if (typeof o.lastUpdated !== 'string') return false
  return true
}

export function loadWorkspaceState(
  storage: Storage = defaultStorage(),
): PersistedWorkspaceState | null {
  const raw = storage.getItem(STORAGE_KEY)
  if (raw === null) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  return isValid(parsed) ? parsed : null
}

export function saveWorkspaceState(
  state: SaveWorkspaceInput,
  storage: Storage = defaultStorage(),
): void {
  const persisted: PersistedWorkspaceState = {
    ...state,
    lastUpdated: new Date().toISOString(),
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(persisted))
}

export function clearWorkspaceState(storage: Storage = defaultStorage()): void {
  storage.removeItem(STORAGE_KEY)
}
