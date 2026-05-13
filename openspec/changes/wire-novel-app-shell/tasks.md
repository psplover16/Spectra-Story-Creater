## 1. 基礎服務與持久化

- [ ] 1.1 [P] 落實 `workspaceStateRepository`：在 `src/services/files/workspaceStateRepository.ts` 提供 user-data 目錄下 `workspace-state.json` 的讀寫，含 JSON schema 驗證、UTF-8 無 BOM、missing / corrupt 檔案以「空狀態」fallback；落實 spec「Workspace state persistence across restarts」、對應 design 決策 `D3: Workspace state persistence location and shape`。驗證：`tests/services/files/workspaceStateRepository.test.ts` 至少覆蓋三條路徑（正常讀寫、檔案不存在、schema 不合）皆 assert 預期回傳值。
- [ ] 1.2 [P] 落實 `adapterBootstrap`：在 `src/services/bootstrap/adapterBootstrap.ts` 於啟動期間透過既有 `cliDetection` 偵測 Codex CLI 與 Claude Code，建出對應 adapter 實例並寫入 `aiSettings` store；落實 spec「AI adapter bootstrap before suggestion entry points」、對應 design 決策 `D4: AI adapter bootstrap entry point`。驗證：`tests/services/bootstrap/adapterBootstrap.test.ts` 覆蓋兩 CLI 皆可用 / 只有一個 / 皆不可用三種情境，bootstrap 都成功完成不丟例外，store 內容符合預期。

## 2. orchestrator 元件

- [ ] 2.1 [P] 落實 `CharactersTab`：在 `src/components/tabs/CharactersTab.vue` 提供角色列表 + 新增 / 編輯 / 刪除按鈕，僅呼叫既有 `window.api.character.*` channel（不新增 IPC，落實 spec「Wiring layer adds no new IPC channels or schema changes」），對應 design 決策 `D1: Page-level orchestrator as a new component layer`。驗證：`tests/components/tabs/CharactersTab.test.ts` mount 元件並 mock channel，assert list / create / delete 行為觸發對應 IPC 呼叫，並驗證未呼叫任何不存在的 channel。
- [ ] 2.2 [P] 落實 `ChaptersTab`：在 `src/components/tabs/ChaptersTab.vue` 提供章節列表 + 新增 / 刪除按鈕；點章節列表項時觸發開啟 `ChapterView` 的事件；落實 spec「Chapter editor entry from chapter list」、沿用 design 決策 `D1: Page-level orchestrator as a new component layer`。驗證：`tests/components/tabs/ChaptersTab.test.ts` mount 元件並 assert 點 row 觸發 `open-chapter` event 帶正確 chapter id、重複點同一章節時送出 `focus-chapter` 而非 `open-chapter`（對應 D12 唯一性）。
- [ ] 2.3 [P] 落實 `FactionsTab`：在 `src/components/tabs/FactionsTab.vue` 提供陣營列表 + 編輯器 + members 視圖入口，呼叫既有 `window.api.faction.*` channel；沿用 design 決策 `D1: Page-level orchestrator as a new component layer`。驗證：`tests/components/tabs/FactionsTab.test.ts` mount 元件並 assert CRUD 操作觸發對應 IPC 呼叫、members 視圖切換可見。
- [ ] 2.4 [P] 落實 `WorldviewTab`：在 `src/components/tabs/WorldviewTab.vue` 包既有 `WorldviewEditor` 並透過 `window.api.novel.update` 把世界觀寫回 novel.json；沿用 design 決策 `D1: Page-level orchestrator as a new component layer`。驗證：`tests/components/tabs/WorldviewTab.test.ts` mount 元件並 assert 編輯後送出 `novel.update` 呼叫、payload 含完整 worldview 欄位。
- [ ] 2.5 [P] 落實 `SettingsTab`：在 `src/components/tabs/SettingsTab.vue` 包既有 `SettingsView` 並透過 IPC 寫回 user-level settings；沿用 design 決策 `D1: Page-level orchestrator as a new component layer`。驗證：`tests/components/tabs/SettingsTab.test.ts` mount 元件並 assert 儲存按鈕觸發 settings 寫入 IPC。
- [ ] 2.6 [P] 落實 `CollaborationModeGate`：在 `src/components/tabs/CollaborationModeGate.vue` 顯示三種模式選擇 UI（collaborator / ghost-writer / auto）；對應 design 決策 `D5: CollaborationModeGate as a top-level route`。驗證：`tests/components/tabs/CollaborationModeGate.test.ts` 對三種模式各 assert：選擇後送出 `mode-selected` 事件、payload 含 mode 值、且觸發 `workspaceStateRepository` 寫入。

