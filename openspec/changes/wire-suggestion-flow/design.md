## Context

本專案 `build-novel-app-v1` 與 `wire-novel-app-shell` 兩個 change 共同完成了「AI 子行程鏈」的各個部件，但「給我建議」按鈕從來沒有在 production code 路徑被串通：

- `src/composables/useSuggestionRequest.ts` 已實作 invoke + auditor + CLI fallback 三段流程。
- `src/services/ai/aiResolver.ts`、`src/services/ai/contextAssembler.ts`、`src/services/consistency/auditor.ts`、`src/services/bootstrap/adapterBootstrap.ts` 皆已實作。
- `src/components/ai/CliFallbackDialog.vue` 已實作。
- 但 `src/App.vue` 的 `onRequestSuggestion(_chapterId)` 只有一行註解、沒掛任何邏輯；`src/main.ts:18` 的 `bootstrapAdapters()` 只建立 adapter 物件並可能改 global default、從未把任何控制權注入到 ChapterView 的事件流。
- `src/views/ChapterView.vue` 的 `:current-suggestion` prop 從 App.vue 始終收到 undefined，因為 App.vue 沒持有 `currentSuggestion` ref。
- 整套部件只在 `tests/e2e/golden-path.test.ts` 用 import 手工拼裝跑得起來，使用者實機按下按鈕沒任何事發生。

propose 階段已對齊：預設 role 採 plot-driver；findings／inconclusive 時只在 SuggestionPanel 顯示 inline 警示，ConflictDialog 三選一 UX 留待另一個 change；CLI 全部不可用沿用既有 CliFallbackDialog；invoke 期間 isLoading 提到 App.vue 由 SuggestionPanel 接收為 prop。

## Goals / Non-Goals

**Goals:**

- 使用者按下 ChapterView 內 SuggestionPanel 的「給我建議」後，renderer 端確實呼叫 AI 子行程、跑過 auditorDryRun、把結果回填 SuggestionPanel；按下按鈕到看到回應（或警示／fallback dialog）之間不需要任何後續手動操作即可看到結果。
- App.vue 不直接持有 resolver／contextAssembler／auditor／fallback 控制邏輯；這些邏輯封裝在新 composable `useSuggestionFlow`，App.vue 只負責 mount 時建構與向下傳遞。
- 結果分支明確：status=ok 顯示建議；status=findings／inconclusive 同時顯示建議文字與 inline 警示列表；status=cancelled 收回 SuggestionPanel；CLI 全部不可用走 CliFallbackDialog 三選一（retry／switch／cancel）。
- 流程串通必須有自動化測試覆蓋，避免 production code「按鈕沒效果」的回歸再次發生。

**Non-Goals:**

- 不引入 ConflictDialog（rewrite／改設定／忽略 三選一 UX）；該 UX 留待另一個 change。
- 不新增任何 IPC channel；沿用既有 `ai:invoke`、`novel:read`、`character:list`、`chapter:list`。
- 不變更任何 schema。
- 不新增 capability。
- 不為 `useSuggestionRequest` 補 timeout 或使用者中斷 cancel button；CLI 子行程自身已有 timeout，timeout 行為屬於 `ai-adapters` 範圍。
- 不依使用者游標所在欄位推斷 role；統一用 plot-driver 作為預設。
- 不修改 SuggestionPanel 的按鈕命名／佈局／樣式；只新增 isLoading prop 與 inline 警示區塊。
- 不變更 useSuggestionRequest 的對外 API。

## Decisions

### Decision: 預設 role 採 plot-driver、未來再依使用者游標推斷

「給我建議」按鈕觸發 AI 請求時，傳入 resolver 的 query.role 採 plot-driver。當使用者已於 AiBindingPanel 設定該 role 的職能綁定時，resolver 依職能綁定走；未設時依 resolver 既有四層 fallback（段落→職能→角色→全域）落到全域預設。

替代方案：

- 替代方案 1（outline-assistant）被拒：使用者按「給我建議」時最常希望的是劇情該往哪推、下一段該寫什麼，與 plot-driver 語意對齊；outline-assistant 較適合「幫我把這幾章排個大綱」這類更全域的請求。
- 替代方案 2（依游標所在欄位推斷）被拒：需 ChapterEditor 暴露 focus state、SuggestionPanel 知道目前 focus 在 outline 還是 content；本 change 範圍內過於複雜，且使用者可自行透過職能綁定 UI 覆寫 role 對應的 CLI source，達到類似效果。

