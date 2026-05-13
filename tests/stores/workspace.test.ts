import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useWorkspaceStore } from '@/stores/workspace'

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
