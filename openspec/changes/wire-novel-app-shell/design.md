## Context

`build-novel-app-v1` 完成後，全部 11 個 capability 的服務層與資料層皆已落實並過測：

- `src/services/`（48 個檔案）涵蓋 file repositories、AI adapters、context assembler、consistency auditor、HTML exporter
- `electron/ipc/`（7 個 handlers）橋接渲染端 `window.api.*` 與服務層
- `tests/`（135 個檔案）涵蓋 components 單元測試、services 契約測試、IPC 行為測試、integration、e2e
- 一個臨時 smoke test 直接呼叫 services 跑完吸血鬼短篇全流程（建小說 → 角色 + 關係 → 陣營 + currentSituation → 章節含 scene / content → 匯出 4 個 HTML），31 ms 通過

但渲染端缺一層「page-level orchestrator」：

- `NovelView` 內五個 tab 的 panel 寫成 `<slot>`，App.vue 沒有把任何元件塞進去
- `ChapterView` 整合元件齊備但沒人從 NovelView 連到它
- workspace store 為純記憶體，重啟 App 路徑消失
- `useAiInvoker` / `useSuggestionRequest` 期望 adapter 注入，但 App 啟動沒有 bootstrap

`tests/e2e/golden-path.test.ts` 直接呼叫 services 驗證，沒有 mount 任何 Vue 元件，所以這個缺口未被自動化測試抓出。

## Goals / Non-Goals

**Goals:**

- 在不改 IPC schema、不重做既有元件、不修改既有 11 個 capability requirements 的前提下，補齊渲染端整合層，讓使用者從 GUI 走完吸血鬼短篇全流程（選 mode → 選 workspace → 列小說 → 開小說 → 五個 tab 都可用 → 點章節進編輯器 → 給我建議 → 匯出）
- 引入 page-level orchestrator 為穩定 pattern（後續新功能可沿用）
- 把整合層缺口落實為自動化測試（mounted App + IPC mock），避免類似缺口再次溜過

**Non-Goals:**

- 不重做任何既有元件，整合層只組裝
- 不擴 IPC channel、不調 preload 介面
- 不擴或修改既有 11 個 capability 的 requirements
- 不導入 Playwright + Electron e2e
- 不實作 CollaborationMode 自動模式的動態 mode 切換邏輯
- 不新增 demo workspace 一鍵生成功能

## Decisions

### D1: Page-level orchestrator as a new component layer

- **選擇**：在 `src/components/tabs/` 新建一個與 `src/components/<domain>/` 平行的層級，每個 Tab 一個 orchestrator（`CharactersTab.vue` 等），負責「列表 + 編輯器 + 新增 / 刪除按鈕 + 串 IPC」
- **理由**：NovelView 維持單一職責（tab 切換 + slot 注入），各領域 CRUD 邏輯內聚在自己的 orchestrator，方便針對單一 tab 寫整合測試
- **替代方案**：把整合放在 NovelView 內 → 拒絕（NovelView 將處理 5 個領域，無法分檔測試）
- **替代方案**：每個領域一個 view（不抽 tab）→ 拒絕（D12 已定 NovelView 為五分頁主畫面）
- **介面約定**：orchestrator 元件 props 只接受「目前 active novel id」與「全域 store / adapter 注入」，不接受領域資料本身；資料一律由 orchestrator 自身透過 `window.api.*` 取得

### D2: NovelView slot strategy — named slots

- **選擇**：把 NovelView 既有的 `<slot>` 改為具名 slot（`characters`、`chapters`、`factions`、`worldview`、`settings`），App.vue 透過 `<template v-slot:characters>...</template>` 等語法注入對應 orchestrator
- **理由**：保留 NovelView 對排版、tab header、active-tab 視覺狀態的控制，整合層僅負責填內容；切換 tab 時 Vue 自然處理 mount / unmount
- **替代方案**：NovelView 直接 import 各 orchestrator → 拒絕（NovelView 將被迫依賴所有領域元件，違反 NovelView 的「容器」職責）

### D3: Workspace state persistence location and shape

