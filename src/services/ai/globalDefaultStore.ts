import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { writeUtf8Text } from '@/services/files/encoding'
import type { AiSource } from '@/types/ai'

export interface GlobalDefaultStoreFile {
  defaultSource: AiSource
  /** 預留：user-level proactivity / collaboration mode 等設定 */
  extras?: Record<string, unknown>
}

const DEFAULT_FILE: GlobalDefaultStoreFile = { defaultSource: 'codex' }

function configFile(userDir: string): string {
  return path.join(userDir, 'global-defaults.json')
}

export async function readGlobalDefaults(userDir: string): Promise<GlobalDefaultStoreFile> {
  try {
    const raw = await readFile(configFile(userDir), { encoding: 'utf-8' })
    return JSON.parse(raw) as GlobalDefaultStoreFile
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { ...DEFAULT_FILE }
    throw err
  }
}

export async function writeGlobalDefaults(
  userDir: string,
  file: GlobalDefaultStoreFile,
): Promise<void> {
  await mkdir(userDir, { recursive: true })
  await writeUtf8Text(configFile(userDir), JSON.stringify(file, null, 2))
}
