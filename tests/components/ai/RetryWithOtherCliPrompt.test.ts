import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import RetryWithOtherCliPrompt from '@/components/ai/RetryWithOtherCliPrompt.vue'

describe('RetryWithOtherCliPrompt', () => {
  it('retry / switch / cancel 三按鈕事件 propagation', async () => {
    const wrapper = mount(RetryWithOtherCliPrompt, {
      props: { failedSource: 'codex' },
    })
    await wrapper.get('[data-testid="retry-retry"]').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
    await wrapper.get('[data-testid="retry-switch"]').trigger('click')
    expect(wrapper.emitted('switch')?.[0]).toEqual(['claude'])
    await wrapper.get('[data-testid="retry-cancel"]').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
