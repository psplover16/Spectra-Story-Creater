import { describe, expectTypeOf, it } from 'vitest'
import type { FactionSummary, Novel, OverallOutline, WorldviewEntry } from '@/types/novel'

describe('Novel 型別關鍵欄位', () => {
  it('Novel 必含 id/name/style/worldview/factionsSummary/overallOutline 與時戳', () => {
    expectTypeOf<Novel>().toHaveProperty('id').toEqualTypeOf<string>()
    expectTypeOf<Novel>().toHaveProperty('name').toEqualTypeOf<string>()
    expectTypeOf<Novel>().toHaveProperty('style').toEqualTypeOf<string>()
    expectTypeOf<Novel>().toHaveProperty('worldview').toEqualTypeOf<WorldviewEntry[]>()
    expectTypeOf<Novel>().toHaveProperty('factionsSummary').toEqualTypeOf<FactionSummary[]>()
    expectTypeOf<Novel>().toHaveProperty('overallOutline').toEqualTypeOf<OverallOutline>()
    expectTypeOf<Novel>().toHaveProperty('createdAt').toEqualTypeOf<string>()
    expectTypeOf<Novel>().toHaveProperty('updatedAt').toEqualTypeOf<string>()
  })

  it('WorldviewEntry 包含 id、title、content', () => {
    expectTypeOf<WorldviewEntry>().toHaveProperty('id').toEqualTypeOf<string>()
    expectTypeOf<WorldviewEntry>().toHaveProperty('title').toEqualTypeOf<string>()
    expectTypeOf<WorldviewEntry>().toHaveProperty('content').toEqualTypeOf<string>()
  })

  it('FactionSummary 是引用級別摘要，含 factionId 與 currentSituation', () => {
    expectTypeOf<FactionSummary>().toHaveProperty('factionId').toEqualTypeOf<string>()
    expectTypeOf<FactionSummary>().toHaveProperty('name').toEqualTypeOf<string>()
    expectTypeOf<FactionSummary>().toHaveProperty('currentSituation').toEqualTypeOf<string>()
  })

  it('OverallOutline 含 summary 與 chapters 索引段', () => {
    expectTypeOf<OverallOutline>().toHaveProperty('summary').toEqualTypeOf<string>()
    expectTypeOf<OverallOutline>()
      .toHaveProperty('chapters')
      .toEqualTypeOf<Array<{ chapterId: string; title: string; brief: string }>>()
  })
})
