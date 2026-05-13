import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  appendInvocation,
  readHistory,
  type AiInvocationRecord,
} from '@/services/ai/aiInvocationHistory'

const ROOT = path.join(tmpdir(), 'spectra-ai-invocation-history-tests')

function makeRecord(invokedAt: string): AiInvocationRecord {
  return {
    invokedAt,
    source: 'codex',
    hitLayer: 'global',
    role: 'plot-driver',
    reason: '',
    durationMs: 100,
    status: 'ok',
  }
}

describe('aiInvocationHistory', () => {
  beforeEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
    await mkdir(ROOT, { recursive: true })
  })

  afterEach(async () => {
    await rm(ROOT, { recursive: true, force: true })
  })

  it('append 後新→舊排序，且最多保留 100 筆', async () => {
    for (let i = 0; i < 5; i++) {
      await appendInvocation(ROOT, makeRecord(`2026-05-13T00:00:0${i}.000Z`))
    }
    const history = await readHistory(ROOT)
    expect(history).toHaveLength(5)
    // 最後 append 的應在最前
    expect(history[0]?.invokedAt).toBe('2026-05-13T00:00:04.000Z')
  })
})
