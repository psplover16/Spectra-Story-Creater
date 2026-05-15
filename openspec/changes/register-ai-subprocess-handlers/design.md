## Context

`wire-suggestion-flow` change 把渲染端「給我建議」按鈕一路串到 `useSuggestionRequest.invoke` → adapter.invoke → `window.api.ai.invoke`，並在 proposal 與 design 寫「沿用既有 ai:invoke IPC channel」。實機按按鈕後失敗，console 出現 `Error: No handler registered for 'ai:invoke'`。

實際盤點主行程端發現：

- `electron/ipc/aiHandlers.ts` 已實作 `registerAiHandlers(ipc, deps)` 與 `createAiHandlers(deps)` 框架。
- `electron/main.ts.registerAllHandlers` 註冊了 workspace／novel／character／chapter／faction／equipment／export／settings／dialog 共九組 handler，**沒呼叫 `registerAiHandlers`**。
- 沒有任何模組提供 `deps.invoke(source, input)` 實作；`electron/ai/cliDetector.ts` 只偵測 CLI 可執行檔路徑，`electron/spawn.ts` 只提供 env helper，兩者都不負責實際 spawn AI 子行程並收 response。
- `electron/preload.ts` 的 `ai.invoke` 簽名是 `(input)` 一個參數；`createRendererAdapter` 也只傳 input。但 main handler 預期 `(source, input)` 兩參數——介面對不上。

`useSuggestionRequest.invoke` 的 catch 只認 `CliUnavailableError` 與 `CliExecutionError`，普通 Error 會被 re-throw，最終被 useSuggestionFlow 外層吞掉，UI 表現為「按鈕無反應」。

設計階段已對齊：本 change 範圍是「補完 ai-adapters 主行程鏈」；不新增 capability；不引入新 IPC channel；CLI 子行程透過 Node child_process.spawn；timeout 30 秒可由環境變數覆寫；preload 介面對齊兩參數。

## Goals / Non-Goals

**Goals:**

- `ai:invoke` IPC channel 真實連通到 CLI 子行程；renderer 端按下「給我建議」後主行程實際 spawn Codex CLI 或 Claude Code 子行程並回傳 stdout 內容。
- 錯誤分類精準：CLI 找不到 → CliUnavailableError；exit code 非 0 → CliExecutionError（含 stderr 前 200 字元）；超時 → CliTimeoutError。
- preload 介面與 main handler 簽名對齊兩參數（source, input）。
- 主行程實作走 dependency injection 介面，可被單元測試以 mock spawnFn 覆蓋。
- 不破壞 wire-suggestion-flow／character-equipment-effects／promote-equipment-to-first-class 三個 change 的既有行為與測試。

**Non-Goals:**

- 不引入新 IPC channel；只 register 既有 `ai:invoke` 與 `consistency:dryRun`。
- 不改 renderer 端 useSuggestionRequest／useSuggestionFlow／SuggestionPanel／CliFallbackDialog wire-up。
- 不改 AiResolver 四層 fallback 行為。
- 不為兩個 CLI 各自的 prompt flag 或 JSON 輸出模式做分支；本 change 一律 stdin pipe / stdout plain text。
- 不支援 streaming response；一次性收完整 stdout。
- 不為 CLI 失敗的「自動切換」做設計；既有 CliFallbackDialog 已涵蓋 retry／switch／cancel。
- 不變更 character／chapter／faction／worldview／equipment schema 或對應 capability。
- 不對 prompt 內容做加密或 redaction；redaction 由 src/services/ai/redact.ts 既有負責。
- 不為「prompt 過長壓縮」「token 計算」「上下文剪裁」做設計；屬 ai-context 既有 budget 範圍。

## Decisions

### Decision: 新增 cliInvoker 模組以 dependency injection 形式封裝 CLI subprocess invoke

新模組 `electron/ai/cliInvoker.ts` 匯出 `invokeCli(source, input, deps)` 函式。`deps` 為：

- `getCliPath(source: AiSource): Promise<string | null>` — 從 cli.json 或 cliDetector 取得 CLI 路徑。
- `spawnFn(cmd, args, options): ChildProcessWithoutNullStreams` — 預設為 `child_process.spawn`，測試時可注入 mock。
- `timeoutMs: number` — 預設 30000；可由 `SPECTRA_AI_TIMEOUT_MS` 環境變數覆寫。

`invokeCli` 內部流程：

