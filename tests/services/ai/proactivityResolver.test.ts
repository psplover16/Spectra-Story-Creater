import { describe, expect, it } from 'vitest'

import { resolveProactivity } from '@/services/ai/proactivityResolver'

describe('proactivityResolver 三層 fallback', () => {
  it('character → novel → global，最具體層級勝出', () => {
    expect(
      resolveProactivity(
        {
          global: 'medium',
          perNovel: { n1: 'weak' },
          perCharacter: { c1: 'strong' },
        },
        { novelId: 'n1', characterId: 'c1' },
      ),
    ).toBe('strong')
  })

  it('character 設「跟隨上層」→ 回退到 novel', () => {
    expect(
      resolveProactivity(
        {
          global: 'medium',
          perNovel: { n1: 'strong' },
          perCharacter: { c1: 'inherit' },
        },
        { novelId: 'n1', characterId: 'c1' },
      ),
    ).toBe('strong')
  })

  it('character 設「關」→ 即使 global=strong 仍勝出', () => {
    expect(
      resolveProactivity(
        {
          global: 'strong',
          perNovel: {},
          perCharacter: { c1: 'off' },
        },
        { novelId: 'n1', characterId: 'c1' },
      ),
    ).toBe('off')
  })
})
