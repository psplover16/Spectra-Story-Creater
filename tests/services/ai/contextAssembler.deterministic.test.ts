import { describe, expect, it } from 'vitest'

import { createContextAssembler } from '@/services/ai/contextAssembler'
import type { Chapter, Scene } from '@/types/chapter'
import type { Novel } from '@/types/novel'

const emptyScene: Scene = { location: '', time: '', weather: '', props: [], mood: '' }

const novel: Novel = {
  id: 'n1',
  name: '鹿鼎記',
  style: '',
  worldview: [
    { id: 'a', title: 'a', content: 'a' },
    { id: 'b', title: 'b', content: 'b' },
    { id: 'c', title: 'c', content: 'c' },
  ],
  factionsSummary: [],
  overallOutline: { summary: '', chapters: [] },
  createdAt: '',
  updatedAt: '',
}

const chapter: Chapter = {
  id: 'ch1',
  index: 1,
  title: '',
  outline: '',
  scene: emptyScene,
  content: '',
  presentCharacters: [],
  createdAt: '',
  updatedAt: '',
}

describe('contextAssembler deterministic ordering', () => {
  it('同一輸入兩次呼叫結果 deep-equal', async () => {
    const assembler = createContextAssembler({
      loadNovel: async () => novel,
      loadCharacters: async () => [],
      loadChapters: async () => [chapter],
    })
    const a = await assembler.assemble({ novelId: 'n1', chapterId: 'ch1', tokenBudget: 1000 })
    const b = await assembler.assemble({ novelId: 'n1', chapterId: 'ch1', tokenBudget: 1000 })
    expect(a).toEqual(b)
  })
})
