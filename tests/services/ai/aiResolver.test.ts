import { describe, expect, it, vi } from 'vitest'

import { createAiResolver, type AiResolverDeps } from '@/services/ai/aiResolver'
import { UnknownRoleError } from '@/services/ai/errors'
import type { AiAdapter, AiSource } from '@/types/ai'

function fakeAdapter(source: AiSource): AiAdapter {
  return {
    source,
    invoke: vi.fn(async () => ({ text: '', source, durationMs: 0 })),
  }
}

function makeDeps(overrides: Partial<AiResolverDeps> = {}): AiResolverDeps {
  const codex = fakeAdapter('codex')
  const claude = fakeAdapter('claude')
  const adapters: Record<AiSource, AiAdapter> = { codex, claude }
  return {
    getParagraphBinding: () => undefined,
    getRoleBinding: () => undefined,
    getCharacterBinding: () => undefined,
    getGlobalDefault: () => 'codex',
    getAdapter: (s) => adapters[s],
    ...overrides,
  }
}

describe('aiResolver four-tier', () => {
  it('paragraph 層命中：回 hitLayer=paragraph', () => {
    const resolver = createAiResolver(makeDeps({ getParagraphBinding: () => 'claude' }))
    const result = resolver.resolve({
      role: 'plot-driver',
      paragraphId: 'p-1',
      characterId: 'c-1',
    })
    expect(result.hitLayer).toBe('paragraph')
    expect(result.adapter.source).toBe('claude')
  })

  it('role 層命中：paragraph 未綁定 → role 命中', () => {
    const resolver = createAiResolver(
      makeDeps({ getRoleBinding: (r) => (r === 'character-voice' ? 'claude' : undefined) }),
    )
    const result = resolver.resolve({
      role: 'character-voice',
      characterId: 'c-1',
    })
    expect(result.hitLayer).toBe('role')
    expect(result.adapter.source).toBe('claude')
  })

  it('character 層命中：paragraph 與 role 都未綁定', () => {
    const resolver = createAiResolver(
      makeDeps({ getCharacterBinding: (c) => (c === '韋小寶' ? 'claude' : undefined) }),
    )
    const result = resolver.resolve({
      role: 'plot-driver',
      characterId: '韋小寶',
    })
    expect(result.hitLayer).toBe('character')
    expect(result.adapter.source).toBe('claude')
  })

  it('global fallback：全部未綁定', () => {
    const resolver = createAiResolver(makeDeps({ getGlobalDefault: () => 'codex' }))
    const result = resolver.resolve({ role: 'plot-driver' })
    expect(result.hitLayer).toBe('global')
    expect(result.adapter.source).toBe('codex')
  })

  it('未知 role 拋 UnknownRoleError', () => {
    const resolver = createAiResolver(makeDeps())
    expect(() => resolver.resolve({ role: 'unknown-role' as never })).toThrowError(UnknownRoleError)
  })
})
