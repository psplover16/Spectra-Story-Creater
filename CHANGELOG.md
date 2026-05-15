# Changelog

本檔記錄 Spectra Story Creater 對使用者可觀察的重要變更。

## Unreleased — fix-novel-id-and-settings-batch

### Fixed

- **修正世界觀、角色、陣營、章節 CRUD「按下儲存無反應」與 `novel:read` 觸發 ENOENT 的根因**：渲染端原本誤把 `novel.id`（UUID）當作 IPC handler 期望的小說資料夾路徑傳遞，因此 `<cwd>/<UUID>/novel.json` 永遠找不到檔。本次修法把渲染端對所有 `window.api.*` 的呼叫一律改為以小說資料夾絕對路徑（`workspaceRoot` + `activeNovelName`）為第一參數；同步在 renderer / 元件測試新增 IPC 路徑形狀斷言，避免回歸。
- **陣營「查看成員」面板補成員加入與移除 CRUD**：可於成員清單直接挑選未屬本陣營的角色加入，或對既有成員按移除；操作後立刻反映且不影響該角色與其他陣營的關聯。
- **資料層 list 函式不再靜默吞讀檔錯誤**：`listNovels` / `listChapters` / `listCharacters` / `listFactions` 改為僅吞 `ENOENT`（資料夾不存在），其他 I/O 錯誤往上拋，避免「list 回空陣列 → UI 顯示沒資料」的誤導性靜默失敗。

### Added

- **設定頁 CLI 路徑自動偵測與持久化**：首次開啟應用時，主行程自動偵測本機 Codex CLI 與 Claude Code 的可執行檔位置（Windows 使用 `where`、POSIX 使用 `which`，並含 npm global、Homebrew、`%LOCALAPPDATA%` 等常見位置作為 fallback），偵測結果寫入 Electron `userData` 目錄下的 `cli.json`；後續開啟對已持久化路徑做存在性驗證，失效則重新偵測。使用者於設定頁手動填入並儲存後，後續開啟一律優先採用手動值（只要該檔仍存在）。
- **設定頁加入「全域設定」與「本小說設定」分組標題**：CLI 路徑與 AI 全域綁定歸入全域；主動性層級歸入本小說。各組附一行說明文字標示語意域。

### Changed (BREAKING)

- **角色與陣營關係由 1-N 改為 N-N**：`Character` schema 由單一 `factionId: string | null` 改為 `factionIds: string[]`，允許一個角色同時隸屬多個陣營。`characterRepository.read` 讀入舊欄位 `factionId` 時會自動 in-place migrate：
  - `factionId` 為非空字串 → `factionIds = [factionId]`
  - `factionId` 為 `null` 或缺欄位 → `factionIds = []`
  - 同時含兩者 → 採用 `factionIds`，記錄 warn log
  下次寫盤時舊欄位 `factionId` 徹底移除。`CharacterEditor` 加入多選陣營控制。

### Migration / 不支援回退

本次變更為一次性 in-place migration，無需使用者操作；首次讀入舊資料時自動轉換，下次寫檔時舊欄位消失。**不支援回退到本次變更之前的版本**：新檔案的 `factionIds` 會被舊版的驗證器拒絕。若需要回退，使用者必須手動把每個 character JSON 的 `factionIds: ["x"]` 還原為 `factionId: "x"`。

### Internal

- 新增 `tests/helpers/expectPathLike.ts` 測試 helper，用於斷言 IPC 呼叫的第一個字串參數確實是小說資料夾絕對路徑（容忍 OS 分隔符差異）。
- `characterRepository.write` 改用 `.tmp` + `rename` atomic 寫法以避免中斷造成半新半舊狀態（同步加到 `encoding.ts` 的 `writeUtf8TextAtomic` 共用函式）。
- 新增三條對應 IPC channel：`settings:cli:read`、`settings:cli:write`、`settings:cli:autoDetect`，外加 `settings:cli:ensure`（讀取 + revalidate + 必要時重偵測）。
