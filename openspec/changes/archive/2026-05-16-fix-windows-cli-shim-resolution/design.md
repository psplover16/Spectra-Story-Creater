## Context

`electron/ai/cliDetector.ts` 與 `electron/ai/cliInvoker.ts` 是主行程呼叫本機 AI CLI 的兩道關卡：

- `cliDetector.detectCli(name)`：先跑 `where <name>`（Windows）/ `which <name>`（POSIX）取出 PATH 上的可執行路徑，失敗則套用一系列 well-known 安裝位置 fallback；命中即用 `fs.access` 確認檔案存在。
- `cliInvoker.invokeCli(source, input, deps)`：拿 `getCliPath` 解出的路徑，以 `child_process.spawn(path, [], { stdio: ['pipe','pipe','pipe'], env })` 啟動子行程，送 stdin、收 stdout、收 close。

`register-ai-subprocess-handlers` change 已把 `cliInvoker` 的核心契約（成功路徑、三類錯誤、超時、SPECTRA_AI_TIMEOUT_MS）以 spec 寫死，但**沒涵蓋 Windows 平台的 PATH 多候選與 `.cmd` 啟動細節**，導致 nvm4w 等 npm 安裝環境踩雷。

當前現場（Windows + nvm4w）：

- `where codex` 同時回兩列：`C:\nvm4w\nodejs\codex`（無副檔名 unix shim）與 `C:\nvm4w\nodejs\codex.cmd`（cmd shim）
- `cliDetector` 取第一行 → 拿到無副檔名 unix shim
- `fs.access(F_OK)` 通過（檔案確實存在）
- `child_process.spawn` 在 Windows 對純文字 unix shim → ENOENT（需 sh/bash 才能執行）
- 即使改吃 `.cmd`，Node 18.20+/20.12+ 為防堵 CVE-2024-27980，於 Windows 對 `.cmd / .bat` 在 `shell: false` 下會直接拒絕。

主行程整體流程（觸發路徑）：

```
SuggestionPanel「給我建議」按鈕
  └─> useSuggestionRequest (renderer)
        └─> window.api.ai.invoke(source, input)  (preload)
              └─> ipcRenderer.invoke('ai:invoke', ...)
                    └─> registerAiHandlers / aiHandlers (main)
                          └─> invokeCli(source, input, { getCliPath: resolveCliPath })
                                ├─ resolveCliPath(source)
                                │    ├─ 讀 cli.json 候選 → fs.access 過則回
                                │    └─ fallback → cliDetector.detectCli(source)
                                │                     ├─ defaultSpawnLookup('where', name)
                                │                     └─ windowsFallbacks(name) -- npm/.cmd 等
                                └─ child_process.spawn(cliPath, [], { stdio, env })   ← 兩個壞點都在這條路上
```

bug 同時座落於 cliDetector 的「挑哪一行」、cliInvoker 的「怎麼啟動 .cmd」、與 main.ts:resolveCliPath 的「壞 cache 直接回傳」三個位置，**屬於跨模組行為缺陷**，需協調修正。

**第三層問題（apply 階段實機驗證才暴露）**：

修完 cliDetector + cliInvoker 後實機在 nvm4w 環境啟 electron 點按鈕，仍出現相同 `spawn C:\nvm4w\nodejs\codex ENOENT`。追查發現：

- `cli.json` 在 `%APPDATA%\spectra-story-creater\cli.json` 已 cache 壞路徑：
  ```json
  { "codex": "C:\\nvm4w\\nodejs\\codex", "claude": "C:\\nvm4w\\nodejs\\claude", "lastDetectedAt": "2026-05-15T18:31:26.968Z" }
  ```
- 早期版本 cliDetector 把 `where` 第一行（無副檔名 unix shim）寫進 cache 的歷史殘留。
- `electron/main.ts:resolveCliPath` 走「先讀 cli.json + `access(F_OK)`」路徑，無副檔名驗證 → 直接回傳壞路徑、根本沒走到修好的 detectCli。
- 同樣模式對 claude 也存在 — 兩 source 對等失敗。

