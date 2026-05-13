/**
 * 在送出 prompt 給 CLI 之前做基礎 sanitize：
 * - 移除疑似 API key（sk-... / abcd-1234-... 之類）
 * - 移除 .env 樣式的賦值列
 *
 * 規格：D3 隱私為硬約束的補強。
 */

const API_KEY_PATTERN = /sk-[A-Za-z0-9]{16,}/g
const ENV_LINE_PATTERN = /^\s*[A-Z][A-Z0-9_]*\s*=\s*.+$/gm

export function redactPrompt(prompt: string): string {
  return prompt
    .replace(API_KEY_PATTERN, '[REDACTED-KEY]')
    .replace(ENV_LINE_PATTERN, '[REDACTED-ENV]')
}
