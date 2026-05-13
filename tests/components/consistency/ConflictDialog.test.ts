import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ConflictDialog from '@/components/consistency/ConflictDialog.vue'
import type { AuditFinding } from '@/types/audit'

const finding: AuditFinding = {
  category: 'ooc',
  chapterId: 'ch1',
  evidence: '韋小寶寫成大喊',
  severity: 'medium',
}

describe('ConflictDialog', () => {
  it('rewrite 按鈕 emit rewrite', async () => {
    const wrapper = mount(ConflictDialog, { props: { findings: [finding] } })
    await wrapper.get('[data-testid="conflict-rewrite"]').trigger('click')
    expect(wrapper.emitted('rewrite')).toHaveLength(1)
  })

  it('updateSetup 按鈕 emit updateSetup 含 findingIndex', async () => {
    const wrapper = mount(ConflictDialog, { props: { findings: [finding, finding] } })
    await wrapper.get('[data-testid="conflict-update-1"]').trigger('click')
    expect(wrapper.emitted('updateSetup')?.[0]).toEqual([1])
  })

  it('ignore 按鈕 emit ignore 含 findingIndex', async () => {
    const wrapper = mount(ConflictDialog, { props: { findings: [finding] } })
    await wrapper.get('[data-testid="conflict-ignore-0"]').trigger('click')
    expect(wrapper.emitted('ignore')?.[0]).toEqual([0])
  })
})