`resolveCliPath` 目前是 `electron/main.ts` 內 nested function，無 export → 無法單測，也無法注入 deps 模擬 cli.json / detectCli / write 行為。**抽到 `electron/ai/cliPathResolver.ts` 是這層修正的前置條件**。

## Goals / Non-Goals

**Goals:**

- 修復後在 nvm4w + Codex CLI / Claude Code 的 Windows 環境，「給我建議」按鈕能成功跑完一次 AI 呼叫（不再 ENOENT），對 codex 與 claude 兩 source 對等。
- Windows 平台 `defaultSpawnLookup` 對 `where` 多列輸出有明確且可測的優先序：`.cmd > .exe > .bat > 其他`，無可執行副檔名的純文字 shim 一律忽略。
- Windows 平台 `cliInvoker.invokeCli` 對 `.cmd / .bat` 路徑統一透過 `cmd.exe /d /s /c "<quoted path>"` 啟動，路徑經過 cmd.exe quoting，含空格不會被截斷。
- Windows 平台 `cliPathResolver.resolveCliPath` 對 `cli.json` 既有壞 cache（路徑副檔名不在 `.cmd / .exe / .bat`）視同失效，自動 fallthrough 到 `detectCli` 並覆寫 cli.json，無需使用者手動清檔。對 codex 與 claude 兩 source 對等。
- `resolveCliPath` 抽到獨立模組 `electron/ai/cliPathResolver.ts`、可注入 `readSettings / writeSettings / detect / pathExists / nowIso` deps 並 export，可被單元測試覆蓋。
- 既有 macOS / Linux 行為與既有 cliDetector / cliInvoker 測試零變動全部通過。
- 既有 `register-ai-subprocess-handlers` 已寫入 spec 的契約（成功路徑、三類錯誤、超時、SPECTRA_AI_TIMEOUT_MS、resolveCliPath 三層 fallback）在新實作下仍成立，且仍透過注入點可 mock 測試。

**Non-Goals:**

- 不解析 npm/pnpm/yarn shim 的 JS 入口、不改用 `node <entry>` 啟動。
- 不全域開啟 `child_process.spawn` 的 `shell: true`（會踩 spawn quoting 與 shell 注入面、且影響 `defaultSpawnLookup` 內 `where` 自身的呼叫）。
- 不改 `electron/main.ts:resolveCliPath` 對 `cli.json` 路徑的驗證強度（不在此處新增副檔名檢查）。
- 不新增 SuggestionPanel 對 `CliExecutionError` 的友善錯誤 UI（renderer error UX 屬另案）。
- 不更動 `electron/spawn.ts:buildSpawnEnv` 的 UTF-8 環境變數（PYTHONIOENCODING / LANG / LC_ALL / SPECTRA_CHCP）。
- 不引入新的 npm 套件與新的 IPC channel。

## Decisions

### Decision 1: Windows shim 候選依 PATHEXT 友好副檔名排序，純文字 shim 不採用

**選擇**：`defaultSpawnLookup` 在 Windows 平台改為解析 `where` 全部輸出列，依固定優先序 `.cmd > .exe > .bat` 挑出第一個可執行候選；若多列皆不匹配，回 null（讓 fallback 接手）。POSIX 平台維持「取第一行」邏輯不變。

**理由**：
- 直接對齊 Node `child_process.spawn` 在 Windows 上 `shell: false` 能跑的實際範圍（`.cmd / .bat` 走 cmd.exe 包裝後可跑、`.exe` 直接可跑、其餘 PE/MSI/script 不在 spawn 直接支援範圍）。
- `where` 在 Windows 已根據 `PATHEXT` 過濾，但會把同一目錄下不同副檔名全部列出，不能假設第一行就是最可用的（實測：nvm4w 環境第一行為無副檔名 unix shim）。
- POSIX 端 `which` 通常單行輸出，且 `which` 的結果就是可執行檔（chmod +x），無多副檔名問題；維持原邏輯避免引入跨平台分歧。

