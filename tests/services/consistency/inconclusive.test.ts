import { describe, expect, it } from 'vitest'

import { checkInconclusive } from '@/services/consistency/inconclusive'
import type { AssembledContext } from '@/types/ai'

const fullContext: AssembledContext = {
  worldview: [{ id: 'w1', title: 'a', content: 'a', score: 0 }],
  characters: [
    {
      characterId: 'c1',
      name: 'A',
      personality: '',
      abilities: [],
      factionId: null,
      equipment: [],
      score: 0,
    },
  ],
  overallPlot: { summary: '', chapters: [] },
  presentCharacters: [],
  chapterOutline: { chapterId: 'ch1', outline: '某事' },
  chapterScene: {
    chapterId: 'ch1',
    scene: { location: '', time: '', weather: '', props: [], mood: '' },
  },
}

describe('checkInconclusive', () => {
  it('完整 context → 不 inconclusive', () => {
    expect(checkInconclusive(fullContext)).toBeNull()
  })

  it('缺 characters + worldview → inconclusive 且 missingSlices 含兩者', () => {
    const ctx = { ...fullContext, characters: [], worldview: [] }
    const result = checkInconclusive(ctx)
    expect(result).not.toBeNull()
    expect(result?.missingSlices).toContain('characters')
    expect(result?.missingSlices).toContain('worldview')
  })
})
