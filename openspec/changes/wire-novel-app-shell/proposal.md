## Why

`build-novel-app-v1` 完成後，服務層、主行程 IPC handlers、匯出 pipeline 全綠（249 個 vitest 通過，吸血鬼短篇 smoke test 直接呼叫 services / repositories / exporter 跑完 31 ms、4 個 HTML 全部 selfContained、UTF-8 無 BOM），但渲染端缺整合層（page-level orchestrator）。使用者用 `pnpm electron:dev` 啟動 App 後，能選 workspace、看到小說列表、進入 NovelView，但五個 tab 的 panel 都是空 `<slot>`，無法新增 / 編輯角色、章節、陣營、世界觀，也無法觸發「給我建議」或匯出 HTML。

問題出在 `build-novel-app-v1` 的 tasks 拆得「每個元件 + 一個單元測試」很細，但沒有任何一個 task 負責「在 NovelView 各 slot 接入整合元件」；`ChapterView` 整合元件雖已存在，也無人把它接到 NovelView 的 chapters slot 或章節入口。spec 行為（如「outline required before content」）已在元件層落實，缺的是把元件們組裝成可操作畫面的 wiring 層。

`tests/e2e/golden-path.test.ts` 直接呼叫 services 驗證，沒驗 GUI 是否真的能驅動，所以此缺口未被現有自動化抓出。

## What Changes

- 新增 6 個 page-level orchestrator 元件（純整合層），各自包含「列表 + 新增 + 編輯 + 刪除 + 串 IPC」：`CharactersTab`、`ChaptersTab`、`FactionsTab`、`WorldviewTab`、`SettingsTab`、`CollaborationModeGate`
- 改寫 `src/App.vue`：把 6 個 orchestrator 塞入 NovelView 對應 slot，並在啟動時先過 CollaborationModeGate 再進 WorkspaceSelectView
- 改寫 `src/views/NovelView.vue`：把五個 tab 的 `<slot>` 改為具名 slot 並接受 orchestrator 注入
- 在 `src/views/ChapterView.vue` 補 SuggestionPanel 與 ExportDialog 觸發入口（既有元件已寫好，缺 mount 點與按鈕）
- workspace store 持久化到 user-level config 檔（位於 OS 標準 user-data 目錄），重啟 App 記得上次 workspace 路徑與 active novel；啟動時呼叫 `workspace:detectActive` 嘗試還原
- App 啟動時建出 codex / claude adapter 實例並注入 `useSuggestionRequest`（目前 hook 簽章已預期注入點，缺啟動 wiring）
- ChaptersTab 點章節列表項時開啟 ChapterView（章節編輯入口）
- 既有 smoke test `tests/smoke/vampire-novel.test.ts` 改寫為走 IPC handlers（取代直接呼叫 services），保留為 happy-path 回歸測試
- 新增整合測試 `tests/integration/app-shell-wiring.test.ts`：以 mounted App 驗證五個 tab panel 都不再是空 slot、章節點擊真的開出編輯器、「給我建議」按鈕可觸發
- 新增單一 capability `app-shell`，捕捉 wiring 層 user-observable behaviors（mounted tabs、collaboration mode gate、workspace 持久化、adapter bootstrap、章節編輯 / 匯出入口、AI 建議按鈕入口）

## Non-Goals

- 不重做任何已存在的單元元件：CharacterList / CharacterEditor / ChapterList / ChapterEditor / SceneEditor / ParticipantPicker / FactionList / FactionEditor / FactionMembersView / WorldviewEditor / SettingsView / SuggestionPanel / ChatPanel / DocumentEditPanel / ExportDialog 等均已過測，整合層只組裝、不重寫
- 不改 IPC schema、不調 preload `contextBridge` 介面：preload 與 handlers 介面對齊既有設計，本 change 僅在渲染端呼叫端補入口
- 不修改既有 11 個 capability 的 requirements：character-management / chapter-management / faction-tracking / workspace-management / ai-adapters / ai-context / ai-switching / consistency-audit / character-evolution / chapter-export / novel-data-model 皆不動；本 change 只新增獨立 capability `app-shell` 描述 wiring 層
- 不加 e2e GUI 自動化（Playwright + Electron）：留待後續 change，本次以整合測試（mounted component + IPC mock）驗證 wiring
- 不實作 CollaborationMode「自動模式」的實際 mode 切換邏輯：本 change 只負責 gate 入口（讓 D7 啟動詢問成立），模式生效時機（依互動長度動態微調）仍歸後續 change
- 不新增「demo workspace 一鍵生成吸血鬼短篇」按鈕：留待後續 change
- 不調整既有單元元件的 props / events 介面：若 orchestrator 需額外資料，由 orchestrator 自行透過 IPC 取得後傳入