**替代方案**：
- (A) 全部讀進記憶體再用 `os.constants.X_OK` 一個一個 access — 過度複雜，且 Windows `access` 的執行權檢查不可靠。
- (B) 改吃環境變數 `PATHEXT` 動態決定優先序 — 過度泛用，且專案目標僅 Codex CLI / Claude Code，已知它們以 `.cmd` 形式安裝。

### Decision 2: Windows .cmd / .bat 透過 cmd.exe 啟動，避免全域 shell:true

**選擇**：`cliInvoker.invokeCli` 在啟動子行程前，於 Windows 平台檢查 `cliPath` 副檔名（小寫比對）：
- `.cmd` 或 `.bat` → 改 spawn `cmd.exe`，args 為 `['/d', '/s', '/c', cliPath]`；其中 `cliPath` 直接作為一個 arg（不額外 string concat），讓 Node 自動處理 cmd.exe 的 arg quoting。
- `.exe`（或其他平台）→ 維持原行為，直接 spawn `cliPath`。

**理由**：
- `cmd /d /s /c` 是 Microsoft 官方建議的 batch 啟動方式（`/d` 跳過 AutoRun、`/s` 修正 quote 行為、`/c` 執行後結束），符合 Node 內部 spawn shell:true 的等效實作。
- 直接顯式包 cmd.exe 而非用 `shell: true`，原因：
  1. `shell: true` 會把整條命令字串交給 shell parser，含空格的路徑（如 `C:\Program Files\...`）需自己 quote，錯則被截斷。
  2. `defaultSpawnLookup` 內呼叫 `where` 也會被 `shell: true` 影響，需另條路徑。
  3. `electron/ai/spawnSafety.ts` 設計理念已表明本專案對 spawn 的安全姿態保守，shell 注入面不該擴大。
- args 陣列傳 `cliPath` 不做手動 quoting，Node `child_process.spawn` 在 Windows 對 cmd.exe 已有內建 quoting（`windowsVerbatimArguments` 預設 false 時會 quote），不需要使用者層處理。

**替代方案**：
- (A) `shell: true` — 詳上述。
- (B) 解析 npm shim 抽出 JS 入口 + `node <entry>` — 實作成本高、要相容多種 shim。

### Decision 3: 副檔名判定僅針對 .cmd 與 .bat，不涵蓋 .ps1

**選擇**：本 change 只處理 `.cmd / .bat`。`.ps1` 不在本次範圍。

**理由**：
- npm/pnpm/yarn 安裝的 CLI 在 Windows 主要產出 `.cmd`（cmd shim）+ `.ps1`（powershell shim）+ 無副檔名（unix shim）。`.cmd` 是 npm 預設使用的執行形式（`npm run` 走 `.cmd`），`.ps1` 屬於 powershell 環境補充，現實使用面 `.cmd` 已涵蓋 Windows 上 99% 的 CLI 啟動需求。
- 啟動 `.ps1` 需 `powershell.exe -ExecutionPolicy Bypass -File <path>`，引入額外的執行原則設定面，不適合預設啟用。

**替代方案**：擴及 `.ps1` — 留待未來需求。

### Decision 4: 修法的注入測試點延用既有 spawnFn 與 spawnLookup deps

**選擇**：不新增新的 dependency injection 介面。`cliInvoker` 對 cmd.exe 的選擇邏輯放在 spawnFn 呼叫前的計算段（決定 `command` 與 `args`），spawnFn 介面仍是 `(command, args, options) => ChildProcess`。`cliDetector.defaultSpawnLookup` 內部行為改變，介面保持不變。

**理由**：
- 既有測試（`tests/electron/ai/cliInvoker.test.ts` / `cliDetector.test.ts`）以 `spawnFn` / `spawnLookup` 注入 mock，這是已成熟測試 surface。
- 本 change 不需要主行程平台模擬注入；測試直接用 `process.platform === 'win32'` 條件分支斷言（在 Windows runner 上跑 Windows 路徑、其他 runner 上跑 posix 路徑），新增的測試遵循 `vi.skipIf(process.platform !== 'win32')` 慣用模式。

**替代方案**：注入 `platform` 字串以避免條件 skip — 增加既有 deps 表面、值得未來 refactor 但本 change 不做。

