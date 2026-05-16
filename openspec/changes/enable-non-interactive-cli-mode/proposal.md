## Why

`fix-windows-cli-shim-resolution` archive 後，主行程已能正確找到 `codex.cmd` / `claude.cmd` 並透過 cmd.exe 啟動子行程；但實機按「給我建議」按鈕仍失敗，新錯誤為：

```
CliExecutionError: AI CLI 執行失敗：codex exit=1：Error: stdin is not a terminal
```

根因：Codex CLI 與 Claude Code CLI 預設都是 **interactive 模式**（需 TTY）。我們的 `child_process.spawn` 給 stdin 是 pipe 不是 TTY，CLI 偵測到非 TTY 後直接 abort。確認：

- `codex --help` 開頭即寫「If no subcommand is specified, options will be forwarded to the interactive CLI」，提供 `codex exec` 子命令用於「Run Codex non-interactively」，其 `[PROMPT]` 引數若用 `-` 或省略則改從 stdin 讀。
- `claude --help` 開頭寫「starts an interactive session by default, use -p/--print for non-interactive output」。

主行程的呼叫場景（renderer 點按鈕觸發 IPC 取得單次 AI 回應、不需互動式對話）天生屬於 non-interactive 用法。**`cliInvoker` 必須在 spawn args 上帶上 source-specific 子命令，CLI 才會接受 pipe 來的 stdin**。

此問題與「Windows shim resolution」正交（POSIX 上同樣會踩，與是否走 cmd.exe 包裝無關），故另開 change。

## What Changes

- **修正 `electron/ai/cliInvoker.ts` 的 spawn 啟動參數**：在計算 `command / args` 時依 `source` 加上 non-interactive 子命令：
  - `source === 'codex'` → 在現有 args 結尾追加 `exec`
  - `source === 'claude'` → 在現有 args 結尾追加 `-p`
  - 與既有 Windows `.cmd / .bat` 透過 `cmd.exe /d /s /c <path>` 包裝邏輯**正交**：包裝完的最後一個 arg 是 cliPath，子命令直接接在 args 陣列尾端。
  - prompt 仍從 child.stdin 餵入，不從 argv 傳（兩 CLI 都接 stdin 為 prompt）。
- **擴展 `dispatchSpawnArgs` 簽章**：由 `(cliPath: string) => { command, args }` 改為 `(cliPath: string, source: AiSource) => { command, args }`，仍是純函式、可單測；`source` 由 `invokeCli` 既有參數透傳。
- **新增 `ai-adapters` capability ADDED Requirement**「主行程 SHALL 以 source-specific non-interactive 子命令啟動 AI CLI 子行程」，明訂 codex 對應 `exec`、claude 對應 `-p`、跨平台一致、stdin 仍為 prompt 通道。
- **補強 `tests/electron/ai/cliInvoker.test.ts`**：對 codex 與 claude 兩 source、Windows 與 POSIX 兩平台、`.cmd` 包裝與直接 spawn 兩路徑，全 4 維交叉案例皆驗 spawnFn 收到正確 command / args 形狀。
- **實機 end-to-end 驗證**：在 Windows + nvm4w + 已 login 過 codex / claude 的開發機，點「給我建議」分別觸發 codex 與 claude，主行程不再噴 `stdin is not a terminal`，SuggestionPanel 渲染出 AI 回應文字。
- **不修改 prompt 內容、IPC channel、preload bridge、renderer 程式碼**：本 change 純粹是 spawn args 的精確化。

成功判準（驗證條件）：
1. `dispatchSpawnArgs('C:\\path\\codex.cmd', 'codex')` 在 Windows 回 `{ command: 'cmd.exe', args: ['/d','/s','/c','C:\\path\\codex.cmd','exec'] }`。
2. `dispatchSpawnArgs('/usr/local/bin/claude', 'claude')` 在 POSIX 回 `{ command: '/usr/local/bin/claude', args: ['-p'] }`。
3. 對 codex 真實 spawn（透過 cmd.exe 包 codex.cmd 加 `exec`）+ pipe stdin 餵 prompt，子行程不再噴 `Error: stdin is not a terminal`，能完成一次 stdout 回應。
4. 對 claude 真實 spawn（cmd.exe 包 claude.cmd 加 `-p`）+ pipe stdin 餵 prompt，同樣能完成。
5. 既有 `register-ai-subprocess-handlers` 與 `fix-windows-cli-shim-resolution` 兩個 ai-adapters spec 契約（成功路徑、三類錯誤、超時、SPECTRA_AI_TIMEOUT_MS、Windows shim 解析、cmd.exe 包裝、cli.json self-heal）在新實作下全部仍綠。

## Non-Goals

- **不**支援互動式對話（多輪 stdin / stdout 交替）：本 change 維持「single prompt → single response」契約。多輪互動屬未來 feature。
- **不**使用 `node-pty` 等假 TTY 注入方案：增加原生依賴、跨平台 (Windows 上需 winpty / ConPTY) 複雜性顯著高於本方案；單命令子命令足以解決。
- **不**改 prompt 從 argv 傳：argv 對含換行 / 大引號 / shell 元字元 prompt 會踩 quoting，stdin 是更安全的通道。`codex exec` 與 `claude -p` 都明確支援 stdin。
- **不**處理 CLI 未登入 (`codex login` / `claude login` 未跑) 的錯誤：那是另類錯誤（CLI 自印 `not logged in` 訊息），會由既有 `CliExecutionError(exitCode, stderr)` 自然冒泡到 renderer；本 change 不額外攔截或友善化。
- **不**新增其他 codex / claude 旗標（如 `-c model=...`、`--output-format json`、`--max-budget-usd`）：本次目標就是「讓 spawn 跑得起來」，args 精細化留給未來 change。
- **不**改 `cliPathResolver` 與 `cliDetector`：兩者契約不受影響。
- **不**改 settings UI 或新增「重新偵測」按鈕。

## Capabilities

### New Capabilities

(none — 純行為調整，不引入新 capability)

### Modified Capabilities

- `ai-adapters`：新增一條 ADDED Requirement 規範主行程 spawn AI CLI 時必須帶 source-specific non-interactive 子命令。`ai-adapters` 已於 `fix-windows-cli-shim-resolution` archive 後成為 active spec（含 3 條 requirements），本 change 在其上累加第 4 條。

## Impact

- Affected specs:
  - `openspec/changes/enable-non-interactive-cli-mode/specs/ai-adapters/spec.md`（ADDED Requirements delta，archive 時合併進 `openspec/specs/ai-adapters/spec.md`）
- Affected code:
  - Modified:
    - electron/ai/cliInvoker.ts
    - tests/electron/ai/cliInvoker.test.ts
  - New: 無
  - Removed: 無
- 依賴與環境：不新增任何 npm 套件；保持既有 `node:child_process` 標準庫；不更動 `electron/spawn.ts:buildSpawnEnv` 的 UTF-8 環境變數設定；不更動 `electron/ai/cliDetector.ts` / `electron/ai/cliPathResolver.ts` / `electron/main.ts`。
- 使用者環境前置條件：使用者必須已在終端機跑過 `codex login` 與 `claude login`（本 change 不處理未登入錯誤，但需文件化此前置條件）。
- 測試影響：cliInvoker 新增 4 維交叉測試（2 source × 2 platform × 既有 wrapping 路徑），預期既有 11 個 cliInvoker case 與其他 437 個專案 case 零變動全部通過。
