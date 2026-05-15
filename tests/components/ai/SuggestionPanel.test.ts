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

  it('isLoading prop = true 時按鈕禁用', () => {
    const wrapper = mount(SuggestionPanel, {
      props: { current: null, isLoading: true },
    })
    const button = wrapper.get('[data-testid="suggestion-request"]')
      .element as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('pendingFindings 非空時渲染 inline 警示區塊與各偵測項目', () => {
    const wrapper = mount(SuggestionPanel, {
      props: {
        current: null,
        pendingFindings: {
          kind: 'findings',
          findings: [
            { category: 'ooc', chapterId: 'ch1', evidence: '對話與性格不符', severity: 'medium' },
            { category: 'worldview-conflict', chapterId: 'ch1', evidence: '武器超出時代', severity: 'high' },
          ],
        },
      },
    })
    const warning = wrapper.find('[data-testid="suggestion-findings-warning"]')
    expect(warning.exists()).toBe(true)
    expect(warning.text()).toContain('本建議與既有設定不一致')
    const items = wrapper.findAll('[data-testid="suggestion-finding-item"]')
    expect(items).toHaveLength(2)
  })

  it('pendingFindingsInconclusive = true 時額外渲染審慎採用句', () => {
    const wrapper = mount(SuggestionPanel, {
      props: {
        current: null,
        pendingFindings: {
          kind: 'inconclusive',
          details: { reason: '缺資料', missingSlices: ['worldview'] },
        },
        pendingFindingsInconclusive: true,
      },
    })
    expect(wrapper.find('[data-testid="suggestion-findings-inconclusive"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="suggestion-findings-inconclusive"]').text()).toContain(
      '審慎採用',
    )
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
