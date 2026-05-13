import type { Chapter } from '@/types/chapter'

export interface WebPageInput {
  novelName: string
  chapter: Chapter
  /** 全本章節索引（含尚未匯出的章節，未匯出顯示「尚未匯出」） */
  allChapters: Array<{ id: string; index: number; title: string; exported: boolean }>
}

const STYLE = `
  body { font-family: "PingFang TC", sans-serif; margin: 0; display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; color: #1f2937; }
  aside { background: #f3f4f6; padding: 1rem; border-right: 1px solid #e5e7eb; }
  aside h2 { font-size: 1rem; margin-top: 0; }
  aside ul { list-style: none; padding: 0; margin: 0; }
  aside li { margin: 0.3rem 0; }
  aside a { color: #1d4ed8; text-decoration: none; }
  aside .not-exported { color: #9ca3af; }
  main { padding: 2rem; max-width: 720px; line-height: 1.8; }
  h1 { font-size: 1.5rem; }
  p { text-indent: 2em; margin: 0.6em 0; }
`

function escape(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function chapterFileName(index: number, title: string): string {
  return `chapter-${index}-${title}-web-page.html`
}

export function renderWebPage(input: WebPageInput): string {
  const links = input.allChapters
    .map((c) => {
      if (c.exported) {
        return `<li><a href="${chapterFileName(c.index, c.title)}">${c.index}. ${escape(c.title)}</a></li>`
      }
      return `<li class="not-exported">${c.index}. ${escape(c.title)}（尚未匯出）</li>`
    })
    .join('\n')

  const paragraphs = input.chapter.content
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0)
    .map((p) => `<p>${escape(p)}</p>`)
    .join('\n')

  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<title>${escape(input.novelName)} — ${escape(input.chapter.title)}</title>
<style>${STYLE}</style>
</head>
<body>
<aside>
  <h2>${escape(input.novelName)}</h2>
  <ul>
${links}
  </ul>
</aside>
<main>
  <h1>${escape(input.chapter.title)}</h1>
${paragraphs}
</main>
</body>
</html>`
}
