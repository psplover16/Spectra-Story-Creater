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

  it('具名 slot characters / chapters / factions / worldview / settings 各自接收注入內容；切換 tab 時只顯示對應 slot', async () => {
    const wrapper = mount(NovelView, {
      slots: {
        characters: '<div data-testid="slot-chars">CHARS</div>',
        chapters: '<div data-testid="slot-chaps">CHAPS</div>',
        factions: '<div data-testid="slot-facs">FACS</div>',
        worldview: '<div data-testid="slot-wv">WV</div>',
        settings: '<div data-testid="slot-set">SET</div>',
      },
    })

    expect(wrapper.find('[data-testid="slot-chars"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="slot-chaps"]').exists()).toBe(false)

    await wrapper.get('[data-testid="tab-chapters"]').trigger('click')
    expect(wrapper.find('[data-testid="slot-chaps"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="slot-chars"]').exists()).toBe(false)

    await wrapper.get('[data-testid="tab-factions"]').trigger('click')
    expect(wrapper.find('[data-testid="slot-facs"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="slot-chaps"]').exists()).toBe(false)

    await wrapper.get('[data-testid="tab-worldview"]').trigger('click')
    expect(wrapper.find('[data-testid="slot-wv"]').exists()).toBe(true)

    await wrapper.get('[data-testid="tab-settings"]').trigger('click')
    expect(wrapper.find('[data-testid="slot-set"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="slot-wv"]').exists()).toBe(false)
  })
})
