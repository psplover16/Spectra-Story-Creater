<!--
Each task description states the behavior or contract being delivered and the
verification target that proves completion. File paths are supporting context.
-->

## 1. 紅燈測試先行（TDD）

- [x] [P] 1.1 新增 `tests/electron/ai/cliInvoker.test.ts`：覆蓋「成功路徑：mock spawn stdout='AI response'、exit 0 → 回 AiInvokeResult.text='AI response'」「CLI 不可用：getCliPath 回 null → throw CliUnavailableError」「exit code 非 0：mock stderr='boom'、exit 1 → throw CliExecutionError 含 exitCode 與 stderr」「timeout：spawn 不 close、設 timeoutMs=100 → child.kill 被呼叫、throw CliTimeoutError」「SPECTRA_AI_TIMEOUT_MS 環境變數覆寫預設 30000」五條子測試，落實 design 中 Decision: 新增 cliInvoker 模組以 dependency injection 形式封裝 CLI subprocess invoke 與 Requirement: Main process spawns AI CLI subprocesses through the cliInvoker module。驗證：執行 `pnpm test -- tests/electron/ai/cliInvoker.test.ts`，五條皆 fail（cliInvoker 尚未實作）。
- [x] [P] 1.2 修改 `tests/services/bootstrap/adapterBootstrap.test.ts`：把對 `window.api.ai.invoke` 的 mock 與斷言改為 `(source, input)` 兩參數簽名；新增「createRendererAdapter('codex') 呼叫 invoke 時帶 source='codex'」與「createRendererAdapter('claude') 同理」兩條子測試，落實 design 中 Decision: preload 與 adapterBootstrap 對齊兩參數簽名 與 Requirement: ai.invoke preload bridge accepts a source parameter。驗證：執行該測試應 fail（adapterBootstrap 內呼叫仍是 invoke(input)）。

## 2. cliInvoker 實作

- [x] 2.1 新增 `electron/ai/cliInvoker.ts`，匯出 `CliInvokerDeps` 介面（getCliPath／可選 spawnFn／可選 timeoutMs）與 `invokeCli(source, input, deps)` 函式；內部用 Node `child_process.spawn` 啟動 CLI 並套用 `buildSpawnEnv()`；stdin 寫入 prompt 後 end；stdout／stderr 累積；exit code 0 回 AiInvokeResult.text=trimmed stdout；非 0 throw CliExecutionError；超時 throw CliTimeoutError；CLI 路徑 null throw CliUnavailableError。落實 design 中 Decision: 新增 cliInvoker 模組以 dependency injection 形式封裝 CLI subprocess invoke 與 Decision: stdin 一次性寫入 prompt、stdout 累積後 trim 為 response.text 與 Decision: stderr 內容於失敗時併入 CliExecutionError 訊息。驗證：任務 1.1 五條子測試由紅轉綠。
- [x] 2.2 在 `electron/ai/cliInvoker.ts` 加入 timeout 邏輯：預設 30000ms，可由 `process.env.SPECTRA_AI_TIMEOUT_MS`（parse 為整數，無效時 fallback 預設）覆寫；timeout 觸發時呼叫 `child.kill('SIGTERM')` 並 reject CliTimeoutError(source, effectiveTimeoutMs)。落實 design 中 Decision: 30 秒 timeout 預設、SPECTRA_AI_TIMEOUT_MS 環境變數覆寫。驗證：任務 1.1 中 timeout 與環境變數覆寫兩條子測試由紅轉綠。

## 3. preload 與 adapterBootstrap 對齊兩參數

