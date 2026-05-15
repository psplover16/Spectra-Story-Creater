import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ChapterEditor from '@/components/chapter/ChapterEditor.vue'
import type { Chapter, Scene } from '@/types/chapter'

const emptyScene: Scene = { location: '', time: '', weather: '', props: [], mood: '' }

function ch(outline: string): Chapter {
  return {
    id: 'c1',
    index: 1,
    title: '第一章',
    outline,
    scene: emptyScene,
    content: '',
    presentCharacters: [],
    createdAt: '',
    updatedAt: '',
  }
}

describe('ChapterEditor', () => {
  it('outline 為空時，content 欄位禁用', () => {
    const wrapper = mount(ChapterEditor, { props: { chapter: ch('') } })
    const content = wrapper.get<HTMLTextAreaElement>('[data-testid="chapter-content"]')
      .element as HTMLTextAreaElement
    expect(content.disabled).toBe(true)
    expect(wrapper.get('[data-testid="content-locked-hint"]').isVisible()).toBe(true)
  })

  it('outline 非空時，content 啟用', async () => {
    const wrapper = mount(ChapterEditor, { props: { chapter: ch('') } })
    await wrapper.get('[data-testid="chapter-outline"]').setValue('開場：揚州街頭')
    const content = wrapper.get<HTMLTextAreaElement>('[data-testid="chapter-content"]')
      .element as HTMLTextAreaElement
    expect(content.disabled).toBe(false)
  })

  it('同章節內 props.chapter 變新 reference 時 → 不覆寫 draft（避免勾選在場角色時清空 outline）', async () => {
    const chapter = ch('')
    const wrapper = mount(ChapterEditor, { props: { chapter } })
    await wrapper.get('[data-testid="chapter-outline"]').setValue('使用者打了一半的大綱')
    // 模擬父層 refresh：同 id 但新 reference、outline 仍是檔案上的空字串
    await wrapper.setProps({
      chapter: { ...chapter, presentCharacters: ['c1'] },
    })
    const outline = wrapper.get<HTMLTextAreaElement>('[data-testid="chapter-outline"]')
      .element as HTMLTextAreaElement
    expect(outline.value).toBe('使用者打了一半的大綱')
  })
})
