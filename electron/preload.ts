import { contextBridge, ipcRenderer } from 'electron'

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
    write: (novelId: string, meta: unknown) => ipcRenderer.invoke('novel:write', novelId, meta),
  },
  character: {
    list: (novelId: string) => ipcRenderer.invoke('character:list', novelId),
    read: (novelId: string, characterId: string) =>
      ipcRenderer.invoke('character:read', novelId, characterId),
    write: (novelId: string, character: unknown) =>
      ipcRenderer.invoke('character:write', novelId, character),
    delete: (novelId: string, characterId: string) =>
      ipcRenderer.invoke('character:delete', novelId, characterId),
  },
  chapter: {
    list: (novelId: string) => ipcRenderer.invoke('chapter:list', novelId),
    read: (novelId: string, chapterId: string) =>
      ipcRenderer.invoke('chapter:read', novelId, chapterId),
    write: (novelId: string, chapter: unknown) =>
      ipcRenderer.invoke('chapter:write', novelId, chapter),
    delete: (novelId: string, chapterId: string) =>
      ipcRenderer.invoke('chapter:delete', novelId, chapterId),
    branch: {
      list: (novelId: string, chapterId: string) =>
        ipcRenderer.invoke('chapter:branch:list', novelId, chapterId),
      save: (novelId: string, chapterId: string, branchName: string, payload: unknown) =>
        ipcRenderer.invoke('chapter:branch:save', novelId, chapterId, branchName, payload),
      activate: (novelId: string, chapterId: string, branchId: string) =>
        ipcRenderer.invoke('chapter:branch:activate', novelId, chapterId, branchId),
    },
  },
  faction: {
    list: (novelId: string) => ipcRenderer.invoke('faction:list', novelId),
    read: (novelId: string, factionId: string) =>
      ipcRenderer.invoke('faction:read', novelId, factionId),
    write: (novelId: string, faction: unknown) =>
      ipcRenderer.invoke('faction:write', novelId, faction),
    delete: (novelId: string, factionId: string) =>
      ipcRenderer.invoke('faction:delete', novelId, factionId),
  },
  ai: {
    invoke: (input: unknown) => ipcRenderer.invoke('ai:invoke', input),
  },
  consistency: {
    dryRun: (input: unknown) => ipcRenderer.invoke('consistency:dryRun', input),
  },
  export: {
    chapter: (novelId: string, chapterId: string, format: 'epub-like' | 'web-page') =>
      ipcRenderer.invoke('export:chapter', novelId, chapterId, format),
  },
} as const

export type SpectraApi = typeof api

contextBridge.exposeInMainWorld('api', api)