- **選擇**：persistence 落於 OS 標準 user-data 目錄（Electron `app.getPath('userData')`）下的 `workspace-state.json`，schema：`{ workspacePath: string, activeNovelId: string | null, collaborationMode: "collaborator" | "ghost-writer" | "auto" | null, lastUpdated: ISO8601 string }`，UTF-8 無 BOM
- **理由**：與 workspace 內容（位於使用者 workspace 路徑）分離，避免使用者搬移或刪除 workspace 資料夾時遺失「我上次開哪本書」的記憶；不和 workspace 內容混雜在一起也讓備份策略更乾淨
- **替代方案**：寫在 workspace 根目錄 → 拒絕（換 workspace 就失憶；多個 workspace 之間衝突）
- **替代方案**：寫在 Electron localStorage / IndexedDB → 拒絕（D2 spec 已禁 IndexedDB）
- **新檔**：`src/services/files/workspaceStateRepository.ts`（讀寫 + JSON schema 驗證 + UTF-8 強制）
- **新 IPC channel**：無；既有 `workspace:detectActive` handler 已預留讀取角色，本 change 補實際存取邏輯而非定義新 channel

### D4: AI adapter bootstrap entry point

- **選擇**：新增 `src/services/bootstrap/adapterBootstrap.ts`，由 `src/main.ts` 在 Pinia 安裝後、App mount 前呼叫；bootstrap 內部用 `cliDetection` 服務探測 Codex CLI 與 Claude Code 是否存在，建出對應 adapter 實例，存入 `aiSettings` store
- **理由**：把「啟動時建 adapter」集中於一處，`useSuggestionRequest` / `useAiInvoker` 從 store 拿已建好的 adapter，不需在每次 click 時重新探測 / 構建
- **失敗模式**：若兩個 CLI 皆不可用，bootstrap 仍須成功完成（不丟例外）；suggestion 入口被觸發時走既有 CLI-unavailable dialog（`ai-adapters` capability 已定義）
- **替代方案**：在 `useSuggestionRequest` 內 lazy 探測 → 拒絕（每次 click 都做 cliDetection 增加延遲；也讓 hook 與 startup lifecycle 耦合）

### D5: CollaborationModeGate as a top-level route

- **選擇**：App.vue 多一層 route：`mode-gate → workspace-select → home → novel → chapter`；mode-gate 只在 `workspaceState.collaborationMode` 為 null 時顯示
- **理由**：D7 spec 明定「啟動時詢問模式」，gate 必須在 workspace pick 之前；獨立 view 而非 modal 讓使用者無法跳過
- **替代方案**：第一次選 workspace 時用 modal 問 → 拒絕（modal 容易被誤關；不符 D7「first-class 啟動步驟」語意）

### D6: ChapterView entry — modal vs. route

- **選擇**：ChaptersTab 點章節列表項時，使用既有的 `ChapterTabs` 元件作為頂端章節分頁（每章一頁），ChapterView 為單章節編輯器內容；不另開 modal
- **理由**：D12 spec「章節分頁，一章一頁、一頁一章」已定，分頁體驗保留；modal 會把章節編輯獨立於主流程，違反「章節分頁就是當前畫面」的設計
- **重複開啟**：點已開過的章節時，將焦點轉移到既有分頁，不另建分頁（沿用 D12 規則）
- **替代方案**：用 router 推 `/novel/:id/chapter/:cid` → 拒絕（本 App 為 Electron 單視窗，目前未引入 vue-router；引入 router 屬於擴架構，落到本 change 範圍外）

### D7: Tests added in this change

- **每個 orchestrator 元件一個整合測試**（不只單元 mount）：mount 元件 + mock `window.api.<domain>.*`，驗證列表、新增、刪除、開啟編輯器、寫回 IPC 都觸發了預期的 channel 呼叫
- **`tests/integration/app-shell-wiring.test.ts`**：mount App.vue，模擬「啟動 → 過 gate → 選 workspace → 選 novel → 切五個 tab → 點章節 → 點 suggestion / export」，驗證每一步畫面真的有可操作元件，不是空白
- **`tests/services/files/workspaceStateRepository.test.ts`**：JSON schema、UTF-8 無 BOM、missing / corrupt 檔案 fallback
- **`tests/services/bootstrap/adapterBootstrap.test.ts`**：兩個 CLI 都存在、只存在一個、兩個都不存在三種情境，bootstrap 都要完成不丟例外
- **改寫 `tests/smoke/vampire-novel.test.ts`** 走 IPC handlers（取代直接呼叫 services），保留為 happy-path 回歸

