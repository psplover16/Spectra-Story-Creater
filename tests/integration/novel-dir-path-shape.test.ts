import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'

import App from '@/App.vue'
import { clearWorkspaceState } from '@/services/files/workspaceStateRepository'

import { expectPathLike } from '../helpers/expectPathLike'

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

const WORKSPACE_ROOT = 'D:/Novels'
const NOVEL_NAME = '夜霧之城'

function fixtureNovel(): Novel {
  return {
    id: 'novel-vampire',
    name: NOVEL_NAME,
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
    factionIds: [],
    relationships: [],
    equipment: [],
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

function setupApi(): ApiMocks {
  const api: ApiMocks = {
    workspace: {
      list: vi.fn(async () => [fixtureNovel()]),
      pickFolder: vi.fn(async () => WORKSPACE_ROOT),
      isWritable: vi.fn(async () => true),
      create: vi.fn(),
      open: vi.fn(async () => ({ requiresConfirmation: false, activeNovelName: NOVEL_NAME })),
      close: vi.fn(),
      detectActive: vi.fn(async () => ({ activeNovelName: null })),
    },
    novel: {
      read: vi.fn(async () => fixtureNovel()),
      write: vi.fn(async () => fixtureNovel()),
    },
    character: {
      list: vi.fn(async () => [fixtureCharacter()]),
      read: vi.fn(async () => fixtureCharacter()),
      write: vi.fn(async () => fixtureCharacter()),
      delete: vi.fn(async () => undefined),
    },
    chapter: {
      list: vi.fn(async () => [fixtureChapter()]),
      read: vi.fn(async () => fixtureChapter()),
      write: vi.fn(async () => fixtureChapter()),
      delete: vi.fn(async () => undefined),
      branch: {
        list: vi.fn(async () => []),
        save: vi.fn(async () => undefined),
        activate: vi.fn(async () => undefined),
      },
    },
    faction: {
      list: vi.fn(async () => [fixtureFaction()]),
      read: vi.fn(async () => fixtureFaction()),
      write: vi.fn(async () => fixtureFaction()),
      delete: vi.fn(async () => undefined),
    },
    ai: { invoke: vi.fn() },
    consistency: { dryRun: vi.fn() },
    export: { chapter: vi.fn(async () => undefined) },
  }
  ;(globalThis as unknown as { window: { api: ApiMocks } }).window.api = api
  return api
}

async function walkIntoActiveNovel(wrapper: ReturnType<typeof mount>): Promise<void> {
  await wrapper.get('[data-testid="collab-mode-companion"]').trigger('click')
  await flushPromises()
  await wrapper.get('[data-testid="pick-folder"]').trigger('click')
  await flushPromises()
  await wrapper.get(`[data-testid="open-${NOVEL_NAME}"]`).trigger('click')
  await flushPromises()
}

describe('Orchestrator novel identifier contract — IPC 路徑形狀斷言', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
  })

  afterEach(() => {
    clearWorkspaceState()
  })

  it('App.vue 進入小說後 character.list 與 chapter.list 第一參數應為小說資料夾路徑', async () => {
    const api = setupApi()
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })
    await walkIntoActiveNovel(wrapper)

    expect(api.character.list).toHaveBeenCalledWith(expectPathLike(WORKSPACE_ROOT, NOVEL_NAME))
    expect(api.chapter.list).toHaveBeenCalledWith(expectPathLike(WORKSPACE_ROOT, NOVEL_NAME))
  })

  it('WorldviewTab 開啟後 novel.read 第一參數為小說資料夾路徑', async () => {
    const api = setupApi()
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })
    await walkIntoActiveNovel(wrapper)

    await wrapper.get('[data-testid="tab-worldview"]').trigger('click')
    await flushPromises()

    expect(api.novel.read).toHaveBeenCalledWith(expectPathLike(WORKSPACE_ROOT, NOVEL_NAME))
  })

  it('WorldviewTab 新增條目後 novel.write 第一參數為小說資料夾路徑', async () => {
    const api = setupApi()
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })
    await walkIntoActiveNovel(wrapper)

    await wrapper.get('[data-testid="tab-worldview"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="worldview-new-title"]').setValue('魔王降臨')
    await wrapper.get('[data-testid="worldview-new-content"]').setValue('傳說中的魔王再度甦醒')
    await wrapper.get('[data-testid="worldview-add"]').trigger('click')
    await flushPromises()

    expect(api.novel.write).toHaveBeenCalledWith(
      expectPathLike(WORKSPACE_ROOT, NOVEL_NAME),
      expect.any(Object),
    )
  })

  it('FactionsTab 開啟後 faction.list 第一參數為小說資料夾路徑', async () => {
    const api = setupApi()
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })
    await walkIntoActiveNovel(wrapper)

    await wrapper.get('[data-testid="tab-factions"]').trigger('click')
    await flushPromises()

    expect(api.faction.list).toHaveBeenCalledWith(expectPathLike(WORKSPACE_ROOT, NOVEL_NAME))
  })

  it('CharactersTab 新增角色後 character.write 第一參數為小說資料夾路徑', async () => {
    const api = setupApi()
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })
    await walkIntoActiveNovel(wrapper)

    await wrapper.get('[data-testid="character-create"]').trigger('click')
    await wrapper.get('[data-testid="character-name"]').setValue('新角色')
    await wrapper.get('form[data-testid="character-editor"]').trigger('submit.prevent')
    await flushPromises()

    expect(api.character.write).toHaveBeenCalledWith(
      expectPathLike(WORKSPACE_ROOT, NOVEL_NAME),
      expect.objectContaining({ name: '新角色' }),
    )
  })

  it('CharactersTab 刪除角色後 character.delete 第一參數為小說資料夾路徑', async () => {
    const api = setupApi()
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })
    await walkIntoActiveNovel(wrapper)
    await flushPromises()

    await wrapper.get('[data-testid="character-Maria Voss"]').trigger('click')
    await wrapper.get('[data-testid="character-delete"]').trigger('click')
    await flushPromises()

    expect(api.character.delete).toHaveBeenCalledWith(
      expectPathLike(WORKSPACE_ROOT, NOVEL_NAME),
      'char-maria',
    )
  })

  it('ChaptersTab 新增章節後 chapter.write 第一參數為小說資料夾路徑', async () => {
    const api = setupApi()
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })
    await walkIntoActiveNovel(wrapper)

    await wrapper.get('[data-testid="tab-chapters"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="chapter-create"]').trigger('click')
    await flushPromises()

    expect(api.chapter.write).toHaveBeenCalledWith(
      expectPathLike(WORKSPACE_ROOT, NOVEL_NAME),
      expect.any(Object),
    )
  })

  it('ChaptersTab 刪除章節後 chapter.delete 第一參數為小說資料夾路徑', async () => {
    const api = setupApi()
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })
    await walkIntoActiveNovel(wrapper)

    await wrapper.get('[data-testid="tab-chapters"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="chapter-delete-chap-1"]').trigger('click')
    await flushPromises()

    expect(api.chapter.delete).toHaveBeenCalledWith(
      expectPathLike(WORKSPACE_ROOT, NOVEL_NAME),
      'chap-1',
    )
  })

  it('FactionsTab 新增陣營後 faction.write 第一參數為小說資料夾路徑', async () => {
    const api = setupApi()
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })
    await walkIntoActiveNovel(wrapper)

    await wrapper.get('[data-testid="tab-factions"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="faction-create"]').trigger('click')
    await wrapper.get('[data-testid="faction-name"]').setValue('魔王軍')
    await wrapper.get('form[data-testid="faction-editor"]').trigger('submit.prevent')
    await flushPromises()

    expect(api.faction.write).toHaveBeenCalledWith(
      expectPathLike(WORKSPACE_ROOT, NOVEL_NAME),
      expect.objectContaining({ name: '魔王軍' }),
    )
  })

  it('FactionsTab 刪除陣營後 faction.delete 第一參數為小說資料夾路徑', async () => {
    const api = setupApi()
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })
    await walkIntoActiveNovel(wrapper)

    await wrapper.get('[data-testid="tab-factions"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="faction-fac-silver-cross"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="faction-delete"]').trigger('click')
    await flushPromises()

    expect(api.faction.delete).toHaveBeenCalledWith(
      expectPathLike(WORKSPACE_ROOT, NOVEL_NAME),
      'fac-silver-cross',
    )
  })

  it('ChapterView 開啟分支對話框並儲存後 chapter.branch.save 第一參數為小說資料夾路徑', async () => {
    const api = setupApi()
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })
    await walkIntoActiveNovel(wrapper)

    await wrapper.get('[data-testid="tab-chapters"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="chapter-chap-1"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="open-branch-dialog"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="branch-name"]').setValue('alt-pov')
    await wrapper.get('[data-testid="branch-confirm"]').trigger('click')
    await flushPromises()

    expect(api.chapter.branch.save).toHaveBeenCalledWith(
      expectPathLike(WORKSPACE_ROOT, NOVEL_NAME),
      'chap-1',
      'alt-pov',
      expect.any(Object),
    )
  })

  it('ChapterView 點匯出 HTML 後 export.chapter 第一參數為小說資料夾路徑', async () => {
    const api = setupApi()
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })
    await walkIntoActiveNovel(wrapper)

    await wrapper.get('[data-testid="tab-chapters"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="chapter-chap-1"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="open-export-entry"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="export-confirm"]').trigger('click')
    await flushPromises()

    expect(api.export.chapter).toHaveBeenCalledWith(
      expectPathLike(WORKSPACE_ROOT, NOVEL_NAME),
      'chap-1',
      expect.any(String),
    )
  })
})
