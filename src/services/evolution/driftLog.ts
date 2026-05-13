import { appendFile, readFile } from 'node:fs/promises'
import path from 'node:path'

import type { DriftFinding } from '@/types/character'

function driftLogPath(novelDir: string, characterId: string): string {
  return path.join(novelDir, 'characters', `${characterId}.drift-log.jsonl`)
}

export async function appendDriftFinding(novelDir: string, finding: DriftFinding): Promise<void> {
  const line = JSON.stringify(finding) + '\n'
  await appendFile(driftLogPath(novelDir, finding.characterId), line, { encoding: 'utf-8' })
}

export async function readDriftLog(novelDir: string, characterId: string): Promise<DriftFinding[]> {
  try {
    const raw = await readFile(driftLogPath(novelDir, characterId), { encoding: 'utf-8' })
    return raw
      .split('\n')
      .filter((l) => l.length > 0)
      .map((l) => JSON.parse(l) as DriftFinding)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
}
