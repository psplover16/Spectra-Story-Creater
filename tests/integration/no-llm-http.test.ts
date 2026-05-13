import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { glob } from 'node:fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.join(__dirname, '..', '..')
const FORBIDDEN_HOSTS = [
  'api.anthropic.com',
  'api.openai.com',
  'generativelanguage.googleapis.com',
  'api.mistral.ai',
  'api.cohere.ai',
] as const

async function listSourceFiles(): Promise<string[]> {
  const result: string[] = []
  for await (const entry of glob('{src,electron}/**/*.{ts,vue,js}', { cwd: ROOT })) {
    result.push(entry)
  }
  return result
}

describe('整合：src 與 electron 不得包含 LLM 廠商 endpoint（D3 隱私硬約束）', () => {
  it.each(FORBIDDEN_HOSTS)('grep "%s" 命中 0 次', async (host) => {
    const files = await listSourceFiles()
    const hits: string[] = []
    for (const f of files) {
      const content = await readFile(path.join(ROOT, f), { encoding: 'utf-8' })
      if (content.includes(host)) hits.push(f)
    }
    expect(hits).toEqual([])
  })
})