1. `await deps.getCliPath(source)` 取得 cliPath；為 null 時 throw `CliUnavailableError(source)`。
2. spawn cliPath 子行程，env 用 `buildSpawnEnv()`；stdin/stdout/stderr 全為 pipe。
3. 把 `input.prompt` 寫進 stdin 然後 `stdin.end()`。
4. 累積 stdout 直到 close；累積 stderr 同步。
5. 套用 timeout：`setTimeout(timeoutMs, () => { child.kill('SIGTERM'); reject CliTimeoutError })`。
6. close 後判斷 exitCode：0 → resolve `{ text: stdout.trim(), source, durationMs }`；非 0 → reject `CliExecutionError(source, exitCode, stderr.slice(0, 200))`。

替代方案：

- 替代方案 1（把 invoke 邏輯直接寫進 aiHandlers.ts）被拒：aiHandlers 是 IPC 註冊邊界，與「實際呼叫 CLI」邊界混合會讓單元測試難以 mock。
- 替代方案 2（用 execFile 而非 spawn）被拒：execFile 不支援 stdin pipe；長 prompt 須走 argv 容易超過 OS 上限。
- 替代方案 3（不注入 spawnFn、直接 import `child_process.spawn`）被拒：單元測試需要 mock subprocess，dependency injection 比 vi.mock 整個模組更乾淨。

### Decision: preload 與 adapterBootstrap 對齊兩參數簽名 (source, input)

preload `ai.invoke` 由 `(input)` 改為 `(source: AiSource, input: AiInvokeInput)`。adapterBootstrap 的 `createRendererAdapter(source)` 在內部呼叫時補上 source：`window.api.ai.invoke(source, input)`。

替代方案：

- 替代方案 1（preload 仍只收一個參數，把 source 塞進 input）被拒：型別污染；input 是 `{ context, prompt, role }` 三欄，多加 source 不符合 AiInvokeInput 介面語意。
- 替代方案 2（main handler 改為一參數，從 input.role 或自己決定 source）被拒：source 是 renderer 端 resolver 計算結果（含四層 fallback 命中層級），main 端不應重新解析；違反單一責任。

### Decision: CLI 路徑取得順序 cli.json → cliDetector

`getCliPath(source)` 流程：

1. 讀 `app.getPath('userData')/cli.json`（既有 cliSettingsRepository.readCliSettings）。
2. 若 cli.json 含 codex／claude 對應欄位且 `fs.access` 該路徑成功 → 回該路徑。
3. 否則跑 `cliDetector.detectCli(source)`，找到 → 回路徑。
4. 全部失敗 → 回 null。

替代方案：

- 替代方案 1（每次都重 detectCli）被拒：detectCli 內部 spawn `where` / `which`，每次 invoke 跑一次 spawn 浪費；既有 fs.access revalidate 機制已能偵測檔案被移除的情境。
- 替代方案 2（cli.json 找不到時直接 throw，由 UI 負責先到設定頁配置）被拒：使用者可能誤刪 cli.json；cliDetector fallback 較友善。

### Decision: 30 秒 timeout 預設、SPECTRA_AI_TIMEOUT_MS 環境變數覆寫

預設 30000ms；可由 `process.env.SPECTRA_AI_TIMEOUT_MS`（parse 為整數）覆寫。

替代方案：

- 替代方案 1（更長預設值如 120 秒）被拒：使用者體驗較差；長 timeout 期間 UI 無回饋；30 秒夠涵蓋多數 prompt。
- 替代方案 2（無 timeout）被拒：CLI 子行程可能 hang，主行程吃資源；UI 無限期 isLoading。

### Decision: stdin 一次性寫入 prompt、stdout 累積後 trim 為 response.text

prompt 完整字串透過 `child.stdin.write(prompt)` 一次性寫入後 `child.stdin.end()` 關閉 input。stdout 用 `data` event 累積至 buffer，close 後 `buffer.toString('utf-8').trim()` 視為 response text。

替代方案：

- 替代方案 1（streaming 即時 yield）被拒：本 change 範圍小，使用者目前不需要 streaming 體驗；留 follow-up。
- 替代方案 2（用 tmp file 寫 prompt 再傳 path）被拒：增加檔案 I/O 與 cleanup 風險；CLI 多支援 stdin 模式；stdin pipe 較單純。

### Decision: stderr 內容於失敗時併入 CliExecutionError 訊息

CLI exit code 非 0 時，把 stderr 內容（最多 200 字元）併入 `CliExecutionError(source, exitCode, stderr)`。renderer 端 useSuggestionRequest 的 catch 已能識別 CliExecutionError 並走 promptFallback 流程，使用者看 CliFallbackDialog 即可決定 retry / switch / cancel。

