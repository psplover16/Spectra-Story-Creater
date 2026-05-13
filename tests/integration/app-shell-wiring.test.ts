import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'

import App from '@/App.vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { clearWorkspaceState, STORAGE_KEY } from '@/services/files/workspaceStateRepository'

import type { Chapter } from '@/types/chapter'
import type { Character } from '@/types/character'
import type { Faction } from '@/types/faction'
import type { Novel } from '@/types/novel'

interface ApiMocks {
  workspace: {
    list: ReturnType<typeof vi.fn>
    pickFolder: ReturnType<typeof vi.fn>
    isWritable: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    open: ReturnType<typeof vi.fn>
    close: ReturnType<typeof vi.fn>
    detectActive: ReturnType<typeof vi.fn>
  }
  novel: { read: ReturnType<typeof vi.fn>; write: ReturnType<typeof vi.fn> }
  character: {
    list: ReturnType<typeof vi.fn>
    read: ReturnType<typeof vi.fn>
    write: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
  chapter: {
    list: ReturnType<typeof vi.fn>
    read: ReturnType<typeof vi.fn>
    write: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    branch: {
      list: ReturnType<typeof vi.fn>
      save: ReturnType<typeof vi.fn>
      activate: ReturnType<typeof vi.fn>
    }
  }
  faction: {
    list: ReturnType<typeof vi.fn>
    read: ReturnType<typeof vi.fn>
    write: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
  ai: { invoke: ReturnType<typeof vi.fn> }
  consistency: { dryRun: ReturnType<typeof vi.fn> }
  export: { chapter: ReturnType<typeof vi.fn> }
}

function fixtureNovel(): Novel {
  return {
    id: 'novel-vampire',
    name: '夜霧之城',
    style: '哥德吸血鬼短篇',
    worldview: [],
    factionsSummary: [],
    overallOutline: { summary: '', chapters: [] },
    createdAt: '2026-05-14T00:00:00.000Z',
    updatedAt: '2026-05-14T00:00:00.000Z',
  }
}

function fixtureCharacter(): Character {
  return {
    id: 'char-maria',
    name: 'Maria Voss',
    personality: '冷靜果斷',
    abilities: ['銀十字劍術'],
    appearance: '黑髮綁辮',
    socialStatus: '自由獵人',
    factionId: null,
    relationships: [],
    notes: '',
    createdAt: '',
    updatedAt: '',
  }
}

function fixtureFaction(): Faction {
  return {
    id: 'fac-silver-cross',
    name: '銀十字團',
    alignment: 'protagonist',
    description: '教會直屬獵人組織',
    currentSituation: '人手不足',
    keyMembers: [],
    createdAt: '',
    updatedAt: '',
  }
}

function fixtureChapter(): Chapter {
  return {
    id: 'chap-1',
    index: 1,
    title: '失蹤的村姑',
    outline: 'Maria 抵達山城，調查連環失蹤案。',
    scene: {
      location: '山城市集',
      time: '黃昏',
      weather: '微霧',
      props: ['銀十字劍'],
      mood: '壓抑',
    },
    content: '',
    presentCharacters: ['char-maria'],
    createdAt: '',
    updatedAt: '',
  }
}

function setupApi(overrides: Partial<ApiMocks> = {}): ApiMocks {
  const api: ApiMocks = {
    workspace: {
      list: vi.fn(async () => [fixtureNovel()]),
      pickFolder: vi.fn(async () => 'D:/Novels'),
      isWritable: vi.fn(async () => true),
      create: vi.fn(),
      open: vi.fn(async () => ({ requiresConfirmation: false, activeNovelName: '夜霧之城' })),
      close: vi.fn(),
      detectActive: vi.fn(async () => ({ activeNovelName: null })),
      ...overrides.workspace,
    },
    novel: {
      read: vi.fn(async () => fixtureNovel()),
      write: vi.fn(async () => fixtureNovel()),
      ...overrides.novel,
    },
    character: {
      list: vi.fn(async () => [fixtureCharacter()]),
      read: vi.fn(async () => fixtureCharacter()),
      write: vi.fn(async () => fixtureCharacter()),
      delete: vi.fn(async () => undefined),
      ...overrides.character,
    },
    chapter: {
      list: vi.fn(async () => [fixtureChapter()]),
      read: vi.fn(async () => fixtureChapter()),
      write: vi.fn(async () => fixtureChapter()),
      delete: vi.fn(async () => undefined),
      branch: {
        list: vi.fn(async () => []),
        save: vi.fn(),
        activate: vi.fn(),
      },
      ...overrides.chapter,
    },
    faction: {
      list: vi.fn(async () => [fixtureFaction()]),
      read: vi.fn(async () => fixtureFaction()),
      write: vi.fn(async () => fixtureFaction()),
      delete: vi.fn(async () => undefined),
      ...overrides.faction,
    },
    ai: { invoke: vi.fn(), ...overrides.ai },
    consistency: { dryRun: vi.fn(), ...overrides.consistency },
    export: { chapter: vi.fn(async () => undefined), ...overrides.export },
  }
  ;(globalThis as unknown as { window: { api: ApiMocks } }).window.api = api
  return api
}

describe('app-shell wiring：完整 happy path', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
  })