### Decision 5: resolveCliPath 抽出獨立模組並對 Windows 壞 cache 自動 self-heal

**選擇**：把 `electron/main.ts` 內 nested 的 `resolveCliPath` 抽到 `electron/ai/cliPathResolver.ts` 並 export。新模組對 Windows 平台增加副檔名驗證：`cli.json` 候選路徑若副檔名不在 `.cmd / .exe / .bat`，視同失效。失效（含「副檔名不對」與「access F_OK 失敗」兩種情境）會 fallthrough 到 `detectCli` 取得新路徑後**自動覆寫 cli.json**（更新對應 source 的 path 與全域 `lastDetectedAt`），下次啟動不再踩同一壞 cache。POSIX 平台不引入副檔名規則（POSIX shim 多為無副檔名 + chmod +x 純文字 script，副檔名規則會 false reject）。

對 codex 與 claude 兩 source 完全對等：解析、驗證、覆寫邏輯不分 source。`detectCli` 已 source-agnostic（接受 `'codex' | 'claude'`），fallthrough 與 cache 寫回 keying by source。

注入介面：

```ts
export interface CliPathResolverDeps {
  cliJsonPath: () => string                                  // 通常為 path.join(app.getPath('userData'), 'cli.json')
  readSettings: (p: string) => Promise<CliSettings>           // 預設 readCliSettings
  writeSettings: (p: string, s: CliSettings) => Promise<void> // 預設 writeCliSettings
  detect: (name: 'codex' | 'claude') => Promise<string | null> // 預設 detectCli
  pathExists: (p: string) => Promise<boolean>                 // 預設用 fs.access F_OK
  nowIso: () => string                                        // 預設 () => new Date().toISOString()
}

export async function resolveCliPath(
  source: AiSource,
  deps: CliPathResolverDeps,
): Promise<string | null>
```

`electron/main.ts` 改 import 並轉接：

```ts
registerAiHandlers(ipcMain, {
  invoke: (source, input) => invokeCli(source, input, {
    getCliPath: (s) => resolveCliPath(s, defaultCliPathResolverDeps()),
  }),
})
```

**理由**：
- 既有 `register-ai-subprocess-handlers/specs/ai-adapters/spec.md` 已寫「`resolveCliPath` 三層 fallback：cli.json → cliDetector → null」，本 change 在「cli.json 路徑無效」這條 fallback trigger 補一個新觸發條件（副檔名無效），spec 上以 ADDED Requirement 累加而非修改既有 Scenario，不衝突歷史契約。
- 抽到獨立模組讓 cliPathResolver 行為可被注入式單測覆蓋（5 個 deps 全可 mock），不需要啟整套 Electron 主行程。
- 自動覆寫 cli.json 的設計呼應 `fix-novel-id-and-settings-batch/specs/ai-switching/spec.md` 已有的「Subsequent launch where the persisted path has disappeared → 覆寫 + 顯示新值」的契約精神，把「失效」的判定條件由「access 失敗」擴展到「access 失敗 OR 副檔名不可執行（Windows）」。

**替代方案**：
- (A) 不覆寫 cli.json，只 fallthrough 到 detectCli — 每次啟動重複偵測、未 self-heal、settings UI 仍顯示壞值。Reject。
- (B) 在 settings UI 加按鈕讓使用者手動清檔重偵測 — 需要使用者主動操作、UX 差。Reject。
- (C) 修 settings autoDetect 流程 + cliDetector 即可，不動 resolveCliPath — settings autoDetect 觸發時機是 settings 頁 mount 或第一次無 cli.json，已存在 cache 不會被重偵測。Reject。

## Implementation Contract

**Behavior 觀察點**

