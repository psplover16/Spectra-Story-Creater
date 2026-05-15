import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import ChaptersTab from '@/components/tabs/ChaptersTab.vue'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Chapter } from '@/types/chapter'

function makeChapter(overrides: Partial<Chapter> & { id: string; index: number; title: string }): Chapter {
  return {
    outline: '',
    scene: { location: '', time: '', weather: '', props: [], mood: '' },
    content: '',
    presentCharacters: [],
    createdAt: '2026-05-13T00:00:00.000Z',
    updatedAt: '2026-05-13T00:00:00.000Z',
    ...overrides,
  }
}

function setupApi(initialList: Chapter[]): {
  chapter: {
    list: ReturnType<typeof vi.fn>
    read: ReturnType<typeof vi.fn>
    write: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
} {
  const chapter = {
    list: vi.fn(async () => initialList),
    read: vi.fn(async () => null),
    write: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
  }
  ;(window as unknown as { api: unknown }).api = { chapter }
  return { chapter }
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('ChaptersTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('mount 時呼叫 chapter.list 並傳入 novelDir', async () => {
    const api = setupApi([])
    mount(ChaptersTab, { props: { novelDir: 'n1' } })
    await flush()
    expect(api.chapter.list).toHaveBeenCalledWith('n1')
  })

  it('點章節列表項時 emit open-chapter 帶 chapter id', async () => {
    setupApi([makeChapter({ id: 'ch1', index: 1, title: '第一章' })])
    const wrapper = mount(ChaptersTab, { props: { novelDir: 'n1' } })
    await flush()
    await wrapper.get('[data-testid="chapter-ch1"]').trigger('click')
    const events = wrapper.emitted('open-chapter')
    expect(events).toBeTruthy()
    expect(events?.[0]).toEqual(['ch1'])
  })

  it('當章節已在 workspace.chapterTabs 中時，emit focus-chapter（不重複 open-chapter）', async () => {
    setupApi([makeChapter({ id: 'ch1', index: 1, title: '第一章' })])
    const store = useWorkspaceStore()
    store.openChapterTab('ch1', '第一章')
    const wrapper = mount(ChaptersTab, { props: { novelDir: 'n1' } })
    await flush()
    await wrapper.get('[data-testid="chapter-ch1"]').trigger('click')
    const open = wrapper.emitted('open-chapter')
    const focus = wrapper.emitted('focus-chapter')
    expect(open).toBeFalsy()
    expect(focus).toBeTruthy()
    expect(focus?.[0]).toEqual(['ch1'])
  })

  it('新增按鈕呼叫 chapter.write 建出新章節', async () => {
    const api = setupApi([])
    const wrapper = mount(ChaptersTab, { props: { novelDir: 'n1' } })
    await flush()
    await wrapper.get('[data-testid="chapter-create"]').trigger('click')
    await flush()
    expect(api.chapter.write).toHaveBeenCalledTimes(1)
    const [novelDir, payload] = api.chapter.write.mock.calls[0] as [string, Chapter]
    expect(novelDir).toBe('n1')
    expect(payload.title).toBeTruthy()
  })

  it('新增章節後 emit open-chapter 帶新章節 id（自動跳到編輯畫面）', async () => {
    const api = setupApi([])
    const wrapper = mount(ChaptersTab, { props: { novelDir: 'n1' } })
    await flush()
    await wrapper.get('[data-testid="chapter-create"]').trigger('click')
    await flush()
    const [, payload] = api.chapter.write.mock.calls[0] as [string, Chapter]
    const events = wrapper.emitted('open-chapter')
    expect(events).toBeTruthy()
    expect(events?.[events.length - 1]).toEqual([payload.id])
  })
})
