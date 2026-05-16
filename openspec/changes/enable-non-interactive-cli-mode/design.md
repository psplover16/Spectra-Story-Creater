## Context

`fix-windows-cli-shim-resolution` 修完後，`cliInvoker.invokeCli` 的 spawn 流程是：

```
invokeCli(source, input, deps)
  └─ dispatchSpawnArgs(cliPath)         ← Windows 對 .cmd/.bat 包 cmd.exe
        └─ { command, args }
  └─ spawnFn(command, args, { stdio: ['pipe','pipe','pipe'], env })
  └─ child.stdin.write(input.prompt)    ← prompt 從 stdin 餵
  └─ child.stdin.end()
```

實機驗證浮現新 bug：codex 子行程啟動後立刻退出，stderr 印 `Error: stdin is not a terminal`、exitCode = 1。原因：

- Codex CLI 與 Claude Code 預設都是 **interactive 模式**，啟動時偵測 stdin 是否為 TTY。
- Electron `child_process.spawn` 的 `stdio: ['pipe', ...]` 給的是 pipe，不是 TTY。
- 兩 CLI 各自提供 non-interactive 子命令 / 旗標：

| CLI | non-interactive 觸發 | stdin 接受 prompt？ |
|---|---|---|
| codex | `codex exec [PROMPT]` 子命令 | 是（`If not provided as an argument (or if - is used), instructions are read from stdin`，引自 `codex exec --help`） |
| claude | `claude -p` / `claude --print` 旗標 | 是（既有 `claude -p` 與 stdin pipe 用法兼容） |

當前 `dispatchSpawnArgs(cliPath)` 不接 source，無法加 source-specific 子命令。

## Goals / Non-Goals

**Goals:**

- 主行程 spawn 子行程時，args 帶 source-specific non-interactive 子命令（codex `exec`、claude `-p`），讓兩 CLI 接受 pipe stdin 並完成單次 prompt → response。
- 跨平台（Windows / macOS / Linux）一致：子命令加在 args 結尾，與既有 `cmd.exe /d /s /c <path>` 包裝邏輯正交。
- `dispatchSpawnArgs` 仍為純函式、可單測；測試覆蓋 2 source × 2 platform × 既有 wrapping 路徑 = 4 維交叉。
- 既有 `cliInvoker` 契約（成功路徑、三類錯誤、超時、`SPECTRA_AI_TIMEOUT_MS`）與既有 11 個測試案例零變動全綠。
- 既有 `register-ai-subprocess-handlers` 與 `fix-windows-cli-shim-resolution` 的 spec 契約不變。

**Non-Goals:**

- 不支援多輪互動式對話（single prompt → single response 契約不變）。
- 不引入 node-pty / ConPTY 等假 TTY 注入方案（不必要 + 跨平台複雜）。
- 不改 prompt 從 argv 傳（stdin 對特殊字元更安全）。
- 不處理 CLI 未登入錯誤（`codex login` / `claude login` 是使用者責任，未登入會自然冒泡為 `CliExecutionError(exitCode, stderr='Error: not logged in...')`）。
- 不擴展其他 CLI 旗標（`--model`、`--output-format`、`--max-budget-usd` 等留給未來）。

## Decisions

### Decision 1: codex 用 exec 子命令、claude 用 -p 旗標，stdin 仍為 prompt 通道

**選擇**：在 `dispatchSpawnArgs(cliPath, source)` 計算 args 時，依 source 在結尾追加：

| source | 追加內容 | 理由 |
|---|---|---|
| codex | `'exec'` | `codex exec` 是 codex CLI 官方文件明示的 non-interactive 子命令；省略 argv 時自動從 stdin 讀 prompt |
| claude | `'-p'` | `claude -p` 是 claude code CLI 官方旗標（`--print` 短形式）；與 stdin pipe 兼容 |

prompt 仍透過 `child.stdin.write(input.prompt)` + `child.stdin.end()` 餵入，不從 argv 傳。

**理由**：
- 兩 CLI 都明示支援「子命令 + stdin prompt」組合，最小變動實現 non-interactive。
- argv 傳 prompt 對含換行、引號、shell 元字元的內容會踩 quoting；stdin 是 byte stream 無此問題。
- 維持「prompt 走 stdin」與既有 spec scenario `成功路徑：mock spawn stdout=AI response、exit 0 → 回 AiInvokeResult.text=trimmed` 一致，零回歸。

