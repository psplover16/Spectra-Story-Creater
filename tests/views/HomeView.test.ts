import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import HomeView from '@/views/HomeView.vue'
import type { Novel } from '@/types/novel'

function makeNovel(name: string): Novel {
  return {
    id: name,
    name,
    style: '',
    worldview: [],
    factionsSummary: [],
    overallOutline: { summary: '', chapters: [] },
    createdAt: '2026-05-13T00:00:00.000Z',
    updatedAt: '2026-05-13T00:00:00.000Z',
  }
}

describe('HomeView', () => {
  it('顯示有效小說清單', () => {
    const wrapper = mount(HomeView, {
      props: {
        novels: [makeNovel('鹿鼎記'), makeNovel('射雕英雄傳')],
      },
    })
    expect(wrapper.get('[data-testid="novel-list"]').text()).toContain('鹿鼎記')
    expect(wrapper.get('[data-testid="novel-list"]').text()).toContain('射雕英雄傳')
  })

  it('混合資料夾：傳入空陣列時顯示 empty 訊息', () => {
    const wrapper = mount(HomeView, { props: { novels: [] } })
    expect(wrapper.get('[data-testid="empty"]').text()).toContain('尚未建立')
  })

  it('點打開後 emit open 事件並帶上小說名', async () => {
    const wrapper = mount(HomeView, { props: { novels: [makeNovel('鹿鼎記')] } })
    await wrapper.get('[data-testid="open-鹿鼎記"]').trigger('click')
    expect(wrapper.emitted('open')?.[0]).toEqual(['鹿鼎記'])
  })
})
