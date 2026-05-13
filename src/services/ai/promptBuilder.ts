import { ROLE_LABELS } from './roles'

import type { AiRole, AssembledContext } from '@/types/ai'

const SEPARATOR = '\n\n---\n\n'

const ROLE_INSTRUCTIONS: Record<AiRole, string> = {
  'plot-driver': '請以「推進劇情」為核心給出具體下一步行動建議，避免泛泛之談。',
  'character-voice': '請扮演指定角色，按其性格與背景產生對話與內心戲。',
  worldbuilding: '請僅補強世界觀與規則，不直接寫劇情。',
  'character-design': '請對角色補上可採用的個性、能力、外觀建議，提供 2-3 種選項。',
  'outline-assistant': '請就章節大綱提出修訂或下一章 hook，不寫完整內文。',
  'consistency-auditor': '請僅輸出潛在不一致點與其依據，不修改任何設定。',
}

export interface PromptBuilderInput {
  context: AssembledContext
  role: AiRole
  userPrompt: string
}

export function buildPrompt(input: PromptBuilderInput): string {
  const { context, role, userPrompt } = input
  const sections: string[] = []
  sections.push(
    `# 行為（Behavior）\n你正在扮演「${ROLE_LABELS[role]}」職能。\n${ROLE_INSTRUCTIONS[role]}`,
  )
  sections.push(
    `# 1. 世界觀\n${context.worldview.map((w) => `- ${w.title}：${w.content}`).join('\n')}`,
  )
  sections.push(
    `# 2. 角色（依相關性排序）\n${context.characters
      .map((c) => `- ${c.name}（${c.personality}），能力：${c.abilities.join('、')}`)
      .join('\n')}`,
  )
  sections.push(
    `# 3. 整體劇情\n${context.overallPlot.summary}\n章節索引：${context.overallPlot.chapters
      .map((c) => `${c.title}（${c.brief}）`)
      .join('；')}`,
  )
  sections.push(
    `# 4. 本章在場角色\n${context.presentCharacters.map((c) => `- ${c.name}`).join('\n')}`,
  )
  sections.push(`# 5. 章節大綱\n${context.chapterOutline.outline}`)
  sections.push(
    `# 6. 章節場景\n地點：${context.chapterScene.scene.location}\n時間：${context.chapterScene.scene.time}\n氛圍：${context.chapterScene.scene.mood}`,
  )
  sections.push(`# 使用者提示\n${userPrompt}`)
  return sections.join(SEPARATOR)
}
