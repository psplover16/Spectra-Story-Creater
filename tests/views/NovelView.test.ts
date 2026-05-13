import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import NovelView from '@/views/NovelView.vue'

describe('NovelView', () => {
  it('預設啟用 characters 分頁，且 active 樣式正確', () => {
    const wrapper = mount(NovelView)
    expect(wrapper.get('[data-testid="tab-characters"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.find('[data-testid="panel-characters"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="panel-chapters"]').exists()).toBe(false)
  })

  it('點 chapters 切換分頁，characters 退場', async () => {
    const wrapper = mount(NovelView)
    await wrapper.get('[data-testid="tab-chapters"]').trigger('click')
    expect(wrapper.get('[data-testid="tab-chapters"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.find('[data-testid="panel-chapters"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="panel-characters"]').exists()).toBe(false)
  })
})
