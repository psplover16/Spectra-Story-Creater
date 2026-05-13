import { describe, expect, it } from 'vitest'

import { createCodexAdapter } from '@/services/ai/codexAdapter'
import { CliExecutionError, CliUnavailableError } from '@/services/ai/errors'
import type { CliRunner, CliRunnerResult } from '@/services/ai/aiAdapter'
import type { AssembledContext } from '@/types/ai'

const emptyContext: AssembledContext = {
  worldview: [],
  characters: [],
  overallPlot: { summary: '', chapters: [] },
  presentCharacters: [],
  chapterOutline: { chapterId: '', outline: '' },
  chapterScene: {
    chapterId: '',
    scene: { location: '', time: '', weather: '', props: [], mood: '' },
  },
}

function stubRunner(result: CliRunnerResult): CliRunner {
  return { run: async () => result }
}

describe('codexAdapter', () => {
  it('happy stdout：回 AiInvokeResult，source=codex', async () => {
    const adapter = createCodexAdapter({
      runner: stubRunner({ kind: 'ok', stdout: '建議：寫一段...', stderr: '', durationMs: 420 }),
    })
    const result = await adapter.invoke({
      context: emptyContext,
      prompt: '提示',
      role: 'plot-driver',
    })
    expect(result.text).toBe('建議：寫一段...')
    expect(result.source).toBe('codex')
    expect(result.durationMs).toBe(420)
  })

  it('ENOENT → CliUnavailableError', async () => {
    const adapter = createCodexAdapter({
      runner: stubRunner({ kind: 'unavailable', cause: 'ENOENT' }),
    })
    await expect(
      adapter.invoke({ context: emptyContext, prompt: '', role: 'plot-driver' }),
    ).rejects.toBeInstanceOf(CliUnavailableError)
  })

  it('非 0 exit → CliExecutionError', async () => {
    const adapter = createCodexAdapter({
      runner: stubRunner({ kind: 'failed', exitCode: 2, stderr: 'something went wrong' }),
    })
    await expect(
      adapter.invoke({ context: emptyContext, prompt: '', role: 'plot-driver' }),
    ).rejects.toBeInstanceOf(CliExecutionError)
  })
})
