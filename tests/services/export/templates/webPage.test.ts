import { describe, expect, it } from 'vitest'

import { renderWebPage } from '@/services/export/templates/webPage'
import type { Chapter, Scene } from '@/types/chapter'

const emptyScene: Scene = { location: '', time: '', weather: '', props: [], mood: '' }

function ch(): Chapter {
  return {
    id: 'c1',
    index: 1,
    title: '揚州街頭',
    outline: '',
    scene: emptyScene,
    content: '段一。\n\n段二。',
    presentCharacters: [],
    createdAt: '',
    updatedAt: '',
  }
}

describe('webPage template', () => {
  it('側欄連結指向同目錄；未匯出顯示「尚未匯出」', () => {
    const html = renderWebPage({
      novelName: '鹿鼎記',
      chapter: ch(),
      allChapters: [
        { id: 'c1', index: 1, title: '揚州街頭', exported: true },
        { id: 'c2', index: 2, title: '京城風雲', exported: false },
      ],
    })
    expect(html).toContain('chapter-1-揚州街頭-web-page.html')
    expect(html).toContain('尚未匯出')
    expect(html).toContain('<aside>')
  })

  it('snapshot 穩定', () => {
    const html = renderWebPage({
      novelName: '鹿鼎記',
      chapter: ch(),
      allChapters: [{ id: 'c1', index: 1, title: '揚州街頭', exported: true }],
    })
    expect(html).toMatchSnapshot()
  })
})
