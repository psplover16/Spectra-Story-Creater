## Why

新使用者想寫小說時，常因「腦中有故事但沒有寫過、不知如何下筆」而停在原地。市面上的 AI 寫作工具偏向「直接生文長度」，而非協助使用者整理素材、追蹤角色與陣營狀態、引導劇情發展、在不一致出現時與使用者協商修正。本專案的核心價值是「狀態管理 + 提問引導 + 一致性檢查」，並以本機 AI CLI 為唯一後端，保證所有資料留在本機、永不外傳。

## What Changes

- 新建以 Vue 3 + TypeScript + Tailwind CSS 為前端、Electron 為桌面殼的桌面應用程式；Electron 是本提案引入的主要框架，理由是 Node.js main process 才能透過 child_process 呼叫本機 Codex CLI 與 Claude Code
- 採 Vitest 並遵守 TDD：所有新增 service / adapter 必先有單元測試
- 採純檔案 + 資料夾結構持久化（不引入 SQLite 或 IndexedDB），工作目錄下可同時擺多本小說，一次只啟用一本，啟用書內可開多個章節分頁（一章一頁）
- 新增 11 個 capability 的規格與實作（見 Capabilities 區段）
- 引入 AiAdapter 抽象封裝 Codex CLI 與 Claude Code 子行程後端，並提供 4 層切換 resolver（段落覆寫 → 職能綁定 → 角色綁定 → 全域預設）
- 提供 6 個獨立可綁定 CLI 的 AI 職能：plot-driver、character-voice、worldbuilding、character-design、outline-assistant、consistency-auditor
- 引入 Context Assembler 智慧組裝 6 層上下文（世界觀 / 角色 / 整體劇情 / 本章可能人物 / 章節大綱 / 章節場景）
- 主動性引擎採按鈕被動觸發 + 強建議內容，三層（全域 / 小說 / 角色）獨立設定，未設定者向上 fallback
- 自動模式採啟動詢問初始模式 + 後續依互動長度與頻率動態微調（混合策略）
- 一致性檢查 5 類全納入：OOC、能力憑空出現、關係矛盾、世界觀矛盾、時間線錯亂；採回應前 dry-run 偵測、發現不一致跳出與使用者協商，不自動修改
- 角色性格演化採「AI 偵測後建議使用者更新」，不自動寫回
- 章節 HTML 匯出支援 epub-like 與網頁化兩種格式，匯出時由使用者選擇
- 章節提供「另存為分支」功能保留多版本作為比較參考；同一章節一次仍僅一個主分頁編輯
- CLI 不可用採「跳提示讓使用者確認後手動切換」，不自動 fallback

## Non-Goals (optional)

- 不支援雲端同步、多人協作、線上備份等任何需要外送資料的功能
- 不直接呼叫 Claude / OpenAI / 任何第三方 LLM HTTP API
- 不採 SQLite、IndexedDB 等資料庫，僅用純檔案 + 資料夾
- 不支援多本小說同時啟用、不支援多視窗
- 不支援同一章節多主分頁同時編輯（避免狀態競態）；多版本以「另存為分支」表達
- 不支援多章合併匯出（留待 v2）
- 不支援 CLI 失敗時自動切換 fallback
- 不支援角色性格自動寫回，僅 AI 偵測後建議
- 不規劃 UI i18n，僅支援繁體中文

## Capabilities

### New Capabilities

- `novel-data-model`：小說、角色、章節、陣營、世界觀的 JSON schema 與檔案 / 資料夾結構定義
- `workspace-management`：多本小說工作區與切換機制、啟用書內章節分頁、另存為分支
- `character-management`：角色 CRUD UI 與檔案存取，含姓名、性格、能力、外觀、陣營、社會地位等欄位
- `chapter-management`：章節大綱、場景設定、章節內容的 CRUD UI 與檔案存取
- `ai-adapters`：AiAdapter 抽象、CodexAdapter 與 ClaudeAdapter 子行程實作、CLI 不可用提示流程
- `ai-context`：Context Assembler 6 層上下文智慧組裝邏輯
- `ai-switching`：4 層 resolver（段落 → 職能 → 角色 → 全域）與 6 職能綁定機制
- `consistency-audit`：5 類一致性檢查 dry-run 與使用者協商流程
- `character-evolution`：AI 偵測角色性格演化並建議使用者更新（不自動寫回）
- `faction-tracking`：陣營狀況追蹤與隨劇情演進的更新
- `chapter-export`：單章 HTML 匯出，含 epub-like 與網頁化兩種格式

### Modified Capabilities

(none — 本專案為全新建立，無既有 spec)

## Impact

- Affected specs：上述 11 個 capability 皆為新增
- Affected code（本專案為全新建立，皆為 New，後續 design.md 與 tasks.md 會列出完整檔案清單）：
  - New：package.json
  - New：vite.config.ts
  - New：tsconfig.json
  - New：tsconfig.node.json
  - New：tailwind.config.ts
  - New：postcss.config.cjs
  - New：.eslintrc.cjs
  - New：.prettierrc
  - New：electron-builder.json
  - New：index.html
  - New：electron/main.ts
  - New：electron/preload.ts
  - New：electron/tsconfig.json
  - New：src/main.ts
  - New：src/App.vue
  - New：src/views/HomeView.vue
  - New：src/views/NovelView.vue
  - New：src/views/ChapterView.vue
  - New：src/components/character/CharacterList.vue
  - New：src/components/character/CharacterEditor.vue
  - New：src/components/chapter/ChapterEditor.vue
  - New：src/components/chapter/ChapterTabs.vue
  - New：src/components/ai/SuggestionPanel.vue
  - New：src/components/consistency/ConflictDialog.vue
  - New：src/stores/workspace.ts
  - New：src/stores/aiSettings.ts
  - New：src/services/files/novelRepository.ts
  - New：src/services/files/characterRepository.ts
  - New：src/services/files/chapterRepository.ts
  - New：src/services/ai/aiAdapter.ts
  - New：src/services/ai/codexAdapter.ts
  - New：src/services/ai/claudeAdapter.ts
  - New：src/services/ai/aiResolver.ts
  - New：src/services/ai/contextAssembler.ts
  - New：src/services/consistency/auditor.ts
  - New：src/services/evolution/personalityDetector.ts
  - New：src/services/export/htmlExporter.ts
  - New：src/services/export/templates/epubLike.ts
  - New：src/services/export/templates/webPage.ts
  - New：src/types/novel.ts
  - New：src/types/character.ts
  - New：src/types/chapter.ts
  - New：src/types/ai.ts
  - New：tests/services/ai/aiAdapter.test.ts
  - New：tests/services/ai/aiResolver.test.ts
  - New：tests/services/ai/contextAssembler.test.ts
  - New：tests/services/files/novelRepository.test.ts
  - New：tests/services/consistency/auditor.test.ts
  - New：tests/services/export/htmlExporter.test.ts