- [x] 3.1 修改 `electron/preload.ts` 的 `ai.invoke`：簽名由 `(input)` 改為 `(source, input)`，內部呼叫 `ipcRenderer.invoke('ai:invoke', source, plain(input))`，落實 design 中 Decision: preload 與 adapterBootstrap 對齊兩參數簽名 (source, input) 與 Requirement: ai.invoke preload bridge accepts a source parameter。驗證：tsc 全綠；preload.cjs 重 build 後 grep `ipcRenderer.invoke('ai:invoke'` 顯示三個引數。
- [x] 3.2 修改 `src/services/bootstrap/adapterBootstrap.ts` 的 `createRendererAdapter`：在內部呼叫處改為 `await invoke(source, input)`，把外層閉包持有的 source 傳給 preload bridge，落實 Requirement: ai.invoke preload bridge accepts a source parameter 中「Renderer adapter passes its own source to the bridge」scenario。驗證：任務 1.2 兩條子測試由紅轉綠。

## 4. main.ts 註冊 ai handlers 並串接 cli 路徑解析

- [x] 4.1 在 `electron/main.ts` 內新增 `resolveCliPath(source)` helper：先讀 `app.getPath('userData')/cli.json`（透過既有 `cliSettingsRepository.readCliSettings`），若該 source 路徑非空且 `fs.access` 成功則回該路徑；否則呼叫 `cliDetector.detectCli(source)`；皆失敗回 null，落實 design 中 Decision: CLI 路徑取得順序 cli.json → cliDetector 與 Requirement: CLI path resolution falls through cli.json then cliDetector。驗證：補一條整合測試斷言「cli.json 含有效路徑時不呼叫 cliDetector」「cli.json 失效時 fallback 到 cliDetector」「兩者皆失敗回 null」三條皆綠燈。
- [x] 4.2 在 `electron/main.ts.registerAllHandlers` 加 `registerAiHandlers(ipcMain, { invoke: (source, input) => invokeCli(source, input, { getCliPath: resolveCliPath }) })`，落實 design 中 Decision: 新增 cliInvoker 模組以 dependency injection 形式封裝 CLI subprocess invoke 對 main.ts 端的串接 與 Requirement: Main process registers the ai:invoke and consistency:dryRun IPC channels at startup。驗證：補一條整合測試斷言「啟動後 ipcMain.handle 註冊清單含 `ai:invoke`」由紅轉綠；console 不再出現「No handler registered for 'ai:invoke'」字串。

## 5. 驗收與守護

- [x] 5.1 執行 `pnpm test`：第 1 章紅燈測試全綠；既有測試集合（baseline 406 條，取 promote-equipment-to-first-class 完成時數量）不退化。驗證：CI 輸出 + 7 條左右、無 failed。
- [x] 5.2 執行 `pnpm typecheck`：本 change 範圍內無新 type 錯誤；preload 介面變更後 adapterBootstrap 與既有 mock 已對齊；僅剩 pre-existing `@types/eslint` 錯誤。驗證：typecheck 輸出僅含 pre-existing 錯誤。
- [ ] 5.3 手動實機驗收：執行 `pnpm electron:dev`；先到設定頁確認 cli.json 含 Codex CLI 或 Claude Code 有效路徑（或讓 cliDetector 自動偵測）→ 進入章節編輯按「給我建議」→ SuggestionPanel 顯示 CLI 真實回應（或跳 CliFallbackDialog）；console 不再出現「No handler registered for 'ai:invoke'」字串，落實 design 中 Behavior (observable) 第 1-6 條。驗證：截圖或 console log 附 PR description；同時驗證 CLI 路徑被人為破壞（rename codex 可執行檔）後再按按鈕應跳 CliFallbackDialog（Behavior 第 3 條）。
- [x] 5.4 對照 design.md「Implementation Contract」段落逐項打勾：「Behavior (observable)」六條皆通；「Interfaces / Data Shapes」cliInvoker／preload／adapterBootstrap／main.ts 四個介面對齊；「Failure modes」五條覆蓋；「Acceptance criteria」自動化測試與手動實機驗收清單全部達成；「Scope boundaries」全部 In Scope 完成、Out of Scope 未越界。驗證：PR description 引用本 checklist 並逐項標記。