- 在 Windows + nvm4w + Codex CLI / Claude Code 已安裝的環境下，使用者於章節編輯畫面點擊「給我建議」按鈕（不論 source 為 codex 或 claude），主行程不再丟出 `CliExecutionError: spawn ... ENOENT`；AI 子行程啟動成功並完成一次 stdin/stdout 互動。
- 既有 `cli.json` 含壞 cache（`C:\\nvm4w\\nodejs\\codex` 與 `C:\\nvm4w\\nodejs\\claude` 兩條無副檔名路徑）的 Windows 機器，第一次點擊任一 source 後，cli.json 對應 source path 被覆寫為 `.cmd` 副檔名版本、`lastDetectedAt` 更新為當下 ISO 時間。
- 在 macOS / Linux 環境下，所有現有 cliDetector / cliInvoker 測試以及 SuggestionPanel 對 ai:invoke 的呼叫，行為與當前 main 一致（無回歸）；`cliPathResolver` 在 POSIX 平台對 cli.json 候選路徑只跑 `pathExists`，**不引入副檔名規則**。

**Interface / 資料形狀**

- `cliDetector.detectCli(name, deps?) => Promise<string | null>`：簽章、回傳契約不變。Windows 平台 `defaultSpawnLookup` 內部行為改為「解析 `where` 全部輸出列、按 `.cmd > .exe > .bat` 優先序回傳第一個匹配；無匹配回 null」。POSIX 不變。
- `cliInvoker.invokeCli(source, input, deps) => Promise<AiInvokeResult>`：簽章、`AiInvokeResult` 結構、三類錯誤（`CliUnavailableError` / `CliExecutionError` / `CliTimeoutError`）拋出條件全部不變。內部新增 Windows `.cmd / .bat` → cmd.exe 包裝邏輯，但對外不可見。
- `spawnFn` 介面不變：`(command: string, args: readonly string[], options: { env, stdio: ['pipe','pipe','pipe'] }) => ChildProcess`。
- 新模組 `electron/ai/cliPathResolver.ts` export：
  - `resolveCliPath(source: AiSource, deps: CliPathResolverDeps): Promise<string | null>` — 主行程使用
  - `defaultCliPathResolverDeps(): CliPathResolverDeps` — 包裝 default 實作
  - `isUsableCliPath(path: string): boolean` — Windows 副檔名驗證純函式（測試點）
- `electron/main.ts` 不再含 nested `resolveCliPath`，改 `import { resolveCliPath, defaultCliPathResolverDeps } from './ai/cliPathResolver'`，IPC handler 註冊處 `getCliPath: (s) => resolveCliPath(s, defaultCliPathResolverDeps())`。

**Failure modes**

- Windows 上 `where <name>` 回多列但無 `.cmd / .exe / .bat` 匹配 → `defaultSpawnLookup` 回 null → `detectCli` 進入 `windowsFallbacks` 路徑 → 仍找不到時回 null → `resolveCliPath` 回 null → `invokeCli` 拋 `CliUnavailableError(source)`。
- Windows 上 cmd.exe 啟動 `.cmd` 子行程，子行程退出非 0 → 既有 `child.on('close')` 路徑捕捉，拋 `CliExecutionError(source, exitCode, stderr.slice(0,200))`，**stderr 內容仍是原本子行程寫的**，不夾雜 cmd.exe 的訊息（`/d /s /c` 模式下 cmd.exe 自身不會輸出多餘文字）。
- 30 秒超時或 `SPECTRA_AI_TIMEOUT_MS` 設定的時間到 → 既有計時器路徑觸發 `child.kill('SIGTERM')`；對 cmd.exe 包裝的子行程，SIGTERM 會傳給 cmd.exe，cmd.exe 結束時連帶結束子行程（Windows 行為）。拋 `CliTimeoutError`。
- Windows 上 `cli.json` cache 路徑副檔名無效（如無副檔名 unix shim） → `cliPathResolver` 視為失效，跑 `detect`；若 detect 也回 null → `resolveCliPath` 回 null（**並仍嘗試覆寫 cli.json 為 null**，避免下次再讀到壞值）→ `invokeCli` 拋 `CliUnavailableError`。
- Windows 上 `cli.json` cache 路徑副檔名有效但 `pathExists` 失敗 → 同上 fallthrough 路徑。
- `cliPathResolver` 在覆寫 cli.json 過程遇到磁碟錯誤（無寫入權限） → 吞錯誤 silently（避免阻斷 AI 呼叫流程），但仍回傳 detect 出的新路徑供當次呼叫使用；下次啟動會再次走同樣 fallthrough。