替代方案：

- 替代方案 1（成功時也保留 stderr 寫 log）被拒：本 change 範圍不含 log infrastructure；stderr 上下文留 follow-up。
- 替代方案 2（stderr 直接顯示在 UI）被拒：CLI stderr 通常技術細節重；UI 顯示應走 redaction 與摘要。

## Implementation Contract

### Behavior (observable)

1. 使用者按 SuggestionPanel 的「給我建議」按鈕，主行程 spawn 對應 CLI 子行程（Codex CLI 或 Claude Code，依 AiResolver 決定的 source）。
2. CLI 成功（exit code 0）回應後 SuggestionPanel 顯示 CLI 真實 stdout 內容。
3. CLI 路徑找不到時：主行程透過 IPC 反向回傳 CliUnavailableError；renderer 端 useSuggestionRequest 進入 promptFallback → cliFallbackPrompt 設值 → App.vue 顯示 CliFallbackDialog；使用者可選 retry／switch／cancel。
4. CLI exit code 非 0 時：主行程回傳 CliExecutionError（含 source、exitCode、stderr 前 200 字元）；renderer 端進入 CliFallbackDialog。
5. CLI 子行程運行超過 timeoutMs：主行程 kill 子行程並回傳 CliTimeoutError；renderer 端進入 CliFallbackDialog。
6. console（主行程或渲染端）不再出現 `Error: No handler registered for 'ai:invoke'` 字串。

### Interfaces / Data Shapes

**新增模組**：`electron/ai/cliInvoker.ts`

匯出：

    export interface CliInvokerDeps {
      getCliPath: (source: AiSource) => Promise<string | null>
      spawnFn?: typeof spawn  // 預設 child_process.spawn
      timeoutMs?: number       // 預設 30000，可由 SPECTRA_AI_TIMEOUT_MS 覆寫
    }

    export async function invokeCli(
      source: AiSource,
      input: AiInvokeInput,
      deps: CliInvokerDeps,
    ): Promise<AiInvokeResult>

**修改 preload**：`electron/preload.ts` 內 `ai.invoke` 簽名

    invoke: (source: AiSource, input: AiInvokeInput) =>
      ipcRenderer.invoke('ai:invoke', source, plain(input))

**修改 adapterBootstrap**：`src/services/bootstrap/adapterBootstrap.createRendererAdapter` 內呼叫

    const result = await invoke(source, input)

其中 source 取自外層閉包持有的 AiSource。

**修改 main.ts**：`registerAllHandlers` 加

    registerAiHandlers(ipcMain, {
      invoke: (source, input) =>
        invokeCli(source, input, {
          getCliPath: async (s) => resolveCliPath(s),  // cli.json → cliDetector fallback
        }),
    })

`resolveCliPath` 是 main.ts 內部 helper，串接 cliSettingsRepository 與 cliDetector。

### Failure modes

- CLI 路徑 cli.json 與 cliDetector 都找不到：throw `CliUnavailableError(source)`；handler 經 IPC 反序列化為 Error 並傳回 renderer；renderer 端 useSuggestionRequest 識別後走 promptFallback。
- spawn 失敗（例如 cliPath 存在但不可執行）：spawn 立刻拋 ENOENT/EACCES → invokeCli 內 try-catch 包成 `CliExecutionError(source, -1, err.message)`。
- stdout 為空：trim 後是空字串；視為合法 response（不丟錯），renderer 端 SuggestionPanel 顯示空 actionableSuggestion，auditor 跑空字串依其邏輯處理。
- stderr 內含敏感資訊：CliExecutionError 取 stderr 前 200 字元已限制長度；不另做 redaction（後續可在 errors.ts 加 sanitizer）。
- IPC handler 內 deps.invoke throw：handler 內不額外 catch；exception 自動傳給 renderer 端 ipcRenderer.invoke 的 reject。

### Acceptance criteria

- 單元測試 `tests/electron/ai/cliInvoker.test.ts`：
  - 成功路徑：mock spawnFn 模擬子行程 stdout 寫入 "AI response" 後 exit 0 → invokeCli 回傳 `{ text: 'AI response', source, durationMs }`。
  - CLI 不可用：deps.getCliPath 回 null → throw CliUnavailableError。
  - exit code 非 0：mock spawnFn stderr 寫入 "boom"、exit 1 → throw CliExecutionError 含 exitCode=1 與 stderr 內容。
  - timeout：mock spawnFn 不 close → 經 timeoutMs 後 throw CliTimeoutError；spawnFn 的 kill 被呼叫。
  - 環境變數覆寫：設 `process.env.SPECTRA_AI_TIMEOUT_MS = '100'` → invokeCli 內 timeout 走該值。
