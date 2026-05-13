# Project Vocabulary

本檔為 Spectra Story Creater 的標準術語表。

供 `/spectra-discuss`、`/spectra-propose`、`/spectra-apply`、`/spectra-ask` 等 skills 在產出 / 引用 artifacts 時對齊用詞，避免 vocabulary drift。

每條包含：

- **definition**：在本專案的明確語義
- **avoid**（可選）：應避免使用的同義詞 / 容易混淆的詞
- **why**：為何採此用法

## 原則

1. **遇到 avoid 詞要在 discuss 結論的「Vocabulary drift」段明示**，再於 artifact 套用標準詞。
2. **規格層（spec.md）的描述以「使用者可觀察行為」為主**；CLI 名稱、檔案路徑等寫死細節留在 `design.md` 或實作。
3. **既有歷史 artifact 若使用 legacy 同義詞、且改寫成本高、語境清楚**，可保留並在當前 change 的 design.md 註記，不強制全域替換。

## 術語

### 主行程（main process）

- **definition**：Electron 的 Node.js 端，承載 BrowserWindow 啟動、IPC handlers 註冊、檔案 I/O、`child_process.spawn` 呼叫本機 AI CLI。對應 `electron/main.ts` 與 `electron/ipc/`、`electron/ai/`。
- **avoid**: 後端 / backend / server-side
- **why**: 本專案 100% 本機桌面 app，無遠端服務、無 HTTP server。「後端」會誤導讀者以為架構含 client-server 分層。

### 渲染端（renderer）

- **definition**：Electron BrowserWindow 內的 Chromium，跑 Vue SFC、Pinia store。對應 `src/`。
- **avoid**: 前端 / frontend（不嚴格，描述 UI 元件層時仍可用，但跨進程語境請用「渲染端」對映「主行程」）
- **why**: 「前端」在本專案有時指 UI 元件，有時指 renderer process；明確分流可避免歧義。

### 服務層（services）

- **definition**：`src/services/` 底下的純 TS module，無 Vue / Electron 依賴。包含 repositories、AI adapters、context assembler、consistency auditor、HTML exporter 等。可被主行程載入，亦可被測試直接呼叫。
- **avoid**: 後端服務 / 業務邏輯層 / model 層
- **why**: 「服務層」精準描述其角色：純函式 / 純類別，邊界明確。

### 資料層（data layer / repositories）

- **definition**：`src/services/files/*Repository.ts`，負責 novel / character / chapter / faction 的 JSON 檔讀寫，含 schema 驗證與 UTF-8 無 BOM 強制。
- **avoid**: DAO / persistence layer / DB layer
- **why**: 本專案不採 SQLite / IndexedDB（D2），純檔案 + 資料夾。用「資料庫」相關詞會誤導。

### IPC handlers

- **definition**：`electron/ipc/*Handlers.ts`，向 `ipcMain` 註冊 channel，把 renderer 透過 `window.api.*` 的呼叫橋接到服務層。
- **avoid**: API endpoints / routes
- **why**: 「API endpoints / routes」暗示 HTTP，但這是進程內 IPC，傳輸層完全不同。

### AI 回應來源（AI response source）

- **definition**：對單次 AI 互動而言，回應產自哪個本機 CLI 子行程（Codex CLI 或 Claude Code）。由 `AiResolver` 依 4 層 binding 決定。
- **avoid**: AI 模型 / model / LLM provider
- **why**: 規格層不應綁特定模型版本；具體 CLI 對應留在 `design.md` 或實作。spec rule 已明列。

### 職能（AI role）

- **definition**：六個獨立可綁 CLI 的 AI 職能：plot-driver、character-voice、worldbuilding、character-design、outline-assistant、consistency-auditor。
- **avoid**: 角色（character）的同義詞 — 「角色」在本專案專指小說中的人物（如「韋小寶」）
- **why**: 「職能」對應 AI 的工作類別，「角色」對應小說的人物。混用會在 design / code 兩處同時造成困擾。

### 章節分支（chapter branch）

- **definition**：對既有章節「另存為分支」產出的另一版本，存於 `<novel>/chapters/<chapter-id>.branches/<branch-id>.json`，含 `branchOf` 與 `branchedAt`。同一章可有多個分支，但分支不同步。
- **avoid**: 版本 / version / draft
- **why**: 「版本」太泛；本專案的 branch 有具體 schema 與檔案結構約束。

### 一致性檢查（consistency audit / dry-run）

- **definition**：AI 回應在被顯示給使用者前，由 `ConsistencyAuditor.dryRun` 對候選文字做的 5 類偵測（OOC / 能力憑空 / 關係矛盾 / 世界觀矛盾 / 時間線錯亂）。
- **avoid**: 內容審核 / moderation / safety check
- **why**: 「moderation / safety」在 LLM 語境通常指違規內容過濾；這裡是「劇情與設定不一致」的偵測，目標完全不同。

### 主動性層級（proactivity level）

- **definition**：「給我建議」按鈕觸發後，AI 主動程度的強度。值為 `strong | medium | weak | off | inherit`。三層 fallback：character → novel → global（D9）。
- **avoid**: 創意程度 / temperature
- **why**: 與 LLM 的 `temperature` 無關；這是 spec 層的使用者控制旋鈕。

### 性格演化（personality drift / evolution）

- **definition**：AI 回應暗示角色性格偏移時，由 `personalityDetector` 產生 `DriftFinding`，由使用者決定是否接受寫回 character 檔（D13）。**永遠不自動寫回**。
- **avoid**: 自動學習 / fine-tune
- **why**: 這是規則式偵測 + 使用者決策，沒有任何權重訓練。

### 工作目錄 / workspace root

- **definition**：使用者於 `WorkspaceSelectView` 挑選的本機資料夾，底下每本小說一個子目錄（`<workspace>/<novel-name>/`）。
- **avoid**: project root / vault / library
- **why**: 「project」與「Spectra change proposal」的 project 詞會撞；「vault / library」暗示 app 內部隔離儲存，但本專案使用者可手動編輯 / 雲端備份。

### 章節分頁（chapter tab）

- **definition**：啟用小說內的編輯分頁，**一章一頁、一頁一章**。重複開啟既存章節時焦點轉移，不另開新 tab（D12）。
- **avoid**: 工作區 tab / 視窗
- **why**: 「視窗」會與 Electron BrowserWindow 撞名。

## 變更流程

新增或修正術語時：

1. 在當前 change 的 design.md「Vocabulary」段或 discuss 結論註記變更
2. 修本檔
3. 若改了某個既有 avoid 同義詞的處理（例如改為允許），需在影響到的歷史 changes 簡單交代
