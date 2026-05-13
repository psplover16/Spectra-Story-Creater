import { appendFile, readFile } from 'node:fs/promises'
import path from 'node:path'

import type { AuditIgnoreRecord } from '@/types/audit'

function ignoreLogPath(novelDir: string): string {
  return path.join(novelDir, 'audit-ignore-log.jsonl')
}

export async function appendIgnoreRecord(
  novelDir: string,
  record: AuditIgnoreRecord,
): Promise<void> {
  await appendFile(ignoreLogPath(novelDir), JSON.stringify(record) + '\n', { encoding: 'utf-8' })
}

export async function readIgnoreRecords(novelDir: string): Promise<AuditIgnoreRecord[]> {
  try {
    const raw = await readFile(ignoreLogPath(novelDir), { encoding: 'utf-8' })
    return raw
      .split('\n')
      .filter((l) => l.length > 0)
      .map((l) => JSON.parse(l) as AuditIgnoreRecord)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
}
