import { describe, expect, it } from 'vitest'

import { createContextAssembler } from '@/services/ai/contextAssembler'
import type { Character } from '@/types/character'
import type { Chapter, Scene } from '@/types/chapter'
import type { Novel } from '@/types/novel'

const emptyScene: Scene = { location: '', time: '', weather: '', props: [], mood: '' }

function makeNovel(
  worldviewContents: Array<{ id: string; title: string; content: string }>,
): Novel {
  return {
    id: 'n1',
    name: '鹿鼎記',
    style: '',
    worldview: worldviewContents,
    factionsSummary: [],
    overallOutline: { summary: '', chapters: [] },
    createdAt: '',
    updatedAt: '',
  }
}

function makeChapter(): Chapter {
  return {
    id: 'ch1',
    index: 1,
    title: '一章',
    outline: '',
    scene: emptyScene,
    content: '',
    presentCharacters: [],
    createdAt: '',
    updatedAt: '',
  }
}

function makeChar(): Character[] {
  return []
}

describe('contextAssembler budget', () => {
  it('S1+S2 進入、S3 跳過：budget 切尾', async () => {
    const assembler = createContextAssembler({
      loadNovel: async () =>
        makeNovel([
          { id: 's1', title: 'a', content: 'x'.repeat(20) },
          { id: 's2', title: 'b', content: 'x'.repeat(20) },
          { id: 's3', title: 'c', content: 'x'.repeat(20) },
        ]),
      loadCharacters: async () => makeChar(),
      loadChapters: async () => [makeChapter()],
    })
    const { context, diagnostics } = await assembler.assembleWithDiagnostics({
      novelId: 'n1',
      chapterId: 'ch1',
      tokenBudget: 20,
    })
    expect(context.worldview).toHaveLength(2)
    expect(diagnostics.skippedByBudget).toContain('s3')
  })

  it('單一過大 slice 跳過並寫入 skipped', async () => {
    const assembler = createContextAssembler({
      loadNovel: async () => makeNovel([{ id: 'big', title: 'huge', content: 'x'.repeat(600) }]),
      loadCharacters: async () => makeChar(),
      loadChapters: async () => [makeChapter()],
    })
    const { context, diagnostics } = await assembler.assembleWithDiagnostics({
      novelId: 'n1',
      chapterId: 'ch1',
      tokenBudget: 50,
    })
    expect(context.worldview).toHaveLength(0)
    expect(diagnostics.skippedBySize).toContain('big')
  })
})
