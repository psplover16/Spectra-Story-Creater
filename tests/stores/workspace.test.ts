import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useWorkspaceStore } from '@/stores/workspace'
import { setupWorkspacePersistence } from '@/services/bootstrap/setupWorkspacePersistence'
import { loadWorkspaceState } from '@/services/files/workspaceStateRepository'

describe('workspace store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('未啟用小說時請求切換不需確認', () => {
    const store = useWorkspaceStore()
    const result = store.requestSwitchNovel('鹿鼎記')
    expect(result.requiresConfirmation).toBe(false)
    expect(result.hasUnsaved).toBe(false)
  })

  it('已啟用小說且 chapter tab 有未儲存編輯時，請求切換需確認、hasUnsaved=true', () => {
    const store = useWorkspaceStore()
    store.setActiveNovel('鹿鼎記')
    store.openChapterTab('ch-3', '誤入禁地')
    store.markTabDirty('ch-3', true)
    const result = store.requestSwitchNovel('射雕英雄傳')
    expect(result.requiresConfirmation).toBe(true)
    expect(result.hasUnsaved).toBe(true)
  })

  it('confirmSwitchNovel 後 active novel 切換並清空 chapter tabs', () => {
    const store = useWorkspaceStore()
    store.setActiveNovel('鹿鼎記')
    store.openChapterTab('ch-1', '揚州街頭')
    store.confirmSwitchNovel('射雕英雄傳')
    expect(store.activeNovelName).toBe('射雕英雄傳')
    expect(store.chapterTabs).toHaveLength(0)
  })
})

describe('workspace store persistence subscription (setupWorkspacePersistence)', () => {
  let storage: Storage

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

  beforeEach(() => {
    setActivePinia(createPinia())
    storage = makeStorage()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('mutation 觸發 debounced persistence write', () => {
    const store = useWorkspaceStore()
    setupWorkspacePersistence(store, { storage, debounceMs: 100 })

    store.setWorkspaceRoot('D:/Novels')
    expect(loadWorkspaceState(storage)).toBeNull()

    vi.advanceTimersByTime(100)
    expect(loadWorkspaceState(storage)?.workspacePath).toBe('D:/Novels')
  })

  it('快速連續 mutation：debounce 合併為單次 setItem 呼叫', () => {
    const store = useWorkspaceStore()
    const spy = vi.spyOn(storage, 'setItem')
    setupWorkspacePersistence(store, { storage, debounceMs: 100 })

    store.setWorkspaceRoot('D:/a')
    store.setWorkspaceRoot('D:/b')
    store.setActiveNovel('夜霧之城')
    store.setCollaborationMode('auto')
    expect(spy).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(loadWorkspaceState(storage)).toMatchObject({
      workspacePath: 'D:/b',
      activeNovelName: '夜霧之城',
      collaborationMode: 'auto',
    })
  })

  it('啟動時若 storage 有狀態：hydrate store 還原三個欄位', () => {
    storage.setItem(
      'spectra:workspace-state',
      JSON.stringify({
        workspacePath: 'D:/restored',
        activeNovelName: '夜霧之城',
        collaborationMode: 'auto',
        lastUpdated: '2026-05-14T00:00:00.000Z',
      }),
    )

    const store = useWorkspaceStore()
    setupWorkspacePersistence(store, { storage, debounceMs: 100 })

    expect(store.workspaceRoot).toBe('D:/restored')
    expect(store.activeNovelName).toBe('夜霧之城')
    expect(store.collaborationMode).toBe('auto')
  })

  it('啟動時若 storage 空：store 維持預設、不丟例外', () => {
    const store = useWorkspaceStore()
    expect(() => setupWorkspacePersistence(store, { storage, debounceMs: 100 })).not.toThrow()
    expect(store.workspaceRoot).toBeNull()
    expect(store.activeNovelName).toBeNull()
    expect(store.collaborationMode).toBeNull()
  })
})
