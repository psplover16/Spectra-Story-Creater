import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import { writeUtf8Text } from '@/services/files/encoding'
import { exportsDir } from '@/services/files/paths'
import type { Chapter, ChapterBranch } from '@/types/chapter'

import { buildChapterFileName, fileNameForBranch, type ExportFormat } from './branchExport'
import { checkSelfContained } from './selfContainedChecker'
import { renderEpubLike } from './templates/epubLike'
import { renderWebPage } from './templates/webPage'

export interface HtmlExporterInput {
  novelDir: string
  novelName: string
  chapter: Chapter | ChapterBranch
  format: ExportFormat
  /** web-page 需要的全章節索引 */
  allChapters?: Array<{ id: string; index: number; title: string; exported: boolean }>
  isBranch?: boolean
}

export interface HtmlExporterResult {
  filePath: string
  fileName: string
  selfContained: boolean
}

export async function exportChapter(input: HtmlExporterInput): Promise<HtmlExporterResult> {
  const fileName = input.isBranch
    ? fileNameForBranch(input.chapter as ChapterBranch, input.format)
    : buildChapterFileName({
        chapterIndex: input.chapter.index,
        chapterTitle: input.chapter.title,
        format: input.format,
      })

  const html =
    input.format === 'epub-like'
      ? renderEpubLike({ novelName: input.novelName, chapter: input.chapter })
      : renderWebPage({
          novelName: input.novelName,
          chapter: input.chapter,
          allChapters: input.allChapters ?? [],
        })

  const check = checkSelfContained(html)
  if (!check.isSelfContained) {
    throw new Error(
      `匯出 HTML 含外部資源：${check.violations.join(', ')}（違反 self-contained 約束）`,
    )
  }

  const outDir = exportsDir(input.novelDir)
  await mkdir(outDir, { recursive: true })
  const filePath = path.join(outDir, fileName)
  await writeUtf8Text(filePath, html)
  return { filePath, fileName, selfContained: check.isSelfContained }
}
