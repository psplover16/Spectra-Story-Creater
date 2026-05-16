## Why

Windows 使用者透過 nvm4w 安裝 Codex CLI / Claude Code 後，於章節編輯畫面點擊「給我建議」按鈕會出現 `CliExecutionError: AI CLI 執行失敗：codex exit=-1：spawn C:\nvm4w\nodejs\codex ENOENT`（claude 同樣失敗），整個主動建議流程無法使用。問題具有三重根因：

1. `electron/ai/cliDetector.ts` 用 `where codex` 後僅取輸出第一行，但 npm 在 Windows 同時放入無副檔名的 unix shim（如 `C:\nvm4w\nodejs\codex`，給 Git Bash 用的純文字檔）與 `.cmd` shim，第一行常是不可被 Node `child_process.spawn` 執行的 unix shim。
2. `electron/ai/cliInvoker.ts` 對解析出的路徑直接 `spawn`，預設 `shell: false`。Node 18.20+/20.12+ 為防堵 CVE-2024-27980，於 Windows 對 `.cmd / .bat` 在 `shell: false` 下會直接拒絕，使用者就算在 `cli.json` 手填 `.cmd` 路徑也仍然失敗。
3. `electron/main.ts:resolveCliPath` 讀 `cli.json` cache 後僅以 `fs.access(F_OK)` 檢查存在性，未驗副檔名。早期版本 cliDetector 把 `where codex` 第一行（無副檔名 unix shim）寫進 `cli.json`，這條 cache 即使在 cliDetector 修好後仍會被優先讀取並回傳，根本走不到修正過的偵測邏輯。同樣模式對 claude 也存在（`cli.json` 同時 cache 了 `C:\nvm4w\nodejs\claude` 無副檔名 path）。

三層任一未修，bug 都無法在歷史 cache 還在的 Windows 環境消失。必須三層同時修，並對 codex 與 claude 兩 source 對等處理。

## What Changes

- **修正 `electron/ai/cliDetector.ts` 的 Windows 候選排序**：`defaultSpawnLookup` 改為解析 `where` 全部輸出列、按 `PATHEXT` 友好的副檔名優先序（`.cmd > .exe > .bat`）挑選，未匹配可執行副檔名的純文字 shim 不採用。
- **修正 `electron/ai/cliInvoker.ts` 的 Windows spawn 行為**：當解析路徑副檔名為 `.cmd / .bat` 時，於 Windows 改透過 `cmd.exe /d /s /c "<quoted path>"` 啟動子行程；其他平台與 `.exe` 維持現況。路徑必須適當 quoting，避免含空格路徑被 cmd.exe 截斷。
- **補強既有測試**：`tests/electron/ai/cliDetector.test.ts` 增加多行 `where` 輸出、混合副檔名、unix shim 過濾的案例；`tests/electron/ai/cliInvoker.test.ts` 增加 Windows `.cmd` 路徑透過 cmd.exe 啟動的案例（依靠 `process.platform` 與 `spawnFn` 注入點驗證行為）。
- **抽出 `resolveCliPath` 至獨立模組 `electron/ai/cliPathResolver.ts`**：原本是 `electron/main.ts` 內 nested function 無法單測；抽出後可注入 `readSettings / writeSettings / detectFn / pathExists / nowIso` 等 deps 並驗證 codex / claude 兩 source 的解析、覆寫、fallback 行為。`electron/main.ts` 改 import 並轉接，啟動行為不變。
- **修正 `resolveCliPath` 對歷史壞 cache 的處理（codex 與 claude 對等）**：Windows 平台讀 cli.json 時，若候選路徑副檔名不在 `.cmd / .exe / .bat`（典型情境：早期版本把 nvm4w `where <name>` 第一行無副檔名 unix shim 寫入 cache），視為失效；fallthrough 到 `detectCli` 取得新路徑後**自動覆寫** cli.json（更新 `lastDetectedAt`），避免下次啟動重複踩坑。POSIX 平台不引入副檔名規則，維持單純 `access(F_OK)` 行為。
- **新增 `ai-adapters` capability 的 Windows 平台規範**：以 ADDED Requirements 形式補上「PATH lookup 對多行輸出必須挑可執行副檔名」、「Windows 對 `.cmd / .bat` 必須透過 cmd.exe 啟動」、「`resolveCliPath` 對 Windows cli.json cache 路徑副檔名無效時視同失效並覆寫」三條 spec-level 行為，使既有契約在 Windows 真的成立、未來合併進 `ai-adapters/spec.md` 後成為平台行為的明文記錄。
- **補強既有測試與新增 cliPathResolver 測試**：`tests/electron/ai/cliDetector.test.ts` 增加多行 `where` 輸出、混合副檔名、unix shim 過濾的案例；`tests/electron/ai/cliInvoker.test.ts` 增加 Windows `.cmd` 路徑透過 cmd.exe 啟動的案例；新增 `tests/electron/ai/cliPathResolver.test.ts` 覆蓋 codex 與 claude 兩 source 的「壞 cache → fallthrough + 覆寫」、「好 cache → 直接回」、「POSIX 不引入副檔名規則」等案例。
- **不修改 IPC channel、preload bridge 與 renderer 程式碼**：bug 屬於主行程實作層之 Windows 平台相容性，使用者觸發路徑（按鈕點擊→IPC→主行程）契約不變。