## 3. 視圖整合

- [ ] 3.1 [P] 改寫 `NovelView`：把五個 tab panel 從匿名 `<slot>` 改為具名 slot（`characters` / `chapters` / `factions` / `worldview` / `settings`），對應 design 決策 `D2: NovelView slot strategy — named slots`。驗證：`tests/views/NovelView.test.ts` 新增 case，以五段 `<template v-slot:name>` 注入測試標記，assert 切換 tab 時對應 slot 內容顯示、非 active tab 內容不顯示。
- [ ] 3.2 [P] 改寫 `ChapterView`：加入「給我建議」與「匯出 HTML」兩個入口按鈕，分別 mount 既有 `SuggestionPanel` 與 `ExportDialog`；落實 spec「Suggestion and export entry points in ChapterView」、對應 design 決策 `D6: ChapterView entry — modal vs. route`。驗證：`tests/views/ChapterView.test.ts` 新增 case，assert 兩個按鈕可見（章節有 outline 後）、點擊後對應元件 mount、suggestion 路徑經過 consistency audit dry-run、export 路徑呼叫 export IPC。
- [ ] 3.3 改寫 `App.vue`：實作啟動路由「`CollaborationModeGate` → `WorkspaceSelectView` → `HomeView` → `NovelView`（內含五個 orchestrator 注入）」；落實 spec「Tab panels populated by orchestrators」與「Startup gate via CollaborationMode selection」，沿用 design 決策 `D5: CollaborationModeGate as a top-level route`。驗證：`tests/integration/app-shell-wiring.test.ts`（於 5.2 建立）以 mounted App 走完五個階段，每個階段 assert 對應元件可見。

## 4. 啟動 wiring 與持久化還原

- [ ] 4.1 在 `src/main.ts` 啟動序列補上 `adapterBootstrap` 與 `workspaceStateRepository.load`，把結果灌入 `workspace` / `aiSettings` store；並訂閱 `workspace` store mutation 在變更時呼叫 `workspaceStateRepository.save`（debounce 500ms），沿用 design 決策 `D3: Workspace state persistence location and shape` 與 `D4: AI adapter bootstrap entry point`。驗證：`tests/stores/workspace.test.ts` 新增 case assert mutation 觸發 persistence write、`tests/integration/app-shell-wiring.test.ts` 重啟還原 scenario 通過。

## 5. 整合驗收測試

- [ ] 5.1 [P] 改寫 `tests/smoke/vampire-novel.test.ts` 走 IPC handlers（取代直接呼叫 services），對應 design 決策 `D7: Tests added in this change` 中的 smoke 改寫項。驗證：smoke test 重跑通過，仍產出 4 個 HTML 檔（`chapter-1-...-epub-like.html` / `chapter-1-...-web-page.html` / `chapter-2-...-epub-like.html` / `chapter-2-...-web-page.html`），每個檔 selfContained: true 且 UTF-8 無 BOM。
- [ ] 5.2 [P] 新增 `tests/integration/app-shell-wiring.test.ts`：mount App.vue 模擬完整 happy path（過 `CollaborationModeGate` → 選 workspace → 列小說 → 開小說 → 切五個 tab 都見內容 → 點章節進編輯器 → 點 suggestion / export 入口），對應 design 決策 `D7: Tests added in this change` 中的新增整合測試項。驗證：每個檢核點對應一個 expect、五個 tab assert 對應 orchestrator 元件被 mount、章節點擊 assert ChapterView 可見、suggestion / export 按鈕 assert 對應元件 mount；測試通過。
