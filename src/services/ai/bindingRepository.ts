import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { writeUtf8Text } from '@/services/files/encoding'
import type { AiRole, AiSource } from '@/types/ai'

export interface NovelBindings {
  roleBindings: Partial<Record<AiRole, AiSource>>
  characterBindings: Record<string, AiSource>
  paragraphBindings: Record<string, AiSource>
}

const EMPTY: NovelBindings = {
  roleBindings: {},
  characterBindings: {},
  paragraphBindings: {},
}

function bindingFile(novelDir: string): string {
  return path.join(novelDir, 'ai-bindings.json')
}

export async function readNovelBindings(novelDir: string): Promise<NovelBindings> {
  try {
    const raw = await readFile(bindingFile(novelDir), { encoding: 'utf-8' })
    return JSON.parse(raw) as NovelBindings
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { ...EMPTY }
    throw err
  }
}

export async function writeNovelBindings(novelDir: string, bindings: NovelBindings): Promise<void> {
  await writeUtf8Text(bindingFile(novelDir), JSON.stringify(bindings, null, 2))
}
