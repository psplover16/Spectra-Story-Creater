import type { ChapterBranch } from '@/types/chapter'

export type ExportFormat = 'epub-like' | 'web-page'

export function buildChapterFileName(args: {
  chapterIndex: number
  chapterTitle: string
  format: ExportFormat
  branch?: { name: string }
}): string {
  if (args.branch) {
    return `chapter-${args.chapterIndex}-branch-${args.branch.name}-${args.format}.html`
  }
  return `chapter-${args.chapterIndex}-${args.chapterTitle}-${args.format}.html`
}

export function fileNameForBranch(branch: ChapterBranch, format: ExportFormat): string {
  return buildChapterFileName({
    chapterIndex: branch.index,
    chapterTitle: branch.title,
    format,
    branch: { name: branch.branchName },
  })
}
