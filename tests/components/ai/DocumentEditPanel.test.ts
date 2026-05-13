import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import DocumentEditPanel from '@/components/ai/DocumentEditPanel.vue'

describe('DocumentEditPanel', () => {
  it('AI 插入後 text 含插入內容，undo 後復原', async () => {
    const wrapper = mount(DocumentEditPanel, { props: { initial: '韋小寶' } })
    const exposed = wrapper.vm as unknown as {
      applyAiInsertion: (insertion: string, caret: number) => void
      undo: () => void
      text: string
    }
    exposed.applyAiInsertion('（AI 插入）', 3)
    await wrapper.vm.$nextTick()
    expect(exposed.text).toBe('韋小寶（AI 插入）')
    exposed.undo()
    await wrapper.vm.$nextTick()
    expect(exposed.text).toBe('韋小寶')
  })
})
