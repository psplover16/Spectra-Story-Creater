/**
 * Novel 資料模型型別。對應 novel.json schema（D2：純檔案 + 資料夾結構持久化）。
 * 規格：openspec/changes/build-novel-app-v1/specs/novel-data-model/spec.md
 */

export interface WorldviewEntry {
  id: string
  title: string
  content: string
}

export interface FactionSummary {
  factionId: string
  name: string
  currentSituation: string
}

export interface OutlineChapterRef {
  chapterId: string
  title: string
  brief: string
}

export interface OverallOutline {
  summary: string
  chapters: OutlineChapterRef[]
}

export interface Novel {
  id: string
  name: string
  style: string
  worldview: WorldviewEntry[]
  factionsSummary: FactionSummary[]
  overallOutline: OverallOutline
  createdAt: string
  updatedAt: string
}
