import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import SuggestionPanel from '@/components/ai/SuggestionPanel.vue'
import ConflictDialog from '@/components/consistency/ConflictDialog.vue'
import InconclusiveWarning from '@/components/consistency/InconclusiveWarning.vue'
import CliFallbackDialog from '@/components/ai/CliFallbackDialog.vue'

describe('integration: SuggestionPanel 三狀態 + CLI fallback 流轉', () => {
  it('clean → SuggestionPanel 顯示 actionable', () => {
    const wrapper = mount(SuggestionPanel, {
      props: {
        current: {
          actionableSuggestion: '寫一段對話',
          source: 'codex',
          hitLayer: 'global',
        },
      },
    })
    expect(wrapper.get('[data-testid="suggestion-actionable"]').text()).toContain('寫一段對話')
  })

  it('findings → ConflictDialog 渲染', () => {
    const wrapper = mount(ConflictDialog, {
      props: {
        findings: [{ category: 'ooc', chapterId: 'ch1', evidence: '違反設定', severity: 'medium' }],
      },
    })
    expect(wrapper.text()).toContain('違反設定')
  })

  it('inconclusive → InconclusiveWarning 渲染', () => {
    const wrapper = mount(InconclusiveWarning, {
      props: {
        inconclusive: { reason: '上下文不足', missingSlices: ['characters'] },
      },
    })
    expect(wrapper.text()).toContain('上下文不足')
  })

  it('CLI fallback → CliFallbackDialog 渲染 + 三按鈕', () => {
    const wrapper = mount(CliFallbackDialog, {
      props: { failedSource: 'codex', errorMessage: 'ENOENT' },
    })
    expect(wrapper.find('[data-testid="cli-fallback-retry"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cli-fallback-switch"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cli-fallback-cancel"]').exists()).toBe(true)
  })
})
