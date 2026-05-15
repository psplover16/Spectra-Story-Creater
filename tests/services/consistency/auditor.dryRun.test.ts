import { describe, expect, it } from 'vitest'

import { auditorDryRun } from '@/services/consistency/auditor'
import type { AssembledContext } from '@/types/ai'

const baseContext: AssembledContext = {
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
      // CharacterSlice keeps single-value factionId for relevance ranking
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

describe('auditor.dryRun', () => {
  it('空 findings → kind=clean', () => {
    const result = auditorDryRun({
      candidateResponse: '平靜寫一段',
      chapterId: 'ch1',
      chapterIndex: 1,
      presentCharacters: [],
      worldview: [{ id: 'w1', title: '清初', content: '清初江湖' }],
      deceasedCharacterIds: [],
      context: baseContext,
      mutes: [],
    })
    expect(result.kind).toBe('clean')
  })

  it('非空 findings 阻擋 → kind=findings', () => {
    const result = auditorDryRun({
      candidateResponse: '韋小寶大喊大叫',
      chapterId: 'ch1',
      chapterIndex: 1,
      presentCharacters: [
        {
          id: 'c-wei',
          name: '韋小寶',
          personality: '沉默寡言',
          abilities: [],
          appearance: '',
          factionIds: [],
          socialStatus: '',
          relationships: [],
          notes: '',
          equipment: [],
          createdAt: '',
          updatedAt: '',
        },
      ],
      worldview: [{ id: 'w1', title: '清初', content: '清初江湖' }],
      deceasedCharacterIds: [],
      context: baseContext,
      mutes: [],
    })
    expect(result.kind).toBe('findings')
    if (result.kind === 'findings') {
      expect(result.findings.length).toBeGreaterThan(0)
      expect(result.findings[0]?.category).toBe('ooc')
    }
  })
})
