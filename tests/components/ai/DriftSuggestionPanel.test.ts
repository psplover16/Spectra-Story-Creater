import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import DriftSuggestionPanel from '@/components/ai/DriftSuggestionPanel.vue'
import type { DriftFinding } from '@/types/character'

const finding: DriftFinding = {
  characterId: 'c1',
  detectedAt: '2026-05-13T00:00:00.000Z',
  chapterId: 'ch1',
  evidence: '從市井狡黠演向捨命相護',
  suggestedRewrite: '改寫後性格',
  decision: null,
}

describe('DriftSuggestionPanel', () => {
  it('顯示 evidence 與 suggestedRewrite，三按鈕 propagation', async () => {
    const wrapper = mount(DriftSuggestionPanel, { props: { finding } })
    expect(wrapper.get('[data-testid="drift-evidence"]').text()).toContain('市井狡黠')
    expect(wrapper.get('[data-testid="drift-suggested"]').text()).toContain('改寫後性格')

    await wrapper.get('[data-testid="drift-accept"]').trigger('click')
    expect(wrapper.emitted('acceptAsSuggested')).toHaveLength(1)
    await wrapper.get('[data-testid="drift-edit"]').trigger('click')
    expect(wrapper.emitted('editThenAccept')).toHaveLength(1)
    await wrapper.get('[data-testid="drift-dismiss"]').trigger('click')
    expect(wrapper.emitted('dismiss')).toHaveLength(1)
  })
})
