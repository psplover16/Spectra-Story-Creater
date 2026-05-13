import path from 'node:path'

export function novelDir(workspaceRoot: string, novelName: string): string {
  return path.join(workspaceRoot, novelName)
}

export function novelMetaFile(novelDir: string): string {
  return path.join(novelDir, 'novel.json')
}

export function charactersDir(novelDir: string): string {
  return path.join(novelDir, 'characters')
}

export function characterFile(novelDir: string, characterId: string): string {
  return path.join(charactersDir(novelDir), `${characterId}.json`)
}

export function chaptersDir(novelDir: string): string {
  return path.join(novelDir, 'chapters')
}

export function chapterFile(novelDir: string, chapterId: string): string {
  return path.join(chaptersDir(novelDir), `${chapterId}.json`)
}

export function chapterBranchesDir(novelDir: string, chapterId: string): string {
  return path.join(chaptersDir(novelDir), `${chapterId}.branches`)
}

export function chapterBranchFile(novelDir: string, chapterId: string, branchId: string): string {
  return path.join(chapterBranchesDir(novelDir, chapterId), `${branchId}.json`)
}

export function factionsDir(novelDir: string): string {
  return path.join(novelDir, 'factions')
}

export function factionFile(novelDir: string, factionId: string): string {
  return path.join(factionsDir(novelDir), `${factionId}.json`)
}

export function factionHistoryFile(novelDir: string): string {
  return path.join(factionsDir(novelDir), 'history.jsonl')
}

export function exportsDir(novelDir: string): string {
  return path.join(novelDir, 'exports')
}
