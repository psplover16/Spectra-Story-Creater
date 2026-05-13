import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import CharacterDriftLogView from '@/components/character/CharacterDriftLogView.vue'
import type { DriftFinding } from '@/types/character'

function f(idx: number): DriftFinding {
  return {
    characterId: 'c1',
    detectedAt: `2026-05-${10 + idx}T00:00:00.000Z`,
    chapterId: `ch${idx + 1}`,
    evidence: `事件 ${idx}`,
    suggestedRewrite: '',
    decision: null,
  }
}

describe('CharacterDriftLogView', () => {
  it('預設 pageSize=10：12 筆會分兩頁', async () => {
    const findings = Array.from({ length: 12 }, (_, i) => f(i))
    const wrapper = mount(CharacterDriftLogView, { props: { findings } })
    expect(wrapper.findAll('[data-testid^="drift-entry-"]')).toHaveLength(10)
    await wrapper.get('[data-testid="drift-page-next"]').trigger('click')
    expect(wrapper.findAll('[data-testid^="drift-entry-"]')).toHaveLength(2)
  })
})
