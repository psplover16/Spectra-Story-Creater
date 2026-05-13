/**
 * Chapter 資料模型型別。對應 chapters/<chapter-id>.json schema。
 * 規格：novel-data-model（Chapter file structure with branches）、chapter-management。
 */

export interface Scene {
  location: string
  time: string
  weather: string
  props: string[]
  mood: string
}

export interface Chapter {
  id: string
  index: number
  title: string
  outline: string
  scene: Scene
  content: string
  presentCharacters: string[]
  createdAt: string
  updatedAt: string
}

export interface ChapterBranch extends Chapter {
  branchOf: string
  branchedAt: string
  branchName: string
}
