## Why

Spectra Story Creater 內部試用時暴露六大類使用者問題：世界觀／角色／陣營／章節三條 CRUD 流程「按下儲存沒反應」、`novel:read` 觸發 ENOENT、設定頁 CLI 路徑無法持久化、「全域／本小說」分組語意不清。實機追蹤後其中五項共用單一根因（渲染端把 `novel.id` 這個 UUID 誤當成小說資料夾路徑傳給 IPC handler），其餘一項是元件缺 CRUD UI、一項是設定頁缺自動偵測與持久化。集中處理可避免相同 patch 重複出現，並補上目前讓 bug 漏網的 IPC 路徑形狀斷言。

## What Changes

- **BREAKING — 渲染端「小說識別」由 UUID 改為小說資料夾絕對路徑**：`App.vue` 內 `activeNovelId` 改為以 `workspaceRoot + activeNovelName` 拼接出的 `activeNovelDir`；五個 tab 與 `ChapterView` 對外 prop 由 `:novel-id` 改為 `:novel-dir`。所有 `window.api.*` 呼叫接收到的字串自此一律是小說資料夾路徑，與 IPC handler 既有契約對齊。修復世界觀／角色／陣營／章節儲存「按下沒反應」與 `novel:read` ENOENT。
- **BREAKING — 角色與陣營改為 N-N 關係**：`Character` schema 由單一 `factionId: string | null` 改為 `factionIds: string[]`；舊資料讀檔時自動 in-place migrate（有值轉成單元素陣列、null 轉成空陣列、寫檔時舊欄位移除）；`CharacterEditor` 補多選 UI；`FactionMembersView` 補成員加入／移除 CRUD。
- **新增 CLI 執行檔路徑自動偵測**：主行程啟動或設定頁 mount 時，若 `app.getPath('userData')/cli.json` 不存在或欄位空白，主行程自動偵測 Codex CLI 與 Claude Code 的可執行檔位置（Windows 透過 `where`、POSIX 透過 `which`，含常見 npm global、brew、`%LOCALAPPDATA%` 路徑備援）並寫盤；後續開啟一律先做 `fs.access` 存在性驗證，失效則重跑偵測；使用者於 UI 手動編輯儲存後永遠覆蓋自動值。
- **設定頁加入「全域設定 / 本小說設定」分組標題與一行說明文字**：純文案，無邏輯改動。CLI 路徑、AI 全域綁定屬全域；主動性層級屬本小說。
- **資料層不再靜默吞讀檔錯誤**：`listNovels` / `listChapters` / `listCharacters` / `listFactions` 改為僅吞 `ENOENT`（資料夾不存在），其他錯誤往上拋，避免「list 回空陣列 → UI 靜默」這種誤導性失敗。
- **新增 IPC 路徑形狀的測試斷言**：以 TDD 補回「`*.write` / `*.read` 呼叫的第一個參數必須以 `workspaceRoot` 為前綴、以 `activeNovelName` 為末段」的驗證，先紅燈再實作 prop rename。

## Non-Goals

- 不引入新的 `novel:*` / `character:*` / `chapter:*` / `faction:*` IPC channel；本 change 仍走 `wire-novel-app-shell` 定義的既有 `window.api.*` 表面。例外是 `settings:cli:read` / `settings:cli:write` / `settings:cli:autoDetect` 三個 channel，因 CLI 自動偵測屬新功能而新增，已在 What Changes 標明。
- 不重新設計角色／陣營資料模型；只把 `factionId` 擴張為 `factionIds`，不引入「主要陣營」「優先序」這類衍生欄位。
- 不變更 `AiResolver` 四層 fallback 邏輯；CLI 路徑自動偵測屬「CLI 來源解析」前一層，不改 resolver 行為。
- 不為「世界觀」拆獨立 capability；UI 失能屬實作層面，沿用 `novel-data-model` 的 `novel.worldview[]` 持久化，無 spec delta。
- 不把舊 `factionId` 欄位保留為 alias 做雙寫；migration 一次性、寫檔時舊欄位徹底移除，避免長期 schema 漂移。
- 不重新設計設定頁資訊架構；只加分組標題與一行說明，不改控件位置與互動模式。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `novel-data-model`：角色檔案結構由 `factionId: string | null` 改為 `factionIds: string[]`，並定義讀檔 in-place migration 行為。
- `character-management`：必填／可選欄位列表用 `factionIds` 取代 `factionId`；列表依陣營篩選改為陣列 `includes` 比對。
- `faction-tracking`：成員推導以 `Character.factionIds.includes(factionId)` 取代等值比對；新增「自陣營面板對成員做 CRUD」需求。
- `ai-switching`：新增「CLI 執行檔路徑自動偵測、持久化與重啟時 revalidate」需求；既有 binding storage 不變。
- `app-shell`：Tab 編排層的資料契約由「小說 id」改為「小說資料夾路徑」；設定頁加入「全域 / 本小說」語意分組需求。

## Impact

- Affected code:
  - Modified:
    - `src/App.vue`
    - `src/components/tabs/CharactersTab.vue`
    - `src/components/tabs/ChaptersTab.vue`
    - `src/components/tabs/FactionsTab.vue`
    - `src/components/tabs/WorldviewTab.vue`
    - `src/components/tabs/SettingsTab.vue`
    - `src/views/ChapterView.vue`
    - `src/views/SettingsView.vue`
    - `src/components/character/CharacterEditor.vue`
    - `src/components/faction/FactionMembersView.vue`
    - `src/types/character.ts`
    - `src/services/files/characterRepository.ts`
    - `src/services/files/novelRepository.ts`
    - `src/services/files/chapterRepository.ts`
    - `src/services/files/factionRepository.ts`
  - New:
    - `electron/ai/cliDetector.ts`
    - `electron/ipc/settingsHandlers.ts`
    - `src/services/files/cliSettingsRepository.ts`
    - `src/services/ipc/toPlain.ts`
    - 渲染端與主行程 IPC 路徑形狀的單元測試檔（位置依現有測試慣例放置於對應模組旁的 spec 檔案）
    - `tests/services/ipc/toPlain.test.ts`
  - Removed:
    - 無
- AI 行為涉及方：Codex CLI、Claude Code 兩者皆可；本 change 對兩者的可執行檔位置偵測與持久化邏輯一致。
