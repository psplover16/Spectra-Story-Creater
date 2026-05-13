import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ContextDiagnosticsPanel from '@/components/dev/ContextDiagnosticsPanel.vue'

describe('ContextDiagnosticsPanel', () => {
  it('渲染 skipped slice 名單', () => {
    const wrapper = mount(ContextDiagnosticsPanel, {
      props: {
        view: { totalSkipped: 2, skippedByBudget: ['s1'], skippedBySize: ['big'] },
      },
    })
    expect(wrapper.text()).toContain('s1')
    expect(wrapper.text()).toContain('big')
  })
})