**替代方案**：
- (A) prompt 從 argv 傳：`codex exec "<prompt>"` — 對長 prompt / 含特殊字元易踩 quoting，Reject。
- (B) node-pty 注入假 TTY：跨平台複雜（Windows 需 ConPTY），引入原生依賴，Reject。
- (C) codex / claude 用同一旗標：兩 CLI 設計不同，無共用旗標可用，Reject。

### Decision 2: 子命令加在 args 結尾，與 cmd.exe 包裝正交

**選擇**：`dispatchSpawnArgs` 計算順序為「先決定平台層 wrapping（Windows `.cmd` / `.bat` → cmd.exe），再無條件在 args 結尾 push source 子命令」。

具體形狀：

| Platform | cliPath | source | command | args |
|---|---|---|---|---|
| win32 | `C:\a\codex.cmd` | codex | `cmd.exe` | `['/d','/s','/c','C:\\a\\codex.cmd','exec']` |
| win32 | `C:\a\claude.cmd` | claude | `cmd.exe` | `['/d','/s','/c','C:\\a\\claude.cmd','-p']` |
| win32 | `C:\a\codex.exe` | codex | `C:\\a\\codex.exe` | `['exec']` |
| linux | `/usr/local/bin/codex` | codex | `/usr/local/bin/codex` | `['exec']` |
| linux | `/usr/local/bin/claude` | claude | `/usr/local/bin/claude` | `['-p']` |
| darwin | `/opt/homebrew/bin/codex` | codex | `/opt/homebrew/bin/codex` | `['exec']` |

**理由**：
- cmd.exe `/d /s /c <path>` 模式下，cmd.exe 把 `<path>` 後續的 args 原封不動傳給 `<path>` 指向的 batch；故 args 結尾追加子命令就會傳到實際 CLI 子行程。
- 純函式拼接、無平台特例分支爆炸（4 維交叉只多一條 source 維度，邏輯仍 O(1)）。
- 既有 `.exe` 與 POSIX 路徑只是少了 cmd.exe 那 4 個前綴元素，source 子命令位置不變。

**替代方案**：把 source 子命令放在 cliPath 前面 — 對 cmd.exe wrapping 無法成立（cmd.exe 第一個 arg 必須是 `/d`），Reject。

### Decision 3: 預設 timeout 從 30 秒提高到 120 秒

**選擇**：把 `electron/ai/cliInvoker.ts` 內 `DEFAULT_TIMEOUT_MS` 常數從 `30000` 改為 `120000`。`SPECTRA_AI_TIMEOUT_MS` 環境覆寫機制不變，使用者仍可顯式覆寫。

**理由**：apply 階段實機驗證 claude 觸發 30s timeout。獨立 PowerShell 模擬發現：短 prompt（"say hi in 3 words"）只需 3.8s。但 SuggestionPanel「給我建議」按鈕組裝的 prompt 含完整 context（章節、世界觀、角色），實際 LLM 處理時間遠超 30s。codex 同理。30s default 是 `register-ai-subprocess-handlers` 寫死的初值，是當時對「mock 測試」的合理估計，但對「真實 LLM call with full context」過於激進。120s 對應 LLM API SLA 上限附近（GPT-5.5 與 Claude 4.x 的 API call 在大 prompt 下 30~90s 是常態，極端可 110s+）。

**理由不擴 spec 既有 30000 寫死字面**：register-ai-subprocess-handlers spec 中 scenario `SPECTRA_AI_TIMEOUT_MS 環境變數覆寫預設 30000` 寫死 30000；本 change 在 spec 上新增一條 ADDED Requirement「default timeout SHALL be 120000ms」覆蓋（spec archive 順序：register-ai-subprocess-handlers 先 archive → ai-adapters 含 30000；本 change 後 archive → 新規範覆蓋成 120000）。若未來 register-ai-subprocess-handlers 不 archive 而本 change 先 archive，新 spec 直接成立、後者 archive 時手動 reconcile。

**替代方案**：
- (A) 不改 default、要使用者手動設 `SPECTRA_AI_TIMEOUT_MS=120000` — 對非開發者使用者門檻高（不知道哪設環境變數），Reject。
- (B) 改 default 為 60000 — 對含 context 的 prompt 仍可能不夠，再次踩坑，Reject。
- (C) 動態根據 prompt 大小算 timeout — 過度複雜（要量化「prompt 大小 → 預期回應時間」函數），Reject；YAGNI。

## Implementation Contract

**Behavior 觀察點**

- Windows + nvm4w + 已 `codex login` 與 `claude login` 的環境，使用者點「給我建議」分別觸發 codex 與 claude，主行程不再印 `Error: stdin is not a terminal`，SuggestionPanel 渲染出 AI 回應文字。
- macOS / Linux 環境同樣行為（POSIX 直接 spawn `<path>` + `[<subcmd>]`）。
- 既有所有 ai-adapters 契約（4 條 active requirements + register-ai-subprocess-handlers 的 cliInvoker 契約）行為不變。

