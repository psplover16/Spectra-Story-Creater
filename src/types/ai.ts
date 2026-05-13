/**
 * AI 核心介面型別，對應 design.md「介面 / 資料形狀（Interface / Data Shape）」段。
 * 規格：ai-adapters、ai-switching、ai-context。
 */

import type { Character } from './character'
import type { Chapter, Scene } from './chapter'
import type { FactionSummary, OutlineChapterRef, WorldviewEntry } from './novel'

export type AiSource = 'codex' | 'claude'

export type AiRole =
  | 'plot-driver'
  | 'character-voice'
  | 'worldbuilding'
  | 'character-design'
  | 'outline-assistant'
  | 'consistency-auditor'

export interface AiInvokeInput {
  context: AssembledContext
  prompt: string
  role: AiRole
}

export interface AiInvokeResult {
  text: string
  tokensUsed?: number
  source: AiSource
  durationMs: number
}

export interface AiAdapter {
  readonly source: AiSource
  invoke(input: AiInvokeInput): Promise<AiInvokeResult>
}

export interface ResolveQuery {
  role: AiRole
  characterId?: string
  paragraphId?: string
}

export type HitLayer = 'paragraph' | 'role' | 'character' | 'global'

export interface ResolveResult {
  adapter: AiAdapter
  hitLayer: HitLayer
  reason: string
}

export interface AiResolver {
  resolve(query: ResolveQuery): ResolveResult
}

export interface WorldviewSlice extends WorldviewEntry {
  score: number
}

export interface CharacterSlice {
  characterId: string
  name: string
  personality: string
  abilities: string[]
  factionId: string | null
  score: number
}

export interface PlotSlice {
  summary: string
  chapters: OutlineChapterRef[]
}

export interface ChapterOutlineSlice {
  chapterId: string
  outline: string
}

export interface ChapterSceneSlice {
  chapterId: string
  scene: Scene
}

export interface AssembledContext {
  worldview: WorldviewSlice[]
  characters: CharacterSlice[]
  overallPlot: PlotSlice
  presentCharacters: CharacterSlice[]
  chapterOutline: ChapterOutlineSlice
  chapterScene: ChapterSceneSlice
}

export interface ContextQuery {
  novelId: string
  chapterId: string
  paragraphId?: string
  tokenBudget: number
}

export interface ContextAssembler {
  assemble(query: ContextQuery): Promise<AssembledContext>
}

export interface FactionSummarySlice extends FactionSummary {
  score: number
}

export type AdapterCharacterRef = Pick<Character, 'id' | 'name'>

export interface AdapterChapterRef extends Pick<Chapter, 'id' | 'index' | 'title'> {
  outlineExcerpt: string
}