成功判準（驗證條件）：
1. 在 nvm4w 環境（`where codex` 同時回 `codex` 與 `codex.cmd` 兩列），`detectCli('codex')` 回傳的路徑副檔名為 `.cmd`；同樣對 `where claude` 適用。
2. 對 `.cmd` 路徑呼叫 `invokeCli` 在 Windows 不再噴 `ENOENT`，能完成 stdin/stdout 雙向溝通。
3. `resolveCliPath('codex')` 在 cli.json cache 為 `C:\nvm4w\nodejs\codex`（無副檔名 unix shim）時，於 Windows 視為失效、回傳新偵測的 `C:\nvm4w\nodejs\codex.cmd`，且 cli.json 內 `codex` 欄位被覆寫為新路徑、`lastDetectedAt` 更新；同樣對 claude 適用。
4. 既有 macOS/Linux 行為不受影響（`detectCli` / `invokeCli` / `resolveCliPath` 在 posix 平台維持當前邏輯與當前測試 100% 通過；POSIX 不引入副檔名規則）。
5. 新增的單元測試在 Windows / macOS / Linux 上皆綠（透過注入 `spawnLookup` / `spawnFn` / cliPathResolver deps 模擬，無需實機跑 Codex CLI / Claude Code）。
6. 實機驗證：在 Windows + nvm4w 環境，於 `npm run electron:dev` 下對 codex 與 claude 各觸發一次「給我建議」，主行程 console 不再噴 `spawn ... ENOENT`，`cli.json` 兩個 path 都被覆寫為 `.cmd` 副檔名版本。

## Non-Goals

- **不**改寫 npm shim 解析機制（不剖析 shim 內部 JS 入口、不改用 `node <entry>` 啟動）。原因：實作成本高、要相容 npm/pnpm/yarn 多種 shim 格式，超出本 bug 修復範圍。
- **不**全域開啟 `child_process.spawn` 的 `shell: true`。原因：違反 `electron/ai/spawnSafety.ts` 已建立的「謹慎 spawn」設計、引入 shell 注入面、影響其他子行程呼叫。
- **不**修改 settings UI 的副檔名驗證流程（settings 頁面 auto-detect 觸發時走的是同一條 `cliDetector.detectCli`，已被本 change 修正；UI 不顯示「副檔名建議」之類的提示文字）。
- **不**新增 SuggestionPanel 對 `CliExecutionError` 的友善錯誤 UI（屬 renderer error UX 範疇，另案處理）。
- **不**在 `cliPathResolver` 加 telemetry / metrics（壞 cache 修復事件不上報，console 也不額外印；觀察由 `lastDetectedAt` 變化得知）。
- **不**改變既有 `wire-suggestion-flow` 與 `register-ai-subprocess-handlers` 兩個 in-progress change 的 scope；本 bug 在它們的契約之下另立 change 修正。

## Capabilities

### New Capabilities

(none — 純實作層 bug fix，不引入新 spec capability)

### Modified Capabilities

- `ai-adapters`：新增 Windows 平台 npm shim 解析規範、`.cmd / .bat` 透過 cmd.exe 啟動規範、`resolveCliPath` 對歷史壞 cache 的副檔名驗證與覆寫規範。`ai-adapters` 目前由 in-progress change `register-ai-subprocess-handlers` 維護，尚未 archive 為 active spec；本 change 以 ADDED Requirements 形式累加，待 `register-ai-subprocess-handlers` archive 後再合併本 change。

## Impact

- Affected specs:
  - `openspec/changes/fix-windows-cli-shim-resolution/specs/ai-adapters/spec.md`（本 change 的 spec delta，ADDED Requirements）
- Affected code:
  - Modified:
    - electron/ai/cliDetector.ts
    - electron/ai/cliInvoker.ts
    - electron/main.ts
    - tests/electron/ai/cliDetector.test.ts
    - tests/electron/ai/cliInvoker.test.ts
  - New:
    - electron/ai/cliPathResolver.ts
    - tests/electron/ai/cliPathResolver.test.ts
  - Removed: 無
- 依賴與環境：不新增任何 npm 套件；保持既有 `node:child_process` / `node:os` / `node:path` 標準庫使用；新模組複用既有 `src/services/files/cliSettingsRepository` 的 `readCliSettings` / `writeCliSettings` / `EMPTY_CLI_SETTINGS`；不更動 `electron/spawn.ts:buildSpawnEnv` 的 UTF-8 環境變數設定。
- 測試影響：新增 cliDetector / cliInvoker / cliPathResolver 的 Windows 路徑分支與 cache 覆寫測試案例，預期既有 macOS/Linux 測試案例零變動全部通過。
