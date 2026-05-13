import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import SuggestionToast from '@/components/notifications/SuggestionToast.vue'

describe('SuggestionToast', () => {
  it('不阻擋主流程：渲染為 fixed 定位的訊息卡片，emit details / dismiss 不影響其他 DOM', async () => {
    const wrapper = mount(SuggestionToast, { props: { message: '偵測到性格演化' } })
    expect(wrapper.text()).toContain('偵測到性格演化')
    await wrapper.get('[data-testid="toast-details"]').trigger('click')
    expect(wrapper.emitted('openDetails')).toHaveLength(1)
    await wrapper.get('[data-testid="toast-dismiss"]').trigger('click')
    expect(wrapper.emitted('dismiss')).toHaveLength(1)
  })
})
