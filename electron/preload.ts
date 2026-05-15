import { contextBridge, ipcRenderer } from 'electron'

// Strip reactivity / Proxy wrappers before structured clone hits ipcRenderer.invoke.
// Vue 3 reactive objects expose a Proxy that the structured clone algorithm rejects with
// "An object could not be cloned." JSON round-trip safely lowers them to plain data because
// every IPC payload in this project is already JSON-serialisable.
function plain<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  return JSON.parse(JSON.stringify(value)) as T
}

const api = {
  workspace: {
    list: (root: string) => ipcRenderer.invoke('workspace:list', root),
    open: (root: string, name: string, opts?: { confirmed?: boolean }) =>
      ipcRenderer.invoke('workspace:open', root, name, opts),
    close: () => ipcRenderer.invoke('workspace:close'),
    detectActive: () => ipcRenderer.invoke('workspace:detectActive'),
    create: (root: string, input: { name: string; style?: string }) =>
      ipcRenderer.invoke('workspace:create', root, input),
    pickFolder: () => ipcRenderer.invoke('workspace:pickFolder') as Promise<string | null>,
    isWritable: (path: string) =>
      ipcRenderer.invoke('workspace:isWritable', path) as Promise<boolean>,
  },
  novel: {
    read: (novelId: string) => ipcRenderer.invoke('novel:read', novelId),
    write: (novelId: string, meta: unknown) =>
      ipcRenderer.invoke('novel:write', novelId, plain(meta)),
  },
  character: {
    list: (novelId: string) => ipcRenderer.invoke('character:list', novelId),
    read: (novelId: string, characterId: string) =>
      ipcRenderer.invoke('character:read', novelId, characterId),
    write: (novelId: string, character: unknown) =>
      ipcRenderer.invoke('character:write', novelId, plain(character)),
    delete: (novelId: string, characterId: string) =>
      ipcRenderer.invoke('character:delete', novelId, characterId),
  },
  chapter: {
    list: (novelId: string) => ipcRenderer.invoke('chapter:list', novelId),
    read: (novelId: string, chapterId: string) =>
      ipcRenderer.invoke('chapter:read', novelId, chapterId),
    write: (novelId: string, chapter: unknown) =>
      ipcRenderer.invoke('chapter:write', novelId, plain(chapter)),
    delete: (novelId: string, chapterId: string) =>
      ipcRenderer.invoke('chapter:delete', novelId, chapterId),
    branch: {
      list: (novelId: string, chapterId: string) =>
        ipcRenderer.invoke('chapter:branch:list', novelId, chapterId),
      save: (novelId: string, chapterId: string, branchName: string, payload: unknown) =>
        ipcRenderer.invoke('chapter:branch:save', novelId, chapterId, branchName, plain(payload)),
      activate: (novelId: string, chapterId: string, branchId: string) =>
        ipcRenderer.invoke('chapter:branch:activate', novelId, chapterId, branchId),
    },
  },
  faction: {
    list: (novelId: string) => ipcRenderer.invoke('faction:list', novelId),
    read: (novelId: string, factionId: string) =>
      ipcRenderer.invoke('faction:read', novelId, factionId),
    write: (novelId: string, faction: unknown) =>
      ipcRenderer.invoke('faction:write', novelId, plain(faction)),
    delete: (novelId: string, factionId: string) =>
      ipcRenderer.invoke('faction:delete', novelId, factionId),
  },
  equipment: {
    list: (novelId: string) => ipcRenderer.invoke('equipment:list', novelId),
    read: (novelId: string, equipmentId: string) =>
      ipcRenderer.invoke('equipment:read', novelId, equipmentId),
    write: (novelId: string, item: unknown) =>
      ipcRenderer.invoke('equipment:write', novelId, plain(item)),
    delete: (novelId: string, equipmentId: string) =>
      ipcRenderer.invoke('equipment:delete', novelId, equipmentId),
  },
  ai: {
    invoke: (source: string, input: unknown) =>
      ipcRenderer.invoke('ai:invoke', source, plain(input)),
  },
  consistency: {
    dryRun: (input: unknown) => ipcRenderer.invoke('consistency:dryRun', plain(input)),
  },
  export: {
    chapter: (novelId: string, chapterId: string, format: 'epub-like' | 'web-page') =>
      ipcRenderer.invoke('export:chapter', novelId, chapterId, format),
  },
  settings: {
    cli: {
      read: () => ipcRenderer.invoke('settings:cli:read'),
      write: (settings: unknown) => ipcRenderer.invoke('settings:cli:write', plain(settings)),
      autoDetect: () => ipcRenderer.invoke('settings:cli:autoDetect'),
      ensure: () => ipcRenderer.invoke('settings:cli:ensure'),
    },
  },
} as const

export type SpectraApi = typeof api

contextBridge.exposeInMainWorld('api', api)