### Decision: useSuggestionFlow composable 封裝 wire-up 邏輯、App.vue 不直接持有

新增 `src/composables/useSuggestionFlow.ts`，回傳：

- currentSuggestion: Ref of SuggestionContent or null
- pendingFindings: Ref of AuditResult or null
- isLoading: Ref of boolean
- cliFallbackPrompt: Ref of CliFallbackPromptState or null（含 failedSource 與 resolve callback）
- requestSuggestion(chapterId): Promise of void

composable 在工廠函式參數接收：novel／character／chapter loader、aiSettings store、adapters map、auditor 函式。實際 invoke 走 useSuggestionRequest。App.vue 在 onMounted 內呼叫 `bootstrapAdapters()` 並建構 useSuggestionFlow，把 currentSuggestion／isLoading／requestSuggestion handler 透過 prop 與 event 傳給 ChapterView。

替代方案：

- 替代方案 1（直接在 App.vue 寫所有 wire-up）被拒：App.vue 已 312 行，加入 5+ 個部件的注入會使其膨脹超過 400 行，違反可讀性。
- 替代方案 2（用 Pinia store 持有 suggestion state）被拒：suggestion 是 chapter-scoped 的 transient state、不需跨頁面共用；store 化會引入不必要的全域可見性。

### Decision: findings 與 inconclusive 只在 SuggestionPanel inline 警示、ConflictDialog 三選一 UX 留下個 change

當 `useSuggestionRequest.invoke` 回傳 status=findings 或 status=inconclusive 時：

- SuggestionPanel 顯示 AI 產出的 text 與 source／hitLayer badge，與 status=ok 一致。
- 額外顯示紅色 inline 警示：標題「本建議與既有設定不一致」加上 findings 列表（每條偵測項目的 detector type 與描述）；inconclusive 額外顯示「部分偵測無法確定，請審慎採用」說明。
- 不彈出 dialog；使用者可繼續操作其他按鈕（再按「給我建議」、儲存、切章節）。

替代方案：

- 替代方案 1（彈 ConflictDialog 三選一）被拒：本 change 範圍會擴張到 character／world／faction 修改 UI 與 rewrite 流程，估計增加 50% tasks；ConflictDialog 屬於 consistency-audit capability 的範圍，更適合在獨立 change 處理。
- 替代方案 2（findings 時直接拒絕顯示建議）被拒：使用者 LLM 體驗會變差；建議文字本身仍有參考價值，警示只是輔助判斷。

### Decision: CLI 全部不可用沿用既有 CliFallbackDialog、不另設 onboarding 引導

useSuggestionRequest 內部已透過 `promptFallback(failedSource)` callback 處理 CLI 不可用情境。本 change 把 promptFallback 包成 Vue 端互動：useSuggestionFlow 設 `cliFallbackPrompt.value = { failedSource, resolve }`、App.vue 監聽該 ref 顯示既有 CliFallbackDialog；使用者按下選項後呼叫 `resolve(decision)` 把 Promise 解開繼續 invoke 迴圈。

- decision=retry：重試同一個 source（CLI 自我恢復場景）。
- decision=switch：useSuggestionRequest 內部切到另一個 source 重試。
- decision=cancel：useSuggestionRequest 回傳 status=cancelled，useSuggestionFlow 收回 SuggestionPanel（將 currentSuggestion 重設、isLoading 設 false）。

不額外顯示「請先在設定頁配置 CLI」onboarding 提示；CliFallbackDialog 文案已涵蓋。

替代方案：

- 替代方案 1（CLI 全失敗時跳 SettingsView）被拒：強制路由切換違反 modal dialog 慣例；既有 CliFallbackDialog 已給使用者 retry／switch／cancel 控制權。
- 替代方案 2（自動 fallback 不問使用者）被拒：CLAUDE.md 與 README #7 明確要求「不自動 fallback：CLI 不可用時跳 dialog 讓使用者選 retry／switch／cancel」。

### Decision: isLoading 由 App.vue 持有並向下傳遞為 prop

useSuggestionFlow 持有 isLoading: Ref of boolean，App.vue 在 mount 時建構後把該 ref 的 value 透過 `:is-loading` prop 傳給 ChapterView，ChapterView 再傳給 SuggestionPanel。SuggestionPanel 內既有的 local isLoading ref 移除、改用 prop。

- invoke 開始時：isLoading.value 設 true、「給我建議」按鈕加上 disabled 屬性。
- invoke 結束時（不論 ok／findings／cancelled）：isLoading.value 設 false、按鈕恢復可點。
- CliFallbackDialog 期間：isLoading 維持 true，避免使用者再按一次「給我建議」進入第二條 invoke 迴圈。

