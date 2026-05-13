import { describe, expect, it } from 'vitest'

import { renderEpubLike } from '@/services/export/templates/epubLike'
import type { Chapter, Scene } from '@/types/chapter'

const emptyScene: Scene = { location: '', time: '', weather: '', props: [], mood: '' }

function ch(): Chapter {
  return {
    id: 'c1',
    index: 1,
    title: '揚州街頭',
    outline: '',
    scene: emptyScene,
    content: '一段內文。\n\n第二段。',
    presentCharacters: [],
    createdAt: '',
    updatedAt: '',
  }
}

describe('epubLike template', () => {
  it('輸出含內嵌 <style>，不含 <link rel="stylesheet">', () => {
    const html = renderEpubLike({ novelName: '鹿鼎記', chapter: ch() })
    expect(html).toContain('<style>')
    expect(html).not.toMatch(/<link[^>]+rel=["']stylesheet["']/i)
  })

  it('snapshot 對 fixture 章節穩定', () => {
    const html = renderEpubLike({ novelName: '鹿鼎記', chapter: ch() })
    expect(html).toMatchSnapshot()
  })
})
