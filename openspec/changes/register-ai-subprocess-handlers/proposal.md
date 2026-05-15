## Problem

實機按下「給我建議」按鈕後 SuggestionPanel 沒任何後續行為，VS Code 終端機顯示 `Error: No handler registered for 'ai:invoke'`。`wire-suggestion-flow` change 假設 `ai:invoke` IPC channel 已連通到 CLI 子行程，但實際上主行程從未 register 對應 handler，也沒任何模組會 spawn Codex CLI 或 Claude Code 子行程。

## Root Cause

三個串連的缺口：

1. **`electron/main.ts.registerAllHandlers` 未呼叫 `registerAiHandlers`**：`ai:invoke` 與 `consistency:dryRun` 兩條 channel 在主行程從未被註冊。renderer 透過 `window.api.ai.invoke(...)` 發出 IPC 後，Electron 因找不到 handler 直接 reject Promise，錯誤訊息為「No handler registered for 'ai:invoke'」。
2. **`electron/ipc/aiHandlers.ts` 的 `deps.invoke(source, input)` 缺實作**：該模組已寫出 `registerAiHandlers` 與 `createAiHandlers` 框架，但其 deps 端要求外部提供 `invoke(source, input): Promise<AiInvokeResult>`，當前專案沒任何模組實作這個函式——也就是說即使 register 了 channel，handler 還是會 throw「deps.invoke is not a function」。
3. **preload 與 handler 介面對不上**：`electron/preload.ts` 的 `ai.invoke` 簽名是 `(input)` 一個參數，但 main 端 handler 期待 `(source, input)` 兩個參數；`src/services/bootstrap/adapterBootstrap.createRendererAdapter` 也只呼叫 `invoke(input)` 沒帶 source。即使前兩個缺口補上，handler 也無法知道該 dispatch 給哪個 CLI。

`useSuggestionRequest.invoke` 內部 catch 只處理 `CliUnavailableError` 與 `CliExecutionError`，普通 Error 會被 re-throw，最終被 useSuggestionFlow 外層 try-catch 吞掉、console.warn、isLoading=false，表面看起來就是「按了沒反應」。

## Proposed Solution

新增 `electron/ai/cliInvoker.ts` 提供 `invokeCli(source, input, deps)` 函式，作為 `registerAiHandlers` 所需的 `deps.invoke` 實作；同時對齊 preload 與 adapterBootstrap 的 source 參數，並在 `electron/main.ts.registerAllHandlers` 加上 `registerAiHandlers` 註冊。

具體設計：

- `cliInvoker.invokeCli(source, input, deps)` 內部用 Node `child_process.spawn` 啟動 CLI，prompt 從 stdin 寫入後 `child.stdin.end()`，stdout 累積至 child close 後 trim 視為 `AiInvokeResult.text`；exit code 0 視為成功；非 0 則丟 `CliExecutionError`；超時（預設 30 秒，可由 `SPECTRA_AI_TIMEOUT_MS` 覆寫）丟 `CliTimeoutError`；CLI 路徑找不到時丟 `CliUnavailableError`。
- CLI 路徑透過 `deps.getCliPath(source)` 取得；該 deps 在 main.ts 串接時讀 cli.json（既有 `cliSettingsRepository`），缺失或 `fs.access` 失敗則跑 `cliDetector.detectCli` 重偵測；兩者皆失敗時回 null，由 invokeCli 內 throw `CliUnavailableError`。
- spawn 環境變數用既有 `electron/spawn.ts.buildSpawnEnv()` 強制 UTF-8（PYTHONIOENCODING／LANG／LC_ALL／SPECTRA_CHCP=65001），對齊既有 D3 隱私硬約束的 UTF-8 編碼策略。
- preload `ai.invoke` 改為 `(source: AiSource, input: AiInvokeInput)` 兩參數簽名，dist-electron/preload.cjs 必須重 build。`src/services/bootstrap/adapterBootstrap.createRendererAdapter` 同步改為 `window.api.ai.invoke(source, input)`。
- `electron/main.ts.registerAllHandlers` 加 `registerAiHandlers(ipcMain, { invoke: (source, input) => invokeCli(source, input, { getCliPath, spawnFn, timeoutMs }) })`。
- 單元測試 `tests/electron/ai/cliInvoker.test.ts` 用 mock spawnFn 覆蓋三條路徑：成功 / exit code 非 0 / timeout；整合測試補 main.ts 註冊 ai handlers。
- AI 互動仍透過子行程呼叫 Codex CLI 或 Claude Code，符合 D3「不直接呼叫 LLM 廠商 HTTP API」隱私硬約束。

## Non-Goals

- 不引入新 IPC channel；只 register 既有 `ai:invoke` 與 `consistency:dryRun`。
- 不改 useSuggestionRequest／useSuggestionFlow／SuggestionPanel／CliFallbackDialog 等 renderer 端 wire-up。
- 不改 AiResolver 四層 fallback 行為。
- 不為兩個 CLI 各自的 prompt flag 或 JSON 輸出模式做分支；本 change 一律 stdin pipe / stdout plain text。
- 不支援 streaming response；一次性收完整 stdout。
- 不為 CLI 失敗的「自動切換」做設計；既有 `CliFallbackDialog` 已涵蓋 retry／switch／cancel 三選一。
- 不變更 character-equipment-effects 或 promote-equipment-to-first-class 的 schema 與 spec。
- 不對 prompt 內容做加密或 redaction；redaction 屬 ai-adapters 既有範圍。

## Success Criteria

- 使用者按 SuggestionPanel 的「給我建議」按鈕後，主行程 spawn 對應 CLI 子行程（Codex 或 Claude Code）；CLI 可用時 stdout 內容回填到 SuggestionPanel；CLI 不可用時跳 CliFallbackDialog；console 不再出現「No handler registered for 'ai:invoke'」。
- 單元測試 `tests/electron/ai/cliInvoker.test.ts` 覆蓋成功／exit code 非 0／timeout 三條子測試皆綠。
- 既有測試集合（406 條基線）不退化。
- `pnpm typecheck` 本 change 範圍內無新 type 錯誤；preload 介面變更後 `adapterBootstrap` 與既有 mock 已對齊。
- 手動實機驗收：執行 `pnpm electron:dev`，確保 cli.json 含有效 Codex 或 Claude Code 路徑，進入章節編輯按「給我建議」→ SuggestionPanel 顯示 CLI 真實回應；console 無 ai-invoke handler missing 錯誤。

## Impact

- Affected specs:
  - 修改：`ai-adapters`
- Affected code:
  - 新增：
    - `electron/ai/cliInvoker.ts`
    - `tests/electron/ai/cliInvoker.test.ts`
  - 修改：
    - `electron/main.ts`（registerAllHandlers 加 registerAiHandlers）
    - `electron/preload.ts`（ai.invoke 簽名加 source 參數）
    - `src/services/bootstrap/adapterBootstrap.ts`（createRendererAdapter 改傳 source）
    - `tests/services/bootstrap/adapterBootstrap.test.ts`（mock 對齊新簽名）
  - 移除：無
- AI 行為涉及方：Codex CLI、Claude Code 兩者皆可；本 change 不變更 AiResolver 四層 fallback，僅補完主行程端 CLI 子行程實作。