替代方案：

- 替代方案 1（SuggestionPanel 內部自己持有 isLoading）被拒：目前實作就是這樣，但 SuggestionPanel 的 isLoading 在 emit request 後立刻設回 false、沒有等到實際 invoke 完成；改成由 App.vue 持有可避免這個 race。
- 替代方案 2（用 Promise 物件直接給 SuggestionPanel）被拒：跨多層 component 傳 Promise 不直觀，prop boolean 最簡。

### Decision: 不為「同一章節重複按給我建議」做快取

每次按下「給我建議」都會走完整 invoke 流程（重組 context、重呼叫 CLI、重跑 auditor），不快取上次結果。currentSuggestion 在新 invoke 開始時暫不重設（保留上次結果讓使用者比較），收到新結果後覆蓋。

替代方案：

- 替代方案 1（同章節內快取 24 小時或 N 次內）被拒：使用者意圖按按鈕就是想要新的建議；快取會違反直覺；且每次 chapter content 都可能變動。
- 替代方案 2（每次新 invoke 立刻清空 currentSuggestion）被拒：使用者可能想對照新舊建議；保留上次直到新結果回填較友善。

## Implementation Contract

### Behavior (observable)

使用者在 ChapterView 內按 SuggestionPanel 的「給我建議」按鈕後：

1. 按鈕立刻變灰並維持灰直到流程結束（loading 期間不可重複觸發）。
2. resolver 依使用者於 AiBindingPanel 的設定挑選 CLI source（職能綁定優先、否則全域預設）；source 可用時自動進入 invoke。
3. CLI 不可用時跳 CliFallbackDialog；使用者選 retry／switch／cancel 後依該選擇繼續。
4. invoke 成功並通過 auditorDryRun：SuggestionPanel 顯示建議內容與 source badge。
5. invoke 成功但 auditorDryRun 回 findings／inconclusive：SuggestionPanel 同時顯示建議內容與紅色 inline 警示（findings 標題加偵測項目列表；inconclusive 額外顯示「審慎採用」）。
6. CliFallbackDialog 選 cancel：SuggestionPanel 收回 currentSuggestion 顯示，按鈕恢復可點，無錯誤訊息。

### Interfaces / Data Shapes

**新增 composable**：`src/composables/useSuggestionFlow.ts`

工廠函式接收 deps 物件：novelDir ref、adapters map（codex 與 claude）、aiSettings store、loadNovel／loadCharacters／loadChapters 三個 async loader、runAuditor 同步函式。回傳物件含 currentSuggestion ref、pendingFindings ref、pendingFindingsInconclusive ref、isLoading ref、cliFallbackPrompt ref、requestSuggestion(chapterId) async 函式。

**App.vue 新增資料流**：

- onMounted 內 `const flow = useSuggestionFlow({ ... })`，把 `flow.requestSuggestion` 綁到 `onRequestSuggestion(chapterId)`。
- ChapterView 接收新 prop：current-suggestion 接 flow.currentSuggestion.value、pending-findings 接 flow.pendingFindings.value、pending-findings-inconclusive 接 flow.pendingFindingsInconclusive.value、is-loading 接 flow.isLoading.value。
- App.vue template 內監聽 `flow.cliFallbackPrompt` 顯示既有 CliFallbackDialog。

**SuggestionPanel prop 介面**：

- 新增 isLoading: boolean（取代內部 local 的 isLoading ref）
- 新增 pendingFindings: AuditResult or null
- 新增 pendingFindingsInconclusive: boolean
- 既有 current: SuggestionContent or null 維持
- 既有 emit request 維持

**ChapterView prop 介面**：

- 新增 isLoading: boolean
- 新增 pendingFindings: AuditResult or null
- 新增 pendingFindingsInconclusive: boolean
- 既有 currentSuggestion 維持並接 App.vue 端值

### Failure modes

- CLI 全部不可用且使用者選 cancel：currentSuggestion 不變動（保留上次顯示），pendingFindings 重設為 null，isLoading 設 false，按鈕恢復可點；不丟例外、不顯紅字錯誤。
- contextAssembler 拋例外（例如檔案讀取失敗）：useSuggestionFlow catch 該例外、isLoading 設 false、SuggestionPanel 顯示「組裝上下文失敗」inline 警示；不繼續 invoke。
- adapter.invoke 拋非 CliExecutionError／CliUnavailableError 的例外：useSuggestionFlow catch、isLoading 設 false、SuggestionPanel 顯示「AI 子行程錯誤」inline 警示。
- auditorDryRun 內部例外：視同 status=ok 處理（auditor 失敗不應阻擋使用者看到建議內容），但 console.warn 記下例外供開發者觀察。

