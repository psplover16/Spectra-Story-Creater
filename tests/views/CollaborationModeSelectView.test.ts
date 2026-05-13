import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import CollaborationModeSelectView from '@/views/CollaborationModeSelectView.vue'

describe('CollaborationModeSelectView', () => {
  it('三選一：選 ghostwriter emit select=ghostwriter', async () => {
    const wrapper = mount(CollaborationModeSelectView, { props: { active: null } })
    await wrapper.get('[data-testid="collab-mode-ghostwriter"]').trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual(['ghostwriter'])
  })

  it('active=companion 時 button 顯示 active 樣式', () => {
    const wrapper = mount(CollaborationModeSelectView, { props: { active: 'companion' } })
    const classes = wrapper.get('[data-testid="collab-mode-companion"]').classes()
    expect(classes.join(' ')).toContain('bg-slate-100')
  })
})