**Acceptance 驗證**

- `tests/electron/ai/cliDetector.test.ts` 新增以下案例皆綠（已實作）：
  1. Windows 平台 `where` 回 `["C:\\path\\codex", "C:\\path\\codex.cmd"]` → `detectCli('codex', { spawnLookup: ... })` 回 `C:\\path\\codex.cmd`
  2. Windows 平台 `where` 回 `["C:\\path\\codex.cmd", "C:\\path\\codex.exe"]` → 回 `.cmd`（驗 `.cmd > .exe` 優先序）
  3. Windows 平台 `where` 全部輸出皆無匹配可執行副檔名 → 回 null（落入 fallback）
  4. POSIX 平台維持「取第一行」行為（既有測試案例不動）
- `tests/electron/ai/cliInvoker.test.ts` 新增以下案例皆綠（已實作）：
  1. Windows 平台 `cliPath` 結尾 `.cmd` → spawnFn 收到 `command='cmd.exe'`, `args=['/d','/s','/c','<原 cliPath>']`
  2. Windows 平台 `cliPath` 結尾 `.bat` → 同上
  3. Windows 平台 `cliPath` 結尾 `.exe` → spawnFn 收到 `command=<原 cliPath>`, `args=[]`（既有行為保持）
  4. POSIX 平台任意路徑 → spawnFn 收到 `command=<原 cliPath>`, `args=[]`（既有測試保持）
- `tests/electron/ai/cliPathResolver.test.ts` 新增以下案例皆綠（本輪要實作）：
  1. Windows + cli.json cache `codex='C:\\nvm4w\\nodejs\\codex'`（無副檔名）+ detect 回 `'C:\\nvm4w\\nodejs\\codex.cmd'` → resolveCliPath 回 `.cmd`，writeSettings 被呼叫一次，新 codex 為 `.cmd`、claude 維持 cache 不動、`lastDetectedAt` 更新
  2. 上述但 source 為 claude → 對等行為（claude 被覆寫、codex 維持不動）
  3. Windows + cli.json cache `codex='C:\\path\\codex.cmd'` + pathExists 通過 → resolveCliPath 直接回 cache 路徑，不呼叫 detect、不呼叫 writeSettings
  4. Windows + cli.json cache `codex='C:\\stale\\codex.cmd'` + pathExists 失敗 + detect 回新 `.cmd` → 覆寫 + 回新 path（既有「stale」契約延續）
  5. Windows + cli.json cache `codex` 無副檔名 + detect 回 null → resolveCliPath 回 null，writeSettings 被呼叫覆寫 codex 為 null（避免下次再讀到壞值）
  6. Windows + cli.json 不存在（readSettings 拋或回 EMPTY）+ detect 回 `.cmd` → 覆寫 + 回新 path
  7. POSIX + cli.json cache `codex='/usr/local/bin/codex'`（無副檔名）+ pathExists 通過 → resolveCliPath 直接回 cache 路徑，不引入副檔名規則
  8. POSIX + cli.json cache 失效 → fallthrough detect + 覆寫（既有契約延續）
  9. `isUsableCliPath` 純函式測試 table（Win 上 `.cmd / .CMD / .exe / .bat` true，無副檔名 / `.ps1` / `.txt` false；POSIX 一律 true）
- `npm test`（vitest 全套）在三平台上維持既有「全綠」狀態，無新失敗。
- **實機 end-to-end 驗證（必要、非 CI 範圍）**：在 Windows + nvm4w + 已裝 codex 與 claude 兩 CLI 的開發機，**先確認** `cli.json` 是壞 cache 狀態（兩 path 都無副檔名）→ 跑 `npm run electron:dev` → 對 codex 與 claude 各按一次「給我建議」 → 主行程 console 無 `ENOENT` → 重讀 `cli.json` 兩 path 都已被覆寫為 `.cmd` 副檔名版本、`lastDetectedAt` 是剛剛時間。

**Scope 邊界**

