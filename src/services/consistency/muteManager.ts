import type { AuditCategory, MuteWindow } from '@/types/audit'

export function createMuteWindow(
  category: AuditCategory,
  startChapterIndex: number,
  span: 1 | 3 | 5,
): MuteWindow {
  return {
    category,
    startChapterIndex,
    endChapterIndex: startChapterIndex + span - 1,
  }
}

export function isWithinMute(
  windows: MuteWindow[],
  category: AuditCategory,
  chapterIndex: number,
): boolean {
  return windows.some(
    (w) =>
      w.category === category &&
      chapterIndex >= w.startChapterIndex &&
      chapterIndex <= w.endChapterIndex,
  )
}

export function pruneExpiredMutes(
  windows: MuteWindow[],
  currentChapterIndex: number,
): MuteWindow[] {
  return windows.filter((w) => w.endChapterIndex >= currentChapterIndex)
}
