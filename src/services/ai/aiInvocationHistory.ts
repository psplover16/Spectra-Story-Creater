import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { writeUtf8Text } from '@/services/files/encoding'
import type { AiRole, AiSource, HitLayer } from '@/types/ai'

export interface AiInvocationRecord {
  invokedAt: string
  source: AiSource
  hitLayer: HitLayer
  role: AiRole
  reason: string
  durationMs: number
  status: 'ok' | 'cancelled' | 'failed'
}

const HISTORY_FILE = 'ai-invocation-history.json'
const MAX_KEEP = 100

export async function appendInvocation(userDir: string, record: AiInvocationRecord): Promise<void> {
  const existing = await readHistory(userDir)
  const next = [record, ...existing].slice(0, MAX_KEEP)
  await writeUtf8Text(path.join(userDir, HISTORY_FILE), JSON.stringify(next, null, 2))
}

export async function readHistory(userDir: string): Promise<AiInvocationRecord[]> {
  try {
    const raw = await readFile(path.join(userDir, HISTORY_FILE), { encoding: 'utf-8' })
    return JSON.parse(raw) as AiInvocationRecord[]
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
}
