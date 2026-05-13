import type { Chapter } from '@/types/chapter'

const STYLE = `
  body { font-family: "PingFang TC", "Microsoft JhengHei", serif; line-height: 1.8; max-width: 720px; margin: 2rem auto; color: #1f2937; }
  h1 { font-size: 1.5rem; }
  p { text-indent: 2em; margin: 0.6em 0; }
  hr { border: none; border-top: 1px dashed #d1d5db; }
  @page { size: A4; margin: 2cm; }
`

function escape(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

export interface EpubLikeInput {
  novelName: string
  chapter: Chapter
}

export function renderEpubLike(input: EpubLikeInput): string {
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
<h1>${escape(input.chapter.title)}</h1>
<hr />
${paragraphs}
</body>
</html>`
}
