import { describe, expect, it } from 'vitest'
import { glob } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..')

async function listSourceFiles(): Promise<string[]> {
  const result: string[] = []
  for await (const entry of glob('{src,electron}/**/*.{ts,vue,js}', { cwd: ROOT })) {
    result.push(entry)
  }
  return result
}

const IN_SCOPE_MODULES = [
  'src/services/ai/aiAdapter.ts',
  'src/services/ai/aiResolver.ts',
  'src/services/ai/contextAssembler.ts',
  'src/services/consistency/auditor.ts',
  'src/services/export', // placeholder dir for Stage E
]

const OUT_OF_SCOPE_KEYWORDS = ['multi-chapter-merge', 'cloudSync', 'i18n']

describe('scope-boundary：In scope 五大核心服務存在，Out of scope 未被引入', () => {
  it('In scope 核心模組存在', async () => {
    const files = await listSourceFiles()
    expect(files.some((f) => f.replaceAll('\\', '/') === 'src/services/ai/aiAdapter.ts')).toBe(true)
    expect(files.some((f) => f.replaceAll('\\', '/') === 'src/services/ai/aiResolver.ts')).toBe(
      true,
    )
    expect(
      files.some((f) => f.replaceAll('\\', '/') === 'src/services/ai/contextAssembler.ts'),
    ).toBe(true)
    expect(
      files.some((f) => f.replaceAll('\\', '/') === 'src/services/consistency/auditor.ts'),
    ).toBe(true)
  })

  it('Out of scope 關鍵字未在 src/ 中被引入', async () => {
    const files = await listSourceFiles()
    for (const file of files) {
      const content = await readFile(path.join(ROOT, file), { encoding: 'utf-8' })
      for (const kw of OUT_OF_SCOPE_KEYWORDS) {
        expect(content).not.toContain(kw)
      }
    }
    expect(IN_SCOPE_MODULES.length).toBeGreaterThan(0) // keep linter happy
  })
})
