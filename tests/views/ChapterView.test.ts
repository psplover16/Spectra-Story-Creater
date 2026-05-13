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
})
