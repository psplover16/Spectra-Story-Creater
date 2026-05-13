import { describe, expect, it } from 'vitest'
import { RuleTester } from 'eslint'
// @ts-expect-error 自製 plugin 無型別宣告
import localPlugin from '../../eslint-plugin-local/no-llm-http'

const tester = new RuleTester({
  // eslint v8 RuleTester 的 legacy 設定，@types/eslint 的型別偏向 flat config，這裡強制套用。
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
} as unknown as ConstructorParameters<typeof RuleTester>[0])

describe('eslint-plugin-local: no-llm-http', () => {
  it('擋下對 LLM 廠商 HTTP endpoint 的 fetch / 字串字面 / import', () => {
    tester.run('no-llm-http', localPlugin.rules['no-llm-http'], {
      valid: [
        { code: "fetch('https://example.com/data')" },
        { code: "import fs from 'node:fs'" },
        { code: "const url = 'https://example.com/api'" },
        { code: "import { spawn } from 'node:child_process'" },
        { code: "fetch('http://localhost:3000/api/internal')" },
      ],
      invalid: [
        {
          code: "fetch('https://api.anthropic.com/v1/messages')",
          errors: [{ messageId: 'llmEndpoint' }],
        },
        {
          code: "const u = 'https://api.openai.com/v1/chat/completions'",
          errors: [{ messageId: 'llmEndpoint' }],
        },
        {
          code: "import client from 'https://api.anthropic.com/sdk'",
          errors: [{ messageId: 'llmEndpoint' }],
        },
        {
          code: 'const url = `https://api.anthropic.com/v1/${path}`',
          errors: [{ messageId: 'llmEndpoint' }],
        },
        {
          code: "axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro')",
          errors: [{ messageId: 'llmEndpoint' }],
        },
      ],
    })
    expect(true).toBe(true)
  })
})