### Acceptance criteria

- 單元測試 `tests/composables/useSuggestionFlow.test.ts`：
  - status=ok → currentSuggestion 被設、isLoading 變 true 再變 false、pendingFindings 為 null。
  - status=findings → currentSuggestion 被設、pendingFindings 被設、isLoading 變 false。
  - status=inconclusive → pendingFindingsInconclusive 為 true。
  - status=cancelled → currentSuggestion 不變、pendingFindings 重設為 null、isLoading 變 false。
  - CLI 不可用 promptFallback：cliFallbackPrompt 被設，使用者 resolve switch 後 invoke 切到另一個 source 重試。
- 整合測試 `tests/integration/suggestion-flow-wired.test.ts`：
  - mount App.vue（mock IPC）→ navigate 到章節 → 按下「給我建議」→ adapter.invoke mock 被呼叫一次、auditor mock 被呼叫一次、SuggestionPanel 顯示對應內容。
  - 此測試在實作前先紅燈，再實作 wire-up 使其變綠燈。
- 既有 e2e `tests/e2e/golden-path.test.ts` 不變動仍通過。
- 手動實機：開啟 dev、選一個小說、進入某章節、按「給我建議」→ 看到 SuggestionPanel 顯示建議內容（或 fallback dialog）；不再「按下沒反應」。

### Scope boundaries

**In scope**：

- App.vue 注入 useSuggestionFlow、向下傳 prop 與 event。
- 新增 useSuggestionFlow composable。
- SuggestionPanel 增加 isLoading 與 pendingFindings prop 與 inline 警示。
- ChapterView 新 prop 透傳。
- main.ts 不變動（bootstrapAdapters 已正確呼叫；useSuggestionFlow 在 App.vue setup 內建構）。
- 對應單元與整合測試。

**Out of scope**：

- ConflictDialog 三選一 UX（rewrite／改設定／忽略）。
- 為 useSuggestionRequest 增加 timeout 與 cancel button。
- 為 promptBuilder／contextAssembler 變動 prompt 結構。
- 修改任何 IPC handler。
- 修改 schema。
- onboarding 引導使用者去設定頁配置 CLI（CliFallbackDialog 文案已足）。

## Risks / Trade-offs

- [使用者重複按「給我建議」期間 isLoading 沒生效會觸發兩條 invoke] → 由 App.vue 持有 isLoading 並透過 prop 傳遞，按鈕在 SuggestionPanel 用 `:disabled="isLoading"` 守住。
- [contextAssembler 對大型小說（>50 chapter）組六層 context 較慢] → 不在本 change 處理；屬於 ai-context 既有效能議題，列入 Open Questions。
- [findings 警示文字與 ConflictDialog 未來 UX 可能語意重疊] → ConflictDialog change 啟動時把本 change 的 inline 警示替換為對話框觸發；本 change 的 inline 警示保留作為 ConflictDialog 進入點。
- [使用者預期「給我建議」即時回應但 CLI 子行程啟動需數百 ms] → isLoading 期間按鈕變灰並用 hover tooltip「AI 思考中…」（屬樣式微調，列入 tasks 但不算 risk-blocking）。
- [bootstrapAdapters 沒在某些路徑被呼叫]（例如 SSR 或測試）→ useSuggestionFlow 在 deps 缺 adapters 時讓 requestSuggestion 變成 no-op 加 console.warn，避免 production code 崩潰。

## Migration Plan

- 不涉及資料遷移；既有檔案格式不變。
- 部署：vite 重建後直接生效；無 IPC schema 變動，主行程不需重啟。
- 回退：revert 本 change 的 commit 即可；App.vue.onRequestSuggestion 復回空函式，按鈕回到「按下沒反應」狀態，無資料遺失風險。

## Open Questions

- contextAssembler 對 50 章節以上的小說的組裝延遲是否需要 budget 機制？暫不在本 change 處理。
- ConflictDialog change 啟動時，本 change 的 inline 警示是否完全替換或共存？留待 ConflictDialog change 自行決定。
- 使用者連續按多次「給我建議」是否要顯示「歷次建議」清單？暫不在本 change 處理。
