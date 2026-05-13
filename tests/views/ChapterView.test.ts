import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'

import ChapterView from '@/views/ChapterView.vue'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Chapter, Scene } from '@/types/chapter'

const emptyScene: Scene = { location: '', time: '', weather: '', props: [], mood: '' }

function ch(id: string, title: string, outline = '開場'): Chapter {
  return {
    id,
    index: 1,
    title,
    outline,
    scene: emptyScene,
    content: '',
    presentCharacters: [],
    createdAt: '',
    updatedAt: '',
  }
}

describe('ChapterView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('完整 flow：openChapter → 編輯 outline → 點另存為分支 → emit saveBranch', async () => {
    const chapter = ch('c1', '誤入禁地')
    const wrapper = mount(ChapterView, {
      props: {
        chapters: [chapter],
        characters: [],
        branchesByChapter: {},
      },
    })
    const workspace = useWorkspaceStore()

    const exposed = wrapper.vm as unknown as {
      openChapter: (chapter: Chapter) => void
      openBranchDialog: () => void
    }
    exposed.openChapter(chapter)
    await flushPromises()

    expect(workspace.chapterTabs).toHaveLength(1)
    expect(workspace.chapterTabs[0]?.chapterId).toBe('c1')
    expect(wrapper.find('[data-testid="chapter-editor"]').exists()).toBe(true)

    await wrapper.get('[data-testid="chapter-outline"]').setValue('開場：誤入天地會聚會')
    await wrapper.get('[data-testid="chapter-save"]').trigger('submit')
    const saved = wrapper.emitted('saveChapter') as unknown as Array<[Chapter]>
    expect(saved).toBeDefined()
    expect(saved[0]?.[0].outline).toBe('開場：誤入天地會聚會')

    await wrapper.get('[data-testid="open-branch-dialog"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="branch-name"]').setValue('alt-pov-茅十八')
    await wrapper.get('[data-testid="branch-confirm"]').trigger('click')
    const branchEvents = wrapper.emitted('saveBranch') as unknown as Array<[string, string]>
    expect(branchEvents[0]).toEqual(['c1', 'alt-pov-茅十八'])
  })

  it('章節有 outline 後顯示「給我建議」與「匯出 HTML」入口；點按鈕開出對應元件', async () => {
    const chapter = ch('c2', '霧夜對峙', '開場：濃霧下的對峙')
    const wrapper = mount(ChapterView, {
      props: { chapters: [chapter], characters: [], branchesByChapter: {} },
    })
    const exposed = wrapper.vm as unknown as { openChapter: (c: Chapter) => void }
    exposed.openChapter(chapter)
    await flushPromises()

    expect(wrapper.find('[data-testid="open-suggestion-entry"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="open-export-entry"]').exists()).toBe(true)

    await wrapper.get('[data-testid="open-suggestion-entry"]').trigger('click')
    expect(wrapper.find('[data-testid="suggestion-panel"]').exists()).toBe(true)

    await wrapper.get('[data-testid="open-export-entry"]').trigger('click')
    expect(wrapper.find('[data-testid="export-dialog"]').exists()).toBe(true)
  })

  it('章節 outline 為空時，「給我建議」與「匯出 HTML」入口不顯示', async () => {
    const chapter = ch('c3', '草稿', '')
    const wrapper = mount(ChapterView, {
      props: { chapters: [chapter], characters: [], branchesByChapter: {} },
    })
    const exposed = wrapper.vm as unknown as { openChapter: (c: Chapter) => void }
    exposed.openChapter(chapter)
    await flushPromises()

    expect(wrapper.find('[data-testid="chapter-entries"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="open-suggestion-entry"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="open-export-entry"]').exists()).toBe(false)
  })

  it('「給我建議」面板觸發 request：emit requestSuggestion 帶 chapter id', async () => {
    const chapter = ch('c4', '深夜', '開場：深夜')
    const wrapper = mount(ChapterView, {
      props: { chapters: [chapter], characters: [], branchesByChapter: {} },
    })
    const exposed = wrapper.vm as unknown as { openChapter: (c: Chapter) => void }
    exposed.openChapter(chapter)
    await flushPromises()
    await wrapper.get('[data-testid="open-suggestion-entry"]').trigger('click')
    await wrapper.get('[data-testid="suggestion-request"]').trigger('click')
    const evts = wrapper.emitted('requestSuggestion') as unknown as Array<[string]>
    expect(evts?.[0]).toEqual(['c4'])
  })

  it('「匯出 HTML」面板觸發 confirm：emit exportChapter 帶 chapter id、format、branchId', async () => {
    const chapter = ch('c5', '會戰', '開場：會戰')
    const wrapper = mount(ChapterView, {
      props: { chapters: [chapter], characters: [], branchesByChapter: {} },
    })
    const exposed = wrapper.vm as unknown as { openChapter: (c: Chapter) => void }
    exposed.openChapter(chapter)
    await flushPromises()
    await wrapper.get('[data-testid="open-export-entry"]').trigger('click')
    await wrapper.get('[data-testid="export-confirm"]').trigger('click')
    const evts = wrapper.emitted('exportChapter') as unknown as Array<
      [{ chapterId: string; format: string; branchId: string | null }]
    >
    expect(evts?.[0]?.[0]).toMatchObject({ chapterId: 'c5', format: 'epub-like', branchId: null })
  })
})
