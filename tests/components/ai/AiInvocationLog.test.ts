import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import AiInvocationLog from '@/components/ai/AiInvocationLog.vue'
import type { AiInvocationRecord } from '@/services/ai/aiInvocationHistory'

function rec(at: string): AiInvocationRecord {
  return {
    invokedAt: at,
    source: 'codex',
    hitLayer: 'global',
    role: 'plot-driver',
    reason: '',
    durationMs: 50,
    status: 'ok',
  }
}

describe('AiInvocationLog', () => {
  it('limit=3 時最多渲染 3 筆，新→舊排序由父層保證', () => {
    const records = [
      rec('2026-05-13T00:00:04.000Z'),
      rec('2026-05-13T00:00:03.000Z'),
      rec('2026-05-13T00:00:02.000Z'),
      rec('2026-05-13T00:00:01.000Z'),
    ]
    const wrapper = mount(AiInvocationLog, { props: { records, limit: 3 } })
    expect(wrapper.findAll('[data-testid^="log-"]')).toHaveLength(3)
  })
})
