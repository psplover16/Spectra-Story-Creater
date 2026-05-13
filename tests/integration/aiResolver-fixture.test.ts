import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { createAiResolver } from '@/services/ai/aiResolver'
import { readNovelBindings, writeNovelBindings } from '@/services/ai/bindingRepository'
import type { AiAdapter, AiSource } from '@/types/ai'

const ROOT = path.join(tmpdir(), 'spectra-resolver-fixture-tests')

function makeAdapter(source: AiSource): AiAdapter {
  return {
    source,
    invoke: vi.fn(async () => ({ text: '', source, durationMs: 0 })),
  }
}

describe('integration: aiResolver 透過 file fixture 解析 4 層 binding', () => {
  beforeEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
    await mkdir(ROOT, { recursive: true })
  })

  afterEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
  })

  it('paragraph / role / character / global 各層 fixture 各驗一次', async () => {
    await writeNovelBindings(ROOT, {
      roleBindings: { 'plot-driver': 'claude' },
      characterBindings: { 韋小寶: 'claude' },
      paragraphBindings: { 'p-1': 'claude' },
    })
    const file = await readNovelBindings(ROOT)
    const adapters: Record<AiSource, AiAdapter> = {
      codex: makeAdapter('codex'),
      claude: makeAdapter('claude'),
    }

    const resolver = createAiResolver({
      getParagraphBinding: (id) => file.paragraphBindings[id],
      getRoleBinding: (r) => file.roleBindings[r as 'plot-driver'],
      getCharacterBinding: (c) => file.characterBindings[c],
      getGlobalDefault: () => 'codex',
      getAdapter: (s) => adapters[s],
    })

    expect(resolver.resolve({ role: 'plot-driver', paragraphId: 'p-1' }).hitLayer).toBe('paragraph')
    expect(resolver.resolve({ role: 'plot-driver' }).hitLayer).toBe('role')
    expect(resolver.resolve({ role: 'character-voice', characterId: '韋小寶' }).hitLayer).toBe(
      'character',
    )
    expect(resolver.resolve({ role: 'character-voice' }).hitLayer).toBe('global')
  })
})
