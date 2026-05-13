import { describe, expect, it } from 'vitest'

import { redactPrompt } from '@/services/ai/redact'

describe('redactPrompt', () => {
  it('擋下 sk- 開頭的 API key', () => {
    const out = redactPrompt('我的 key 是 sk-abcdefghijklmnopqrstuvwx，請小心')
    expect(out).toContain('[REDACTED-KEY]')
    expect(out).not.toContain('sk-abcdef')
  })

  it('擋下 ENV 風格的賦值列', () => {
    const out = redactPrompt('OPENAI_API_KEY=sk-foo\n正常文字')
    expect(out).toContain('[REDACTED-ENV]')
  })
})
