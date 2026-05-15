## Why

章節編輯畫面的「給我建議」按鈕在 production code 路徑下完全沒有作用：`src/App.vue` 收到 `requestSuggestion` 事件後的 handler 是個只剩註解的空函式，`src/main.ts` 雖然呼叫 `bootstrapAdapters()`，但既沒注入 resolver 也沒掛事件 handler。整套 AI 子行程鏈（resolver、context assembler、auditor、fallback dialog）都已實作，但僅在 e2e 測試中以手工拼裝方式跑得起來，使用者實機按下按鈕沒任何反應，整個專案最核心的「AI 輔助寫作」價值無法被使用者體驗到。

## What Changes

- App.vue 在 onMounted 注入 resolver、context assembler、auditor、fallback dialog 控制權，建立可在 renderer 內被各章節共用的 suggestion flow。
- 實作 `onRequestSuggestion(chapterId)` 完整流程：拉取章節與在場角色 → contextAssembler 組六層 context → useSuggestionRequest.invoke（內含 CLI 子行程呼叫、auditorDryRun、CLI fallback 三選一）→ 依 result.status 分支顯示 `currentSuggestion` 或警示文字。
- 抽出 `src/composables/useSuggestionFlow.ts` 封裝 wire-up 邏輯（resolver / contextAssembler / auditor 注入、currentSuggestion 與 isLoading state、onRequestSuggestion 主流程），避免 App.vue 膨脹；App.vue 只負責 mount 階段建構與向下傳遞 binding。
- 預設 role 採 `plot-driver`；使用者於設定頁有設定職能綁定時依職能綁定走 resolver。
- 一致性檢查 findings／inconclusive 時：在 SuggestionPanel 顯示 AI 產出的建議 + 紅色 inline 警示「本建議與既有設定不一致：<項目列表>」，使用者可選擇「仍採用」或「取消」；不在本 change 引入 ConflictDialog 三選一（rewrite／改設定／忽略）。
- CLI 全部不可用時沿用既有 `CliFallbackDialog`：使用者選 cancel → 收回 SuggestionPanel；選 switch → resolver 切到另一個 source 重試。
- SuggestionPanel 接收 `isLoading: boolean` prop，由 App.vue 在 invoke 期間設 true、結束後設 false；按鈕在 loading 期間維持禁用，避免重複觸發。
- AI 互動必須走 Codex CLI 或 Claude Code 子行程；resolver 依職能／角色／全域綁定決定該次呼叫使用何者，與 ai-switching 既有四層 fallback 一致。

## Non-Goals (optional)

- 不引入 ConflictDialog（rewrite／改設定／忽略 三選一 UX）；該 UX 留待另一個 change。
- 不新增任何 IPC channel；沿用既有 `ai:invoke`、`novel:read`、`character:list`、`chapter:list`。
- 不變更任何 schema（Novel／Character／Chapter／Faction／Worldview 不動）。
- 不新增 capability；本 change 僅修改既有 `app-shell` 的 suggestion 事件流要求。
- 不為 `useSuggestionRequest` 補 timeout／使用者中斷 cancel button；CLI 子行程自身已有 timeout，timeout 行為本身屬於 `ai-adapters` 範圍。
- 不依使用者游標所在欄位推斷 role；本 change 統一用 plot-driver 作為預設。
- 不修改 SuggestionPanel 的 UI 結構（除了新增 isLoading prop 與 inline 警示區塊以外）；按鈕命名／佈局／樣式不動。
- 不變更 useSuggestionRequest 的對外 API（型別與 invoke 介面維持，僅在必要時補 optional 欄位）。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `app-shell`：新增「使用者按下章節編輯畫面的『給我建議』按鈕後，renderer 必須真正觸發 AI 子行程呼叫並把結果回填至 SuggestionPanel」的需求，明確界定 onRequestSuggestion 的事件流契約、isLoading 狀態傳遞、findings／inconclusive 的 inline 警示行為、CLI 全部不可用時的 cancel 路徑。

## Impact

- Affected specs:
  - 修改：`app-shell`（新增 suggestion flow 事件契約）
- Affected code:
  - 修改：
    - `src/App.vue`
    - `src/main.ts`
    - `src/views/ChapterView.vue`
    - `src/components/ai/SuggestionPanel.vue`
  - 新增：
    - `src/composables/useSuggestionFlow.ts`
    - `tests/composables/useSuggestionFlow.test.ts`
    - `tests/integration/suggestion-flow-wired.test.ts`
  - 移除：
    - 無
- AI 行為涉及方：Codex CLI、Claude Code 兩者皆可；resolver 依使用者於設定頁設定的職能／角色／全域綁定決定，與既有 `ai-switching` 規格一致。
