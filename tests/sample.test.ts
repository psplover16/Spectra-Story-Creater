import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import App from '@/App.vue'

describe('Vitest 與 @vue/test-utils 基礎可用性', () => {
  it('純粹 vitest 斷言可運作', () => {
    expect(1 + 1).toBe(2)
  })

  it('可以掛載 Vue SFC 並讀到內容', () => {
    const wrapper = mount(App, {
      global: { plugins: [createPinia()] },
    })
    // 初始狀態 collaborationMode 為 null → 先顯示 CollaborationModeGate
    expect(wrapper.text()).toContain('挑選協作模式')
  })
})
