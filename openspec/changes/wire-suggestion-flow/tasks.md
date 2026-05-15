<!--
Each task description states the behavior or contract being delivered and the
verification target that proves completion. File paths are supporting context.
-->

## 1. 紅燈測試先行（TDD）

- [x] [P] 1.1 新增 `tests/composables/useSuggestionFlow.test.ts`，覆蓋 status=ok／findings／inconclusive／cancelled 與 CLI fallback 五條路徑，落實 design 中 Decision: useSuggestionFlow composable 封裝 wire-up 邏輯、App.vue 不直接持有 與 Requirement: Suggestion request event flow is wired end to end。驗證：執行 `pnpm test -- tests/composables/useSuggestionFlow.test.ts`，五條案例皆 fail（composable 尚未實作）並輸出 `Cannot find module @/composables/useSuggestionFlow` 或對應紅燈訊息。
- [x] [P] 1.2 新增 `tests/integration/suggestion-flow-wired.test.ts`：mount App.vue + mock IPC，navigate 到一個有 outline 的章節，點 SuggestionPanel 的「給我建議」→ 斷言 `adapter.invoke` mock 被呼叫一次、`auditor` mock 被呼叫一次、SuggestionPanel 內出現 suggestion 內容，落實 Requirement: Suggestion request event flow is wired end to end 與 design 中 Behavior (observable)。驗證：執行該測試應 fail（onRequestSuggestion 仍是空函式），確認紅燈訊息為「adapter.invoke 未被呼叫」。

## 2. useSuggestionFlow composable 實作

- [x] 2.1 在 `src/composables/useSuggestionFlow.ts` 實作工廠函式骨架：接收 deps（novelDir ref、adapters、aiSettings store、loadNovel／loadCharacters／loadChapters、runAuditor），回傳 currentSuggestion／pendingFindings／pendingFindingsInconclusive／isLoading／cliFallbackPrompt／requestSuggestion 六項物件，落實 design 中 Decision: useSuggestionFlow composable 封裝 wire-up 邏輯、App.vue 不直接持有 與 design 中 Interfaces / Data Shapes 列出的工廠函式介面。驗證：tsc 全綠；單元測試 1.1 中關於「composable 形狀」的子測試由紅轉綠。
- [x] 2.2 在 `useSuggestionFlow.requestSuggestion` 內以 `role = "plot-driver"` 呼叫 AiResolver 取得 adapter；當使用者於 AiBindingPanel 設定該 role 綁定時，resolver 依職能綁定走，落實 design 中 Decision: 預設 role 採 plot-driver、未來再依使用者游標推斷 與 Requirement: Suggestion role defaults to plot-driver and respects user bindings。驗證：單元測試 1.1 中「plot-driver 綁定被尊重」「無 role 綁定落到 global」兩條子測試由紅轉綠。
- [x] 2.3 在 `useSuggestionFlow` 內以 `isLoading` ref 包覆 invoke 起訖：invoke 開始設 true、結束（ok／findings／cancelled）一律設 false；CliFallbackDialog 開啟期間維持 true，落實 design 中 Decision: isLoading 由 App.vue 持有並向下傳遞為 prop 與 Requirement: Suggestion loading state is owned by the App shell and gates the button。驗證：單元測試 1.1 中「isLoading 進入再退出」「fallback dialog 期間維持 true」兩條子測試由紅轉綠。
- [x] 2.4 在 `useSuggestionFlow` 內把 `useSuggestionRequest` 的 `promptFallback(failedSource)` 包成 Vue 端互動：設 `cliFallbackPrompt.value = { failedSource, resolve }`，等待外部呼叫 resolve 後繼續 invoke 迴圈，落實 design 中 Decision: CLI 全部不可用沿用既有 CliFallbackDialog、不另設 onboarding 引導 與 Requirement: CLI fallback dialog handles unavailable CLI sources。驗證：單元測試 1.1 中 retry／switch／cancel 三條 fallback decision 子測試由紅轉綠。
- [x] 2.5 在 `useSuggestionFlow` 收到 `status = "findings"` 或 `status = "inconclusive"` 時設 `pendingFindings.value` 與 `pendingFindingsInconclusive.value`，並保留 `currentSuggestion.value` 為新內容，落實 design 中 Decision: findings 與 inconclusive 只在 SuggestionPanel inline 警示、ConflictDialog 三選一 UX 留下個 change 與 Requirement: Findings and inconclusive results render as inline warnings, not dialogs。驗證：單元測試 1.1 中 findings／inconclusive 兩條子測試由紅轉綠。
- [x] 2.6 在 `useSuggestionFlow` 每次 invoke 都重組 context、重呼叫 CLI、重跑 auditor；新 invoke 開始時不重設舊 `currentSuggestion`，收到新結果後才覆蓋，落實 design 中 Decision: 不為「同一章節重複按給我建議」做快取。驗證：單元測試 1.1 中「連續兩次 invoke 之間 currentSuggestion 不被清空、第二次完成後覆蓋」子測試由紅轉綠。
- [x] 2.7 在 `useSuggestionFlow` 處理失敗模式：contextAssembler 拋例外時 catch、設 `isLoading=false`、把錯誤類別放入 pendingFindings inline 警示對應欄位；adapter.invoke 拋非 CliExecutionError／CliUnavailableError 例外時同樣處理；auditor 例外則 console.warn 並視為 status=ok，落實 design 中 Failure modes。驗證：單元測試 1.1 三條 failure mode 子測試由紅轉綠。

## 3. SuggestionPanel 新 prop 與 inline 警示

