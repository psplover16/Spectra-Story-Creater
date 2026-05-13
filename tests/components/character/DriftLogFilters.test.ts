import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import DriftLogFilters from '@/components/character/DriftLogFilters.vue'

describe('DriftLogFilters', () => {
  it('輸入過濾條件後 emit update', async () => {
    const wrapper = mount(DriftLogFilters)
    await wrapper.get('[data-testid="filter-from"]').setValue('2026-05-10')
    await wrapper.get('[data-testid="filter-character"]').setValue('c-wei')
    const events = wrapper.emitted('update') as unknown as Array<
      [{ fromTime: string; characterId: string }]
    >
    expect(events.length).toBeGreaterThan(0)
    const last = events[events.length - 1]?.[0]
    expect(last?.fromTime).toBe('2026-05-10')
    expect(last?.characterId).toBe('c-wei')
  })
})
