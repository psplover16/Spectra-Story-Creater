import { describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

import ChatPanel from '@/components/ai/ChatPanel.vue'

describe('ChatPanel', () => {
  it('輸入後送出 emit send 含輸入字串並清空輸入框', async () => {
    const wrapper = mount(ChatPanel, { props: { messages: [] } })
    await wrapper.get('[data-testid="chat-input"]').setValue('幫我描述場景')
    await wrapper.get('[data-testid="chat-send"]').trigger('submit')
    expect(wrapper.emitted('send')?.[0]).toEqual(['幫我描述場景'])
    const inputEl = wrapper.get<HTMLInputElement>('[data-testid="chat-input"]').element
      .value as string
    expect(inputEl).toBe('')
  })

  it('messages 變動後自動 scroll 至底（驗證 setProps 後不丟錯）', async () => {
    const wrapper = mount(ChatPanel, {
      props: {
        messages: [{ id: 'm1', author: 'user', text: 'hi', at: '' }],
      },
    })
    await wrapper.setProps({
      messages: [
        { id: 'm1', author: 'user', text: 'hi', at: '' },
        { id: 'm2', author: 'ai', text: '建議', at: '' },
      ],
    })
    await flushPromises()
    expect(wrapper.find('[data-testid="chat-msg-m2"]').exists()).toBe(true)
  })
})
