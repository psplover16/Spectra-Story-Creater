import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import SuggestionPanel from '@/components/ai/SuggestionPanel.vue'

describe('SuggestionPanel', () => {
  it('未按按鈕不觸發 invoke（emit request 由按鈕觸發）', () => {
    const wrapper = mount(SuggestionPanel, { props: { current: null } })
    expect(wrapper.emitted('request')).toBeUndefined()
  })

  it('按按鈕 emit request 一次', async () => {
    const wrapper = mount(SuggestionPanel, { props: { current: null } })
    await wrapper.get('[data-testid="suggestion-request"]').trigger('click')
    expect(wrapper.emitted('request')).toHaveLength(1)
  })

  it('傳入 current 時顯示 actionableSuggestion（D8 強建議內容含具體方案）', () => {
    const wrapper = mount(SuggestionPanel, {
      props: {
        current: {
          actionableSuggestion: '韋小寶可以假裝認錯人，從茅十八側面切入',
          source: 'codex',
          hitLayer: 'role',
        },
      },
    })
    expect(wrapper.get('[data-testid="suggestion-actionable"]').text()).toContain('假裝認錯人')
  })
})