  afterEach(() => {
    clearWorkspaceState()
  })

  it('啟動 → CollaborationModeGate → WorkspaceSelectView → HomeView → NovelView 五個 orchestrator slot 全部 mounted（不再是空 slot）', async () => {
    setupApi()
    const wrapper = mount(App, {
      global: { plugins: [createPinia()] },
    })

    // 階段 1：CollaborationModeGate
    expect(wrapper.find('[data-testid="collab-mode-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="pick-folder"]').exists()).toBe(false)

    // 選 collaborator 模式
    await wrapper.get('[data-testid="collab-mode-companion"]').trigger('click')
    await flushPromises()

    // 階段 2：WorkspaceSelectView
    expect(wrapper.find('[data-testid="collab-mode-select"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="pick-folder"]').exists()).toBe(true)

    // 挑工作目錄
    await wrapper.get('[data-testid="pick-folder"]').trigger('click')
    await flushPromises()

    // 階段 3：HomeView
    expect(wrapper.find('[data-testid="pick-folder"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="novel-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="open-夜霧之城"]').exists()).toBe(true)

    // 點開小說
    await wrapper.get('[data-testid="open-夜霧之城"]').trigger('click')
    await flushPromises()

    // 階段 4：NovelView，預設 characters tab
    expect(wrapper.find('[data-testid="panel-characters"]').exists()).toBe(true)
    // CharactersTab 已 mount（看其 data-testid 或 character-list）
    expect(
      wrapper.find('[data-testid="characters-tab"]').exists() ||
        wrapper.find('[data-testid="character-list"]').exists(),
    ).toBe(true)

    // 切到 chapters tab
    await wrapper.get('[data-testid="tab-chapters"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="panel-chapters"]').exists()).toBe(true)
    expect(
      wrapper.find('[data-testid="chapters-tab"]').exists() ||
        wrapper.find('[data-testid="chapter-list"]').exists(),
    ).toBe(true)

    // 切到 factions tab
    await wrapper.get('[data-testid="tab-factions"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="panel-factions"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="factions-tab"]').exists()).toBe(true)

    // 切到 worldview tab
    await wrapper.get('[data-testid="tab-worldview"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="panel-worldview"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="worldview-tab"]').exists()).toBe(true)

    // 切到 settings tab
    await wrapper.get('[data-testid="tab-settings"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="panel-settings"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="settings-tab"]').exists()).toBe(true)
  })

  it('章節入口：在 chapters tab 點章節列表項 → ChapterView mounted；suggestion 與 export 入口可開啟', async () => {
    setupApi()
    const wrapper = mount(App, {
      global: { plugins: [createPinia()] },
    })

    // 走到 NovelView
    await wrapper.get('[data-testid="collab-mode-companion"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="pick-folder"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="open-夜霧之城"]').trigger('click')
    await flushPromises()

    // 切 chapters tab，等資料載入
    await wrapper.get('[data-testid="tab-chapters"]').trigger('click')
    await flushPromises()

    // 點章節（ChapterList 對每章 emit row id 為 data-testid="chapter-<id>"）
    const chapterRow = wrapper.find('[data-testid="chapter-chap-1"]')
    expect(chapterRow.exists()).toBe(true)
    await chapterRow.trigger('click')
    await flushPromises()

    // ChapterView 進場
    expect(wrapper.find('[data-testid="chapter-view"]').exists()).toBe(true)

    // 章節有 outline → 入口按鈕可見
    expect(wrapper.find('[data-testid="open-suggestion-entry"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="open-export-entry"]').exists()).toBe(true)

    // 點「給我建議」→ SuggestionPanel mount
    await wrapper.get('[data-testid="open-suggestion-entry"]').trigger('click')
    expect(wrapper.find('[data-testid="suggestion-panel"]').exists()).toBe(true)

    // 點「匯出 HTML」→ ExportDialog mount
    await wrapper.get('[data-testid="open-export-entry"]').trigger('click')
    expect(wrapper.find('[data-testid="export-dialog"]').exists()).toBe(true)
  })

  it('重啟還原：localStorage 有 workspace state → 啟動跳過 CollaborationModeGate 與 WorkspaceSelectView，直接進入 HomeView 或目標 novel', async () => {
    setupApi()
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        workspacePath: 'D:/Novels',
        activeNovelName: null,
        collaborationMode: 'auto',
        lastUpdated: '2026-05-14T00:00:00.000Z',
      }),
    )

    // 手動 hydrate 模擬 main.ts 啟動序列
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useWorkspaceStore()
    const { setupWorkspacePersistence } = await import(
      '@/services/bootstrap/setupWorkspacePersistence'
    )
    setupWorkspacePersistence(store, { debounceMs: 0 })

    const wrapper = mount(App, { global: { plugins: [pinia] } })
    await flushPromises()

    // 應直接進到 HomeView（gate 與 select 都跳過）
    expect(wrapper.find('[data-testid="collab-mode-select"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="pick-folder"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="novel-list"]').exists()).toBe(true)
  })
})