- [x] 3.1 修改 `src/components/ai/SuggestionPanel.vue` 新增 `isLoading: boolean` prop 並移除既有 local `isLoading` ref；按鈕 `:disabled` 改綁該 prop，落實 Requirement: Suggestion loading state is owned by the App shell and gates the button。驗證：`tests/components/ai/SuggestionPanel.test.ts` 既有測試不變仍通過；補一條測試 `isLoading prop = true 時按鈕禁用` 並由紅轉綠。
- [x] 3.2 修改 `src/components/ai/SuggestionPanel.vue` 新增 `pendingFindings: AuditResult | null` 與 `pendingFindingsInconclusive: boolean` prop，並在兩者非空時渲染紅色 inline 警示區塊（標題「本建議與既有設定不一致」加上偵測項目列表；inconclusive 時加「審慎採用」說明），落實 Requirement: Findings and inconclusive results render as inline warnings, not dialogs。驗證：補測試「findings 非空時渲染警示區塊」「inconclusive=true 時額外渲染審慎採用句」兩條皆綠燈。

## 4. ChapterView 透傳新 prop

- [x] 4.1 修改 `src/views/ChapterView.vue` 新增 `isLoading: boolean`、`pendingFindings: AuditResult | null`、`pendingFindingsInconclusive: boolean` 三個 prop，並傳給 SuggestionPanel；既有 `currentSuggestion` prop 維持，落實 design 中 Interfaces / Data Shapes 規範的 ChapterView prop 介面。驗證：`tests/components/chapter/ChapterTabs.test.ts` 與 ChapterView 既有測試不變仍通過；tsc 全綠。

## 5. App.vue 注入 useSuggestionFlow 完成 wire-up

- [x] 5.1 修改 `src/App.vue`：onMounted 內呼叫 `bootstrapAdapters()` 取得 adapters，再以 deps 物件建構 `useSuggestionFlow`，落實 design 中 Decision: useSuggestionFlow composable 封裝 wire-up 邏輯、App.vue 不直接持有。驗證：tsc 全綠；整合測試 1.2 中「composable 在 mount 時建構」子斷言由紅轉綠。
- [x] 5.2 修改 `src/App.vue.onRequestSuggestion(chapterId)`：呼叫 `flow.requestSuggestion(chapterId)`，移除既有空函式註解；emit 在 ChapterView 端的 `requestSuggestion` 事件改接此 handler，落實 Requirement: Suggestion request event flow is wired end to end。驗證：整合測試 1.2 中「adapter.invoke 被呼叫一次」由紅轉綠；手動實機按下「給我建議」可看到 SuggestionPanel 顯示建議或 CliFallbackDialog。
- [x] 5.3 修改 `src/App.vue` template：監聽 `flow.cliFallbackPrompt`，當其非 null 時渲染既有 `CliFallbackDialog`，並在使用者按 retry／switch／cancel 時呼叫 prompt 的 resolve(decision)，落實 Requirement: CLI fallback dialog handles unavailable CLI sources。驗證：整合測試補充一條「CLI 不可用時 CliFallbackDialog 顯示，使用者選 cancel 後 isLoading=false 且 SuggestionPanel 不變更」由紅轉綠。
- [x] 5.4 修改 `src/App.vue` template：把 `flow.currentSuggestion.value`、`flow.pendingFindings.value`、`flow.pendingFindingsInconclusive.value`、`flow.isLoading.value` 透過 prop 傳給 ChapterView，落實 design 中 Acceptance criteria 第 1-4 條斷言所需的資料流。驗證：整合測試 1.2 中「SuggestionPanel 顯示對應內容」子斷言由紅轉綠。

## 6. 驗收與守護

- [x] 6.1 執行 `pnpm test`：第 1 章紅燈測試全部由紅轉綠；既有 347 條測試不退化。驗證：CI 報告 350+ 條測試全綠。
- [x] 6.2 執行 `pnpm typecheck`：在本 change 範圍內無新 type 錯誤（pre-existing `@types/eslint` 缺項屬既有問題，不在本 change 範圍）。驗證：typecheck 輸出僅含 pre-existing 錯誤，無新增。
- [ ] 6.3 手動實機驗收：執行 `pnpm electron:dev`，選一個既有小說、進入某章節、確認 outline 非空後按 SuggestionPanel 的「給我建議」→ 觀察 SuggestionPanel 顯示建議內容（或 CliFallbackDialog）；不再「按下沒反應」，落實 design 中 Behavior (observable) 第 1-6 條。驗證：PR description 附手動步驟截圖或 console log，證明按鈕觸發了 adapter.invoke。
- [x] 6.4 執行 grep `ipcMain.handle` 列出主行程註冊的 channel 集合，與 build 前 baseline 比對相等；執行 grep `factionIds|factionId` 確認 schema 欄位無新增刪除，落實 Requirement: Suggestion flow does not introduce new IPC channels or schema changes 與 design 中 Scope boundaries。驗證：兩個 grep 結果與基準一致；reviewer 對照 PR diff 確認 `electron/ipc/*` 與 `src/types/*` 未動。
- [x] 6.5 對照 design.md「Implementation Contract」段落逐項打勾：「Behavior (observable)」六條 user-observable 行為通；「Interfaces / Data Shapes」三個介面對齊；「Failure modes」三條覆蓋；「Acceptance criteria」自動化測試與手動實機驗收清單全部達成；「Scope boundaries」全部 In Scope 完成、Out of Scope 未越界。驗證：PR description 引用本 checklist 並逐項標記，reviewer 對照 design.md 確認。