- 整合測試補一條：main.ts 啟動後 grep `ipcMain.handle` 註冊清單必含 `ai:invoke`（透過 mock ipcMain 注入驗證）。
- 既有 `tests/services/bootstrap/adapterBootstrap.test.ts` 對 mock `window.api.ai.invoke` 的呼叫斷言改為兩參數 `(source, input)`。
- 既有測試集合 406 條（promote-equipment-to-first-class 完成時 baseline）不退化。
- 手動實機：執行 `pnpm electron:dev`，確認 cli.json 含可用 Codex CLI 或 Claude Code 路徑，按「給我建議」→ SuggestionPanel 顯示 CLI 回應或跳 CliFallbackDialog；console 不出現 ai-invoke handler missing 錯誤。

### Scope boundaries

**In scope**：

- 新增 `electron/ai/cliInvoker.ts` 與 mock-spawn 單元測試。
- 修改 `electron/main.ts` 加 `registerAiHandlers` 並注入 `invokeCli` 為 deps.invoke。
- 修改 `electron/preload.ts` 與 `src/services/bootstrap/adapterBootstrap.ts` 對齊兩參數簽名。
- 修改 `tests/services/bootstrap/adapterBootstrap.test.ts` mock 端對齊。
- `resolveCliPath` helper 內 cli.json → cliDetector fallback 邏輯。
- 30 秒 timeout 預設與 SPECTRA_AI_TIMEOUT_MS 覆寫支援。

**Out of scope**：

- 渲染端任何 wire-up 變更（useSuggestionRequest／useSuggestionFlow／SuggestionPanel／CliFallbackDialog）。
- AiResolver 四層 fallback 行為。
- AI prompt 內容調整、token 預算、streaming response。
- 兩個 CLI 各自的特定 flag、JSON 輸出模式。
- stderr 寫 log 檔。
- redaction 邏輯（保留 src/services/ai/redact.ts 既有負責）。
- character／chapter／faction／worldview／equipment schema 與對應 capability。

## Risks / Trade-offs

- [stdin pipe 模式對某些 CLI 不友善（要求 TTY）] → 使用者實機回報後可加 fallback：argv flag 或 tmp file；本 change 先用 stdin pipe，留 Open Questions。
- [30 秒 timeout 對長 prompt 不夠] → SPECTRA_AI_TIMEOUT_MS 環境變數可覆寫；後續實機累積數據後再調預設。
- [stderr 內含使用者隱私資訊（路徑、檔案內容）被併入 CliExecutionError] → slice 200 字元限長度；redaction 留 follow-up。
- [cli.json fs.access 通過但 CLI 損壞] → 第一次 spawn 失敗時 ENOENT/EACCES 被包成 CliExecutionError；使用者看 CliFallbackDialog 知道哪個 source 壞。
- [Windows code page 950 干擾] → 既有 buildSpawnEnv 已強制 SPECTRA_CHCP=65001、PYTHONIOENCODING=utf-8 等；本 change 沿用。

## Migration Plan

- 不涉及資料遷移；既有檔案格式不變。
- 部署：vite 重 build 後 dist-electron/preload.cjs 與 main.cjs 同步更新；vite-plugin-electron 偵測到 main/preload 變動會自動重啟主行程。
- 回退：revert 本 change commits 即可；renderer 端 adapterBootstrap.createRendererAdapter 內呼叫 `window.api.ai.invoke(source, input)` 回退為 `window.api.ai.invoke(input)`；preload 同步 revert；main.ts 移除 registerAiHandlers。回退後行為回到「按按鈕沒效果」狀態。

## Open Questions

- 兩個 CLI（Codex CLI、Claude Code）實際的 stdin pipe 模式對長 prompt（>10KB）行為是否一致？需實機測試。
- 30 秒 timeout 對 plot-driver 預設 role 的 prompt 是否足夠？累積數據後再調。
- 是否在 follow-up change 中加 invocation log（含 prompt、response、duration）寫到 `<novel>/ai-log.jsonl`？屬 ai-adapters 增強範圍。
- 是否要為 cli.json 路徑被 fs.access 通過但實際失效（檔案被替換為非執行檔）的情境，加一層 spawn 前的「快速 health check」（如 `--version` invoke）？目前依賴第一次正式 invoke 失敗時的 CliExecutionError 兜底。
