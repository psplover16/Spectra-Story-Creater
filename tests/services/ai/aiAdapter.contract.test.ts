import { describe, expectTypeOf, it } from 'vitest'

import type { AiAdapter, AiInvokeInput, AiInvokeResult } from '@/services/ai/aiAdapter'
import type { AiSource } from '@/types/ai'

describe('AiAdapter contract', () => {
  it('AiAdapter 介面 source 是 AiSource、invoke 回傳 Promise<AiInvokeResult>', () => {
    expectTypeOf<AiAdapter>().toHaveProperty('source').toEqualTypeOf<AiSource>()
    expectTypeOf<AiAdapter>()
      .toHaveProperty('invoke')
      .returns.resolves.toEqualTypeOf<AiInvokeResult>()
  })

  it('AiInvokeResult 包含 text 與 durationMs', () => {
    expectTypeOf<AiInvokeResult>().toHaveProperty('text').toEqualTypeOf<string>()
    expectTypeOf<AiInvokeResult>().toHaveProperty('source').toEqualTypeOf<AiSource>()
    expectTypeOf<AiInvokeResult>().toHaveProperty('durationMs').toEqualTypeOf<number>()
  })

  it('AiInvokeInput 含 prompt 與 role', () => {
    expectTypeOf<AiInvokeInput>().toHaveProperty('prompt').toEqualTypeOf<string>()
  })
})
