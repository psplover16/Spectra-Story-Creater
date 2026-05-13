import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ChapterTabs from '@/components/chapter/ChapterTabs.vue'

describe('ChapterTabs', () => {
  it('已開啟之 chapter 重複 requestOpen 時 emit activate 而非 open', () => {
    const wrapper = mount(ChapterTabs, {
      props: {
        tabs: [{ chapterId: 'c1', title: '揚州街頭', isDirty: false }],
        activeChapterId: null,
      },
    })
    const exposed = wrapper.vm as unknown as {
      requestOpen: (chapterId: string, title: string) => void
    }
    exposed.requestOpen('c1', '揚州街頭')
    expect(wrapper.emitted('activate')?.[0]).toEqual(['c1'])
    expect(wrapper.emitted('open')).toBeUndefined()
  })

  it('未開啟之 chapter requestOpen 時 emit open', () => {
    const wrapper = mount(ChapterTabs, {
      props: { tabs: [], activeChapterId: null },
    })
    const exposed = wrapper.vm as unknown as {
      requestOpen: (chapterId: string, title: string) => void
    }
    exposed.requestOpen('c2', '京城風雲')
    expect(wrapper.emitted('open')?.[0]).toEqual(['c2', '京城風雲'])
  })
})