## Alternatives Considered

- **把每個 Tab 整合放在 NovelView 本體裡（不抽 orchestrator 元件）**：拒絕。NovelView 將被迫處理 5 個領域的 CRUD 狀態、IPC 呼叫、modal 開關，違反單一職責；測試也只能整檔 mount，難以針對單一 tab 寫整合測試。
- **延後到「demo workspace」按鈕一起做**：拒絕。GUI 無法操作是阻塞使用者驗收 D7/D8/D11 的硬條件，不能掛在「nice to have」之後。
- **以 ChaptersTab 替代 ChapterView modal、放棄章節分頁**：拒絕。`build-novel-app-v1` D12 已定「章節分頁，一章一頁、一頁一章」，分頁體驗仍需保留 ChapterView 路徑。
- **修改既有 11 個 capability 的 requirements 來描述 wiring**：拒絕。會把 wiring 散落到所有 spec，且許多 wiring 行為（如啟動 gate、workspace 持久化）跨多個 capability；集中於單一 `app-shell` capability 更內聚。

## Capabilities

### New Capabilities

- `app-shell`：渲染端整合層的可觀察行為。涵蓋 NovelView 各 tab panel 須由對應 orchestrator 元件填入、App 啟動時的 CollaborationMode gate、workspace 路徑與 active novel 的跨次啟動還原、AI adapter 在 App 啟動完成前的 bootstrap、ChapterView 的「給我建議」與「匯出 HTML」入口、章節點擊開啟編輯器的入口

### Modified Capabilities

(none — 既有 11 個 capability spec 的 requirements 不變；本 change 僅新增 `app-shell` capability 描述 wiring 層的 user-observable behaviors)

## Impact

- Affected specs：新增 `app-shell`（位於 `openspec/changes/wire-novel-app-shell/specs/app-shell/spec.md`，archive 後將移入 `openspec/specs/app-shell/spec.md`）
- Affected code：
  - New：
    - src/components/tabs/CharactersTab.vue
    - src/components/tabs/ChaptersTab.vue
    - src/components/tabs/FactionsTab.vue
    - src/components/tabs/WorldviewTab.vue
    - src/components/tabs/SettingsTab.vue
    - src/components/tabs/CollaborationModeGate.vue
    - src/services/bootstrap/adapterBootstrap.ts
    - src/services/files/workspaceStateRepository.ts
    - tests/components/tabs/CharactersTab.test.ts
    - tests/components/tabs/ChaptersTab.test.ts
    - tests/components/tabs/FactionsTab.test.ts
    - tests/components/tabs/WorldviewTab.test.ts
    - tests/components/tabs/SettingsTab.test.ts
    - tests/components/tabs/CollaborationModeGate.test.ts
    - tests/services/bootstrap/adapterBootstrap.test.ts
    - tests/services/files/workspaceStateRepository.test.ts
    - tests/integration/app-shell-wiring.test.ts
  - Modified：
    - src/App.vue
    - src/views/NovelView.vue
    - src/views/ChapterView.vue
    - src/stores/workspace.ts
    - src/main.ts
    - electron/ipc/workspaceHandlers.ts
    - electron/preload.ts
    - tests/views/NovelView.test.ts
    - tests/views/ChapterView.test.ts
    - tests/stores/workspace.test.ts
    - tests/smoke/vampire-novel.test.ts
  - Removed：(none)
