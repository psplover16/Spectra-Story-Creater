/**
 * 自動模式：依使用者輸入長度與頻率動態微調強度。
 *
 * 規格：D7 協作模式啟動時自選 + 自動模式採互動長度頻率混合判斷。
 */

export type AutoModeDecision = 'companion' | 'ghostwriter'

export interface AutoModeInput {
  /** 使用者最近一次輸入字數 */
  lastInputLength: number
  /** 過去 60 秒互動次數 */
  recentInteractionCount: number
}

/**
 * - 長 input（>= 80 字）→ 偏代筆（使用者本來就要長段，把 AI 當補充工具）
 * - 短 input（< 30 字）→ 偏陪寫（你提示一句，我陪你聊細節）
 * - 短 input + 高頻（>= 5 次 / 分鐘）→ 維持陪寫
 * - 其餘 → companion 為預設
 */
export function decideAutoMode(input: AutoModeInput): AutoModeDecision {
  if (input.lastInputLength >= 80) return 'ghostwriter'
  if (input.lastInputLength < 30 && input.recentInteractionCount >= 5) return 'companion'
  if (input.lastInputLength < 30) return 'companion'
  return 'companion'
}
