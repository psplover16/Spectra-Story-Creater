# Export Formats

對應 design.md D11：HTML 匯出支援 epub-like 與網頁化雙格式。

## epub-like

- 單檔內嵌 CSS（無外部 link / stylesheet）
- 簡潔排版、首行縮排、列印 friendly
- 適合：傳給朋友透過 ePub reader 開、列印、寄信附件
- 規則：禁止 `<link rel="stylesheet">` 與所有 `https://` 外部資源

## web-page

- 含側欄章節導覽（指向同目錄相對路徑）
- 未匯出章節顯示「尚未匯出」灰字（不可點）
- 自然瀏覽器排版，適合：丟到網頁站、本機瀏覽
- 規則：所有資源 self-contained，連結都是 `chapter-N-title-web-page.html`

## 檔名規則

- 主章節：`chapter-<index>-<title>-<format>.html`
- 分支：`chapter-<index>-branch-<branchName>-<format>.html`

範例：

- `chapter-3-誤入禁地-epub-like.html`
- `chapter-3-branch-alt-pov-茅十八-web-page.html`

## 匯出目錄

匯出檔位於 `<workspace>/<novel>/exports/`。使用者可直接打開該目錄查閱、複製、分享。

## 使用者流程

1. 在 ChapterEditor 旁的「匯出」按鈕打開 ExportDialog
2. 選擇格式（epub-like / web-page）
3. 可選分支（若該章有分支）
4. 若該章有未儲存編輯 → ExportDialog 跳「先儲存後再匯出」提示
5. 確認後寫入 exports/ 目錄
