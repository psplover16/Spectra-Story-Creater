/**
 * 計算 slice 對當前 chapter context 的相關性分數。
 *
 * 規格：ai-context（Smart selection by relevance score）。
 */

export interface RelevanceInput {
  keywords: string[]
  /** 角色身上的陣營 id；如 query 章節有 present characters，能與其匹配的角色加分 */
  factionId: string | null
  /** 該 entry/character 是否出現在 chapter.presentCharacters 內 */
  isPresent: boolean
}

export interface RelevanceQuery {
  /** chapter outline + scene 中的關鍵字 */
  chapterKeywords: string[]
  /** chapter.presentCharacters 所屬的陣營集合 */
  presentFactionIds: ReadonlySet<string>
}

export function scoreRelevance(input: RelevanceInput, query: RelevanceQuery): number {
  let score = 0

  // 規則 1：keyword overlap（每個重疊關鍵字 +2）
  for (const kw of input.keywords) {
    if (query.chapterKeywords.includes(kw)) score += 2
  }

  // 規則 2：faction proximity（同陣營 +3）
  if (input.factionId && query.presentFactionIds.has(input.factionId)) score += 3

  // 規則 3：present-characters 加權（直接在場 +5）
  if (input.isPresent) score += 5

  return score
}
