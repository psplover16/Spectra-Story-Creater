import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ExportHistoryView from '@/components/chapter/ExportHistoryView.vue'

describe('ExportHistoryView', () => {
  it('列出已匯出檔，點開啟 emit open 含 filePath', async () => {
    const wrapper = mount(ExportHistoryView, {
      props: {
        files: [
          {
            fileName: 'chapter-1-揚州街頭-epub-like.html',
            filePath: '/tmp/.../chapter-1-揚州街頭-epub-like.html',
            createdAt: '2026-05-13T00:00:00.000Z',
          },
        ],
      },
    })
    expect(wrapper.text()).toContain('揚州街頭')
    await wrapper
      .get('[data-testid="exported-open-chapter-1-揚州街頭-epub-like.html"]')
      .trigger('click')
    expect(wrapper.emitted('open')?.[0]?.[0]).toContain('揚州街頭')
  })
})
