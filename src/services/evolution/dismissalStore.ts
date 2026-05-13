import { appendFile, readFile } from 'node:fs/promises'
import path from 'node:path'

export interface DriftDismissal {
  characterId: string
  chapterId: string
  dismissedAt: string
  reason?: string
}

function dismissalFile(novelDir: string): string {
  return path.join(novelDir, 'characters', 'drift-dismissals.jsonl')
}

export async function appendDismissal(novelDir: string, dismissal: DriftDismissal): Promise<void> {
  await appendFile(dismissalFile(novelDir), JSON.stringify(dismissal) + '\n', {
    encoding: 'utf-8',
  })
}

export async function readDismissals(novelDir: string): Promise<DriftDismissal[]> {
  try {
    const raw = await readFile(dismissalFile(novelDir), { encoding: 'utf-8' })
    return raw
      .split('\n')
      .filter((l) => l.length > 0)
      .map((l) => JSON.parse(l) as DriftDismissal)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
}
