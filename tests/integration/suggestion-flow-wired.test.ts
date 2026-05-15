import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import App from '@/App.vue'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Novel } from '@/types/novel'
import type { Character } from '@/types/character'
import type { Chapter } from '@/types/chapter'

function novel(): Novel {
  return {
    id: 'n1',
    name: 'wired-novel',
    style: '',
    worldview: [],
    factionsSummary: [],
    overallOutline: { summary: '', chapters: [] },
    createdAt: '',
    updatedAt: '',
  }
}

function chapter(id: string): Chapter {
  return {
    id,
    index: 1,
    title: '第一章',
    outline: '已寫好的大綱（解鎖內容欄與建議按鈕）',
    scene: { location: '揚州', time: '', weather: '', props: [], mood: '' },
    content: '',
    presentCharacters: [],
    createdAt: '',
    updatedAt: '',
  }
}

function character(id: string): Character {
  return {
    id,
    name: '韋小寶',
    personality: '',
    abilities: [],
    appearance: '',
    factionIds: [],
    socialStatus: '',
    relationships: [],
    notes: '',
    equipment: [],
    createdAt: '',
    updatedAt: '',
  } as Character
}

interface ApiMocks {
  invoke: ReturnType<typeof vi.fn>
}

function installApi(): ApiMocks {
  const invoke = vi.fn(async () => ({
    text: 'AI 回應的具體建議內容',
    source: 'codex' as const,
    durationMs: 1,
    tokensUsed: 10,
  }))
  const api = {
    workspace: {
      list: vi.fn(async () => [novel()]),
      open: vi.fn(),
      close: vi.fn(),
      detectActive: vi.fn(async () => null),
      create: vi.fn(),
      pickFolder: vi.fn(async () => null),
      isWritable: vi.fn(async () => true),
    },
    novel: {
      read: vi.fn(async () => novel()),
      write: vi.fn(async () => undefined),
    },
    character: {
      list: vi.fn(async () => [character('c1')]),
      read: vi.fn(async () => character('c1')),
      write: vi.fn(),
      delete: vi.fn(),
    },
    chapter: {
      list: vi.fn(async () => [chapter('ch1')]),
      read: vi.fn(async () => chapter('ch1')),
      write: vi.fn(),
      delete: vi.fn(),
      branch: { list: vi.fn(async () => []), save: vi.fn(), activate: vi.fn() },
    },
    faction: {
      list: vi.fn(async () => []),
      read: vi.fn(),
      write: vi.fn(),
      delete: vi.fn(),
    },
    ai: { invoke },
    consistency: { dryRun: vi.fn(async () => ({ kind: 'clean' })) },
    export: { chapter: vi.fn() },
    settings: {
      cli: {
        read: vi.fn(async () => ({ codex: '/codex', claude: '/claude', lastDetectedAt: null })),
        write: vi.fn(),
        autoDetect: vi.fn(),
        ensure: vi.fn(async () => ({ codex: '/codex', claude: '/claude', lastDetectedAt: null })),
      },
    },
  }
  ;(window as unknown as { api: unknown }).api = api
  return { invoke }
}

describe('integration: suggestion flow wired end-to-end', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    delete (window as unknown as { api?: unknown }).api
  })

  it('使用者按 SuggestionPanel 的「給我建議」→ window.api.ai.invoke 被呼叫一次、SuggestionPanel 顯示回應', async () => {
    const { invoke } = installApi()
    const workspace = useWorkspaceStore()
    workspace.setWorkspaceRoot('/workspace')
    workspace.setActiveNovel('wired-novel')
    workspace.setCollaborationMode('companion')
    workspace.openChapterTab('ch1', '第一章')

    const wrapper = mount(App)
    await flushPromises()

    // NovelView 預設停在角色分頁；切到章節分頁才能看到 ChapterView
    const chaptersTab = wrapper.find('[data-testid="tab-chapters"]')
    expect(chaptersTab.exists()).toBe(true)
    await chaptersTab.trigger('click')
    await flushPromises()

    // 點 SuggestionPanel 入口按鈕（ChapterView 上的「給我建議」入口）
    const entry = wrapper.find('[data-testid="open-suggestion-entry"]')
    expect(entry.exists()).toBe(true)
    await entry.trigger('click')
    await flushPromises()

    // 點 SuggestionPanel 內的「給我建議」按鈕
    const request = wrapper.find('[data-testid="suggestion-request"]')
    expect(request.exists()).toBe(true)
    await request.trigger('click')
    await flushPromises()

    expect(invoke).toHaveBeenCalledTimes(1)
    const panel = wrapper.find('[data-testid="suggestion-content"]')
    expect(panel.exists()).toBe(true)
    expect(panel.text()).toContain('AI 回應的具體建議內容')
  })
})
