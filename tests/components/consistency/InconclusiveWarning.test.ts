import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import InconclusiveWarning from '@/components/consistency/InconclusiveWarning.vue'

describe('InconclusiveWarning', () => {
  it('顯示 reason 與 missingSlices', () => {
    const wrapper = mount(InconclusiveWarning, {
      props: {
        inconclusive: {
          reason: '上下文不足',
          missingSlices: ['characters', 'worldview'],
        },
      },
    })
    expect(wrapper.text()).toContain('上下文不足')
    expect(wrapper.get('[data-testid="inconclusive-missing"]').text()).toContain('characters')
    expect(wrapper.get('[data-testid="inconclusive-missing"]').text()).toContain('worldview')
  })
})
