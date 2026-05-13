import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import SuggestionSourceBadge from '@/components/ai/SuggestionSourceBadge.vue'

describe('SuggestionSourceBadge', () => {
  it('hitLayer=role + source=claude → 字串「本次由 Claude 產生（職能綁定）」', () => {
    const wrapper = mount(SuggestionSourceBadge, {
      props: { source: 'claude', hitLayer: 'role' },
    })
    expect(wrapper.text()).toBe('本次由 Claude 產生（職能綁定）')
  })

  it('hitLayer=paragraph + source=codex', () => {
    const wrapper = mount(SuggestionSourceBadge, {
      props: { source: 'codex', hitLayer: 'paragraph' },
    })
    expect(wrapper.text()).toContain('Codex')
    expect(wrapper.text()).toContain('段落覆寫')
  })
})
