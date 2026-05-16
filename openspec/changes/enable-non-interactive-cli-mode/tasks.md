## 1. 測試先行（紅燈，TDD）

- [x] 1.1 在 `tests/electron/ai/cliInvoker.test.ts` 補 source × platform × wrapping 4 維交叉的 spawn args 紅燈測試，覆蓋 spec「Main process MUST spawn AI CLI subprocesses with a source-specific non-interactive subcommand」與 design「Decision 1: codex 用 exec 子命令、claude 用 -p 旗標，stdin 仍為 prompt 通道」與「Decision 2: 子命令加在 args 結尾，與 cmd.exe 包裝正交」。必驗 6 案例對應 spec dispatch table 抽樣：(a) win32 + codex + `.cmd` → `cmd.exe` + `[/d,/s,/c,<path>,exec]`；(b) win32 + claude + `.cmd` → `cmd.exe` + `[/d,/s,/c,<path>,-p]`；(c) win32 + codex + `.exe` → `<path>` + `['exec']`；(d) linux + codex → `<path>` + `['exec']`；(e) darwin + claude → `<path>` + `['-p']`；(f) prompt 仍透過 `child.stdin.write` 餵入、argv 不含 prompt 字串。完成判定：所有「需改變的行為」案例（(a)~(e)）在當前 `cliInvoker.ts` 下紅燈失敗（驗 args 結尾尚未追加 source 子命令）；(f) 維持綠燈（既有 stdin 餵入邏輯未改）；既有 11 個 case 維持綠燈。

## 2. 實作（綠燈）

- [x] 2.1 修 `electron/ai/cliInvoker.ts` 的 `dispatchSpawnArgs`：擴展簽章為 `dispatchSpawnArgs(cliPath: string, source: AiSource): { command, args }`，在既有 cmd.exe wrapping / 直接 spawn 分支算完後，於 args 結尾無條件追加 source 子命令（`codex` → `'exec'`、`claude` → `'-p'`）。`invokeCli` 內呼叫處透傳 `source`。對齊 spec「Main process MUST spawn AI CLI subprocesses with a source-specific non-interactive subcommand」、design「Decision 1: codex 用 exec 子命令、claude 用 -p 旗標，stdin 仍為 prompt 通道」與「Decision 2: 子命令加在 args 結尾，與 cmd.exe 包裝正交」。常數集中宣告（如 `const CODEX_EXEC_SUBCMD = 'exec'`、`const CLAUDE_PRINT_FLAG = '-p'`）方便未來 CLI 版本變動時改一處。完成判定：1.1 紅燈案例全部由紅轉綠；既有 11 個案例維持綠燈；`electron/ai/cliInvoker.ts` 結尾無新增 export（純內部行為調整）。原始檔 UTF-8 無 BOM。

## 3. 整合驗證與回歸

- [x] 3.1 全測回歸：跑 `npm test`（vitest 全套），確認 cliInvoker 新加 6 案例 + 既有 11 案例 + 其他所有專案測試（cliDetector / cliPathResolver / services / integration / e2e 等共 ~448 個）零失敗。完成判定：terminal 顯示 `Test Files: <N> passed, 0 failed`，無新 skip、無新 todo。
- [x] 3.2 確認 dist-electron bundle 含新 args 邏輯：跑 `npx vite build` 重建 `dist-electron/main.cjs`，用 `grep -E "exec|'-p'"` 確認 codex 子命令字串與 claude 旗標字串都在 bundle 中（grep 命中 ≥ 1）。完成判定：grep 命中 ≥ 1（兩字串各至少一處）。

## 4. Timeout 預設值提升（fluid update — apply 階段實機驗證發現 30s 對含 context 的 prompt 不夠）

- [x] 4.1 補 cliInvoker.ts 新預設 timeout 紅燈測試：在 `tests/electron/ai/cliInvoker.test.ts` 新增 1 案例驗證 default timeout 為 120000ms（不帶 `timeoutMs` deps、不設 `SPECTRA_AI_TIMEOUT_MS` 環境變數，child 不 close → 用 `vi.useFakeTimers()` advance 121000ms 驗 rejection 為 `CliTimeoutError(timeoutMs=120000)`）。對齊 spec「Default ai:invoke timeout SHALL be 120 seconds」與 design「Decision 3: 預設 timeout 從 30 秒提高到 120 秒」。完成判定：測試在當前 `DEFAULT_TIMEOUT_MS=30000` 下紅燈失敗（30000 提前 timeout、實際 timeoutMs ≠ 120000）；既有 17 個 cliInvoker case 維持綠燈。
- [x] 4.2 改 `electron/ai/cliInvoker.ts:24` 的 `DEFAULT_TIMEOUT_MS` 從 `30000` 改為 `120000`。對齊 spec「Default ai:invoke timeout SHALL be 120 seconds」與 design「Decision 3: 預設 timeout 從 30 秒提高到 120 秒」。完成判定：4.1 紅燈轉綠；既有 17 個 cliInvoker case 維持綠燈；常數名稱不變（仍 `DEFAULT_TIMEOUT_MS`，僅值變更）。
- [x] 4.3 vite build 重建 bundle 並全測再回歸：跑 `npx vite build` + `npm test`。完成判定：dist-electron/main.cjs 重建成功、`Test Files: <N> passed, 0 failed`。

## 5. 實機 end-to-end 驗證

- [ ] 5.1 實機驗證 codex（使用者操作，非 CI）：確認當前機器已升級 codex CLI 至 ≥ 0.130.0 且 `codex login` → 關閉前次 electron dev server → 跑 `npm run electron:dev` → 開章節編輯點「給我建議」（source=codex）→ 觀察 (a) 主行程 console 無 `Error: stdin is not a terminal`；(b) SuggestionPanel 渲染出非空 AI 回應文字（任何具體內容皆通過，本任務不評文字品質）；(c) 主行程 console 若有其他錯誤訊息回貼。失敗則回填觀察到的錯誤訊息並重新檢視 2.1 / 4.2。
- [ ] 5.2 實機驗證 claude（使用者操作，非 CI）：在 5.1 之後，切換 source 為 claude，再點一次「給我建議」→ 觀察 (a) 無 `stdin is not a terminal`；(b) SuggestionPanel 渲染出非空 AI 回應；(c) 主行程 console 若有其他錯誤訊息回貼。預期 LLM 處理含 context 的 prompt 約需 30-90s，新 default timeout 120000ms 應充足。失敗則回填錯誤並重新檢視 2.1 / 4.2。