## Implementation Contract

- **可觀察行為**
  - App 啟動後第一個畫面是 `CollaborationModeGate`（若無 persisted mode）；選完模式跳到 `WorkspaceSelectView`（若無 persisted workspace）或直接還原上次 active novel
  - 進入小說後 NovelView 五個 tab 點下去都看得到對應的 list + 新增按鈕，非空白
  - ChaptersTab 點章節列出項，章節分頁上方多一個分頁、編輯器顯示該章內容
  - ChapterView 內可見「給我建議」與「匯出 HTML」按鈕，按下分別顯示 SuggestionPanel 與 ExportDialog
  - 關閉 App 後重啟，自動回到上次的 workspace + active novel + collaboration mode
- **資料形狀**
  - `workspace-state.json` schema：`{ workspacePath: string, activeNovelId: string | null, collaborationMode: "collaborator" | "ghost-writer" | "auto" | null, lastUpdated: string (ISO8601) }`，UTF-8 無 BOM
  - orchestrator 元件 props（共通）：`{ novelId: string }`；其餘相依（store、adapter 注入）透過 Pinia 或 provide/inject
  - NovelView slot 名稱：`characters` / `chapters` / `factions` / `worldview` / `settings`（kebab-case 對齊 spec capability 名稱）
- **失敗模式**
  - workspace-state.json 不存在或 schema 不合：bootstrap 不丟例外，渲染端從空 workspace 狀態啟動
  - 兩個 AI CLI 都偵測不到：bootstrap 仍完成；suggestion 入口被觸發時走 CLI-unavailable dialog
  - orchestrator 內 IPC 呼叫失敗：以 toast 顯示錯誤，不讓整個 tab 崩潰（沿用既有元件層的 try/catch 風格）
- **驗收**
  - `pnpm test` 全綠（既有 249 + 本 change 新增的單元 / 整合 / smoke 測試）
  - `pnpm electron:dev` 啟動後可不寫程式碼從 GUI 走完吸血鬼短篇 happy path
  - `tests/integration/app-shell-wiring.test.ts` 涵蓋五個 tab + 章節入口 + suggestion / export 入口
  - `tests/smoke/vampire-novel.test.ts` 改走 IPC handlers 仍通過
- **In scope**：6 個 orchestrator、App.vue、NovelView slot 改寫、ChapterView 入口按鈕、`workspaceStateRepository`、`adapterBootstrap`、`workspace:detectActive` handler 補實作邏輯（沿用既有 channel）、相關測試
- **Out of scope**：新 IPC channel、新 preload surface、修改既有 11 capability requirements、Playwright / Electron e2e、自動模式 mode 切換邏輯、demo workspace 按鈕、router 引入

## Risks / Trade-offs

- **風險：orchestrator 與既有元件的 props 不對齊** → Mitigation：每個 orchestrator 寫整合測試先把預期的 props / events flow 釘住；如真需要既有元件變更，獨立提案不擠進本 change
- **風險：workspace-state.json 在 user-data 目錄無法寫入（權限 / 磁碟滿）** → Mitigation：write 失敗以 console + toast 報告但不阻塞 App；下次仍嘗試重建
- **風險：bootstrap 啟動時 cliDetection 耗時影響 App 起動畫面** → Mitigation：在 mode-gate 顯示期間非同步跑 cliDetection；adapter 在 suggestion 觸發時若未就緒，UI 顯示「正在偵測 CLI」並等待
- **Trade-off：選用 named slot 而非 router**：保留簡單性但讓未來引入 deep link（如 `/novel/x/chapter/y`）成本變高；以本 change 範圍尚可接受，列為未來考量

## Migration Plan

- 無 schema migration（新檔 `workspace-state.json` 採 missing-equals-empty 語意）
- rollback：移除 `src/components/tabs/`、`src/services/bootstrap/`、`src/services/files/workspaceStateRepository.ts`，把 App.vue 還原；既有 11 capability 不受影響

## Open Questions

- workspace-state.json 是否需要含 `lastOpenedChapterIds: string[]` 以還原章節分頁？本 change **暫不**包含，留待後續使用者反饋是否需要
- CollaborationMode 的 "auto" 模式在 gate 階段是否需要顯示「auto 是什麼意思」說明？本 change 採極簡（按鈕三選一 + 簡短文案），詳細互動留待後續
