import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ExportDialog from '@/components/chapter/ExportDialog.vue'
import type { ChapterBranch, Scene } from '@/types/chapter'

const emptyScene: Scene = { location: '', time: '', weather: '', props: [], mood: '' }

function branch(name: string, id: string): ChapterBranch {
  return {
    id,
    index: 3,
    title: '誤入禁地',
    outline: '',
    scene: emptyScene,
    content: '',
    presentCharacters: [],
    createdAt: '',
    updatedAt: '',
    branchOf: 'c3',
    branchedAt: '',
    branchName: name,
  }
}

describe('ExportDialog', () => {
  it('切換格式 + 選分支 → confirm propagation 對應值', async () => {
    const wrapper = mount(ExportDialog, {
      props: { branches: [branch('alt-pov-茅十八', 'b1')] },
    })
    await wrapper.get('[data-testid="export-format-web"]').setValue(true)
    await wrapper.get('[data-testid="export-branch-b1"]').setValue(true)
    await wrapper.get('[data-testid="export-confirm"]').trigger('click')
    const emitted = wrapper.emitted('confirm')?.[0]?.[0] as {
      format: string
      branchId: string | null
    }
    expect(emitted.format).toBe('web-page')
    expect(emitted.branchId).toBe('b1')
  })
})
