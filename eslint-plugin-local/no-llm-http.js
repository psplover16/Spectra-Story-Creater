'use strict'

/**
 * 自製 ESLint plugin：擋下對 LLM 廠商 HTTP endpoint 的呼叫 / 字串字面 / import。
 *
 * 對應 design.md D3「隱私為規格層級硬約束（永不外傳）」與
 * specs/ai-adapters.md 的「No direct HTTP calls to LLM vendor APIs」。
 *
 * 偵測手法：掃描程式碼中所有字串字面（Literal、TemplateLiteral 的 quasi）
 * 是否包含已知 LLM 廠商主機名稱。
 */

const FORBIDDEN_HOSTS = [
  'api.anthropic.com',
  'api.openai.com',
  'generativelanguage.googleapis.com',
  'api.mistral.ai',
  'api.cohere.ai',
  'api.together.xyz',
  'api.groq.com',
  'api.deepseek.com',
]

function containsForbiddenHost(text) {
  if (typeof text !== 'string') return null
  for (const host of FORBIDDEN_HOSTS) {
    if (text.includes(host)) {
      return host
    }
  }
  return null
}

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        '禁止程式碼出現 LLM 廠商 HTTP endpoint，避免本機 CLI 路線被繞過（D3 隱私硬約束）',
    },
    schema: [],
    messages: {
      llmEndpoint:
        '禁止對 LLM 廠商 endpoint「{{host}}」做任何 HTTP 呼叫或字串引用，請改走本機 CLI 子行程',
    },
  },
  create(context) {
    function reportIfForbidden(node, text) {
      const host = containsForbiddenHost(text)
      if (host !== null) {
        context.report({ node, messageId: 'llmEndpoint', data: { host } })
      }
    }

    return {
      Literal(node) {
        reportIfForbidden(node, node.value)
      },
      TemplateLiteral(node) {
        const joined = node.quasis.map((q) => q.value.cooked).join('')
        reportIfForbidden(node, joined)
      },
    }
  },
}

module.exports = {
  rules: {
    'no-llm-http': rule,
  },
}
