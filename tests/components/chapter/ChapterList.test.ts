import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ChapterList from '@/components/chapter/ChapterList.vue'
import type { Chapter, Scene } from '@/types/chapter'

const emptyScene: Scene = { location: '', time: '', weather: '', props: [], mood: '' }

function ch(id: string, index: number, title: string): Chapter {
  return {
    id,
    index,
    title,
    outline: '',
    scene: emptyScene,
    content: '',
    presentCharacters: [],
    createdAt: '',
    updatedAt: '',
  }
}

describe('ChapterList', () => {
  const list = [ch('a', 1, '揚州街頭'), ch('b', 2, '京城風雲'), ch('c', 3, '誤入禁地')]

  it('reorderChapter(b -> 1)：emit reorder 含三章連續 index 且其他章節未被誤動', async () => {
    const wrapper = mount(ChapterList, { props: { chapters: list } })
    const exposed = wrapper.vm as unknown as {
      reorderChapter: (chapterId: string, toIndex: number) => void
    }
    exposed.reorderChapter('b', 1)
    const emitted = wrapper.emitted('reorder')?.[0]?.[0] as Array<{ id: string; index: number }>
    expect(emitted).toEqual([
      { id: 'b', index: 1 },
      { id: 'a', index: 2 },
      { id: 'c', index: 3 },
    ])
  })
})
