import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import FactionSituationHistoryView from '@/components/faction/FactionSituationHistoryView.vue'

describe('FactionSituationHistoryView', () => {
  it('新→舊排序：較新時戳在前', () => {
    const wrapper = mount(FactionSituationHistoryView, {
      props: {
        entries: [
          {
            factionId: 'f1',
            at: '2026-05-10T00:00:00.000Z',
            previousSituation: 'A',
            newSituation: 'B',
          },
          {
            factionId: 'f1',
            at: '2026-05-15T00:00:00.000Z',
            previousSituation: 'B',
            newSituation: 'C',
          },
        ],
      },
    })
    const items = wrapper.findAll('[data-testid^="history-"]')
    expect(items[0]?.text()).toContain('2026-05-15')
    expect(items[1]?.text()).toContain('2026-05-10')
  })
})