- **In scope**：`electron/ai/cliDetector.ts`、`electron/ai/cliInvoker.ts`、`electron/ai/cliPathResolver.ts`（新檔）、`electron/main.ts`（改 import）的內部實作；`tests/electron/ai/cliDetector.test.ts`、`tests/electron/ai/cliInvoker.test.ts`、`tests/electron/ai/cliPathResolver.test.ts`（新檔）的測試新增。
- **Out of scope**：`electron/ai/spawnSafety.ts`、`electron/spawn.ts:buildSpawnEnv`、所有 `electron/ipc/*.ts`、所有 `src/`（renderer）下的程式碼、`src/services/files/cliSettingsRepository.ts`（複用、不改）、settings UI / `SettingsView.vue`、`build-novel-app-v1` / `wire-suggestion-flow` / `register-ai-subprocess-handlers` 三個 in-progress change 的 spec 內文（本 change 以 ADDED Requirements 累加而非修改）。

## Risks / Trade-offs

- **[Risk] cmd.exe SIGTERM 在 Windows 上不一定傳遞給子行程** → Mitigation：既有 `cliInvoker.timer` 在 SIGTERM 失敗時仍會呼叫 `reject(new CliTimeoutError(...))` 並 settle promise，主流程不會卡住；殘留 cmd.exe 子孫程序在 OS 層由系統回收（無檔案 lock 風險，因為僅 stdin/stdout 通訊）。長期可考慮加 `taskkill /T /F /PID` 補強，本 change 不做。
- **[Risk] `where` 在某些 Windows 設定下回 `\r\n\r\n` 空行或前導空白** → Mitigation：照既有 `.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0)` 規範化後再過濾副檔名，已涵蓋。
- **[Risk] 副檔名比對採小寫，但檔案名實際大小寫敏感的 mounted volume 行為** → Mitigation：`endsWith('.cmd')` 比對前先 `cliPath.toLowerCase()`，不影響實際路徑傳遞。Windows 預設 NTFS 不分大小寫，邊緣 case（WSL 掛載）若使用者有意手填路徑也會生效。
- **[Trade-off] 不解析 .ps1** → 接受：99% 實務 npm 安裝以 `.cmd` 服務 Windows 使用者；powershell 用戶若嫌 `.cmd` 不順可手填 `cli.json`，但目前 `.cmd` 也吃 cmd.exe 包裝，沒有區分需求。
- **[Risk] cli.json 覆寫競態：兩 source 同時觸發 fallthrough，後寫覆蓋前寫** → Mitigation：`writeCliSettings` 已用 `writeUtf8TextAtomic`（temp + rename）保證單次 write atomic。連續兩次 fallthrough 會發生「先 read → fallthrough A → write A → 再 read → fallthrough B → write B」，最後 cli.json 同時包含 A 與 B 的新值（read-modify-write 順序正確就不會丟）。極端 race（兩 source 同時 read 同一份過時 settings）會導致先寫者被後寫者覆蓋掉自己的更新 — 機率低（user 一次只按一個按鈕），可接受；下次任一 source fallthrough 會再次自我修復。
- **[Risk] 自動覆寫 cli.json 等於程式無聲音地修改使用者資料** → Mitigation：本次 change 的覆寫只在「cli.json 路徑無效（副檔名錯 / 不存在）」時觸發，使用者本來就無法用該路徑，覆寫等同自我修復；不覆寫使用者手填的有效路徑（pathExists 通過就直接回）。`lastDetectedAt` 變化是唯一可觀察 hint，propose Non-Goals 已聲明不加 telemetry / log。
- **[Trade-off] POSIX 不引入副檔名規則** → 接受：POSIX shim 多為無副檔名 + chmod +x 純文字 script（如 `/usr/local/bin/codex` 直接是 node 腳本），副檔名規則會 false reject 使用者實際可跑的路徑；POSIX `which` 回單行、且 `which` 結果 by definition 是可執行檔，原本邏輯沒 nvm4w 這類副檔名歧義問題。

## Migration Plan

無 schema migration、無資料遷移。屬實作層 in-place 修正：
- 部署：merge 後使用者更新版本即可生效，無需手動操作 `cli.json` 或重設。
- 回滾：revert PR 即可，無資料殘留風險。
