import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import PersonalityRewriteDialog from '@/components/character/PersonalityRewriteDialog.vue'

describe('PersonalityRewriteDialog', () => {
  const baseProps = {
    characterName: '韋小寶',
    currentPersonality: '市井狡黠',
    suggestedPersonality: '改寫後性格',
  }

  it('確認 emit confirm 含最終性格', async () => {
    const wrapper = mount(PersonalityRewriteDialog, { props: baseProps })
    await wrapper.get('[data-testid="rewrite-text"]').setValue('我自訂的性格')
    await wrapper.get('[data-testid="rewrite-confirm"]').trigger('click')
    expect(wrapper.emitted('confirm')?.[0]).toEqual(['我自訂的性格'])
  })

  it('取消 emit cancel', async () => {
    const wrapper = mount(PersonalityRewriteDialog, { props: baseProps })
    await wrapper.get('[data-testid="rewrite-cancel"]').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
