import { describe, expect, it } from 'vitest'

import { createClaudeAdapter } from '@/services/ai/claudeAdapter'
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

describe('claudeAdapter', () => {
  it('happy stdout：回 AiInvokeResult，source=claude', async () => {
    const adapter = createClaudeAdapter({
      runner: stubRunner({ kind: 'ok', stdout: '回應', stderr: '', durationMs: 800 }),
    })
    const result = await adapter.invoke({
      context: emptyContext,
      prompt: 'hi',
      role: 'character-voice',
    })
    expect(result.text).toBe('回應')
    expect(result.source).toBe('claude')
  })

  it('ENOENT → CliUnavailableError', async () => {
    const adapter = createClaudeAdapter({
      runner: stubRunner({ kind: 'unavailable', cause: 'ENOENT' }),
    })
    await expect(
      adapter.invoke({ context: emptyContext, prompt: '', role: 'character-voice' }),
    ).rejects.toBeInstanceOf(CliUnavailableError)
  })

  it('非 0 exit → CliExecutionError', async () => {
    const adapter = createClaudeAdapter({
      runner: stubRunner({ kind: 'failed', exitCode: 1, stderr: 'fail' }),
    })
    await expect(
      adapter.invoke({ context: emptyContext, prompt: '', role: 'character-voice' }),
    ).rejects.toBeInstanceOf(CliExecutionError)
  })
})
