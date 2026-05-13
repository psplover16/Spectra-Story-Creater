# Character Evolution

對應 design.md D13：角色性格演化採 AI 偵測 + 建議使用者更新（不自動寫回）。

## 判斷規則

`src/services/evolution/personalityDetector.ts` 用簡單規則組偵測 drift：

- 若 character.personality 含某設定特徵（例：「市井狡黠」）
- 且 candidateResponse 出現對立特徵（例：「捨命相護」）
- → 偵測到 drift，回傳 `DriftFinding` 含 evidence、suggestedRewrite

未來可擴：相同 character 多次 drift 加重 evidence、AI 二次判定加旁證。

## 使用者決策流程

1. AI 回應通過 auditor.dryRun 後，系統獨立呼叫 personalityDetector
2. 若回傳 finding → DriftSuggestionPanel 顯示 evidence + suggestedRewrite + 三按鈕
3. 使用者：
   - **accept-as-suggested** → `applyDriftSuggestion` 將 suggestedRewrite 寫入 character.personality + log
   - **edit-then-accept** → 開 PersonalityRewriteDialog 讓使用者修改後寫入
   - **dismiss** → 只寫 log，不動 character

## 檔案位置

- 偵測：`src/services/evolution/personalityDetector.ts`
- log：`<novel>/characters/<character-id>.drift-log.jsonl`
- dismissals：`<novel>/characters/drift-dismissals.jsonl`

## 不自動寫回

`tests/services/evolution/personality-no-auto-write.test.ts` 透過 fs snapshot
證實 detector 本身不會 mutate 任何 character 檔。只有 `applyDriftSuggestion`
以 `accept-as-suggested` 或 `edit-then-accept` 路徑才會寫入。
