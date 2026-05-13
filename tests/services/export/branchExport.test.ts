import { describe, expect, it } from 'vitest'

import { buildChapterFileName, fileNameForBranch } from '@/services/export/branchExport'
import type { ChapterBranch, Scene } from '@/types/chapter'

const emptyScene: Scene = { location: '', time: '', weather: '', props: [], mood: '' }

describe('branchExport 檔名規則', () => {
  it('主章節：chapter-N-title-format.html', () => {
    expect(
      buildChapterFileName({ chapterIndex: 3, chapterTitle: '誤入禁地', format: 'epub-like' }),
    ).toBe('chapter-3-誤入禁地-epub-like.html')
  })

  it('分支：chapter-N-branch-branchName-format.html', () => {
    const branch: ChapterBranch = {
      id: 'b1',
      index: 3,
      title: '誤入禁地',
      outline: '',
      scene: emptyScene,
      content: '',
      presentCharacters: [],
      createdAt: '',
      updatedAt: '',
      branchOf: 'c3',
      branchedAt: '',
      branchName: 'alt-pov-茅十八',
    }
    expect(fileNameForBranch(branch, 'epub-like')).toBe(
      'chapter-3-branch-alt-pov-茅十八-epub-like.html',
    )
  })
})