**Interface / 資料形狀**

- `dispatchSpawnArgs(cliPath: string, source: AiSource) => { command: string; args: readonly string[] }`：簽章增 source 參數；輸出型別不變。
- `invokeCli(source, input, deps)` 對外簽章不變、`AiInvokeResult` 結構不變、三類錯誤拋出條件不變。內部把 `source` 透傳給 `dispatchSpawnArgs`。
- `spawnFn` 介面不變。
- prompt 流向不變：`child.stdin.write(input.prompt); child.stdin.end()`。

**Failure modes**

- CLI 子行程跑起來但回 non-zero：sterr 中含 CLI 自印錯誤訊息（如 `Error: not logged in`、`Error: invalid prompt`、`Error: rate limited` 等） → 既有 `child.on('close')` 路徑捕捉，拋 `CliExecutionError(source, exitCode, stderr.slice(0,200))`，**不再** 出現 `Error: stdin is not a terminal`（本 change 修掉的）。
- spawn 失敗（path 找不到、權限不足）→ 既有路徑捕捉，拋 `CliExecutionError(source, -1, ...)` 或 `CliUnavailableError(source)`。
- 超時 → 不變。
- CLI 未登入：本 change 不額外攔截，自然冒泡為 `CliExecutionError`，使用者看到 stderr 內 CLI 印的訊息。

**Acceptance 驗證**

- `tests/electron/ai/cliInvoker.test.ts` 新增以下案例皆綠：
  1. Windows + codex + `.cmd` → spawnFn 收 `command='cmd.exe', args=['/d','/s','/c',<path>,'exec']`
  2. Windows + claude + `.cmd` → spawnFn 收 `command='cmd.exe', args=['/d','/s','/c',<path>,'-p']`
  3. Windows + codex + `.exe` → spawnFn 收 `command=<path>, args=['exec']`
  4. POSIX + codex → spawnFn 收 `command=<path>, args=['exec']`
  5. POSIX + claude → spawnFn 收 `command=<path>, args=['-p']`
  6. prompt 仍經由 `child.stdin.write(input.prompt)` 餵入（既有「成功路徑」測試以注入 stdout 'AI response' 驗證 → 改 args 後仍綠）
- `npm test`（vitest 全套）維持全綠，無回歸（既有 448 個 case + 新加 5 個 = 453 個全綠）。
- 實機 end-to-end（使用者操作）：codex 與 claude 各按一次「給我建議」，SuggestionPanel 出 AI 文字。

**Scope 邊界**

- **In scope**：`electron/ai/cliInvoker.ts` 內部 `dispatchSpawnArgs` 簽章擴展與分發邏輯；`tests/electron/ai/cliInvoker.test.ts` 新增 5 案例。
- **Out of scope**：`electron/ai/cliDetector.ts`、`electron/ai/cliPathResolver.ts`、`electron/main.ts`、`electron/ipc/*.ts`、所有 `src/` (renderer)、所有 settings UI、prompt 內容組裝（context assembler 等）。

## Risks / Trade-offs

- **[Risk] codex / claude CLI 未來版本可能改 non-interactive 子命令 / 旗標名** → Mitigation：spec ADDED Requirement 明寫「source-specific 子命令」概念，實作（cliInvoker.ts）內常數集中放置（`CODEX_EXEC_SUBCMD = 'exec'`、`CLAUDE_PRINT_FLAG = '-p'`），未來換新版改一處即可。
- **[Risk] CLI 子命令對 stdout 格式可能不同** → Mitigation：實機驗證會抓到（output 不是預期文字會 fail 在 renderer 顯示階段）。既有 `cliInvoker` 對 stdout 做 `trim()` 後直接回，假設 CLI non-interactive 模式下純文字 stdout — 對 codex `exec` 與 claude `-p` 兩者皆成立（驗證後若有 ANSI / JSON 包裝需另開 change 處理）。
- **[Trade-off] 不從 argv 傳 prompt** → 接受：argv quoting 對特殊字元（換行、雙引號、`%var%`）易踩雷，stdin 是 byte stream 不踩；唯一犧牲是 process listing (`ps`) 看不到 prompt 內容，但這也是隱私正面副作用。
- **[Trade-off] 不引入 PTY** → 接受：本 change 場景就是 single-shot，不需要互動；引入 PTY 是「為了將來可能需要多輪對話」的過度設計（YAGNI）。
