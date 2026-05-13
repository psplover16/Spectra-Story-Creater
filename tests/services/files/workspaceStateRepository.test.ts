import { beforeEach, describe, expect, it } from 'vitest'

import {
  STORAGE_KEY,
  clearWorkspaceState,
  loadWorkspaceState,
  saveWorkspaceState,
} from '@/services/files/workspaceStateRepository'

function makeStorage(): Storage {
  const map = new Map<string, string>()
  return {
    getItem: (k) => (map.has(k) ? (map.get(k) ?? null) : null),
    setItem: (k, v) => {
      map.set(k, v)
    },
    removeItem: (k) => {
      map.delete(k)
    },
    clear: () => map.clear(),
    key: (i) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size
    },
  }
}

describe('workspaceStateRepository', () => {
  let storage: Storage

  beforeEach(() => {
    storage = makeStorage()
  })

  it('save → load 正常路徑：欄位完整往返，含 lastUpdated 自動填入', () => {
    saveWorkspaceState(
      {
        workspacePath: 'D:/Novels',
        activeNovelName: '夜霧之城',
        collaborationMode: 'companion',
      },
      storage,
    )

    const loaded = loadWorkspaceState(storage)
    expect(loaded).not.toBeNull()
    expect(loaded?.workspacePath).toBe('D:/Novels')
    expect(loaded?.activeNovelName).toBe('夜霧之城')
    expect(loaded?.collaborationMode).toBe('companion')
    expect(loaded?.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  it('檔案不存在（localStorage 無此 key）→ load 回 null', () => {
    expect(loadWorkspaceState(storage)).toBeNull()
  })

  it('corrupt JSON → load 回 null（不丟例外）', () => {
    storage.setItem(STORAGE_KEY, '{this is not json')
    expect(loadWorkspaceState(storage)).toBeNull()
  })

  it('schema 不合（workspacePath 型別錯）→ load 回 null', () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ workspacePath: 123, activeNovelName: null, collaborationMode: null }),
    )
    expect(loadWorkspaceState(storage)).toBeNull()
  })

  it('schema 不合（collaborationMode 非允許值）→ load 回 null', () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        workspacePath: 'D:/',
        activeNovelName: null,
        collaborationMode: 'unknown-mode',
        lastUpdated: '2026-01-01T00:00:00.000Z',
      }),
    )
    expect(loadWorkspaceState(storage)).toBeNull()
  })

  it('clearWorkspaceState 後 load 回 null', () => {
    saveWorkspaceState(
      { workspacePath: 'D:/', activeNovelName: null, collaborationMode: null },
      storage,
    )
    clearWorkspaceState(storage)
    expect(loadWorkspaceState(storage)).toBeNull()
  })

  it('save 三種 collaborationMode 與 null 都合法，且活躍 novel 可為 null', () => {
    for (const mode of ['companion', 'ghostwriter', 'auto', null] as const) {
      const s = makeStorage()
      saveWorkspaceState(
        { workspacePath: 'D:/', activeNovelName: null, collaborationMode: mode },
        s,
      )
      expect(loadWorkspaceState(s)?.collaborationMode).toBe(mode)
    }
  })

  it('預設使用 window.localStorage（不顯式傳入 storage）', () => {
    window.localStorage.clear()
    saveWorkspaceState({
      workspacePath: 'D:/default-ls',
      activeNovelName: null,
      collaborationMode: null,
    })
    expect(loadWorkspaceState()?.workspacePath).toBe('D:/default-ls')
    clearWorkspaceState()
    expect(loadWorkspaceState()).toBeNull()
  })
})
