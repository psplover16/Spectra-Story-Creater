import { describe, expect, it } from 'vitest'
import { RuleTester } from 'eslint'
// @ts-expect-error 自製 plugin 無型別宣告
import localPlugin from '../../eslint-plugin-local/no-llm-http'

const tester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
} as unknown as ConstructorParameters<typeof RuleTester>[0])

describe('no-llm-http rule 單元測試（呼應 D3 與 No direct HTTP calls to LLM vendor APIs）', () => {
  it('命中 fixture / 不命中 fixture 各驗一次', () => {
    tester.run('no-llm-http', localPlugin.rules['no-llm-http'], {
      valid: [{ code: "fetch('https://example.com/data')" }],
      invalid: [
        {
          code: "fetch('https://api.openai.com/v1/chat')",
          errors: [{ messageId: 'llmEndpoint' }],
        },
      ],
    })
    expect(true).toBe(true)
  })
})
