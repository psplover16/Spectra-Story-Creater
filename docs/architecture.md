# Architecture

對齊 design.md 的「介面 / 資料形狀」、「失敗模式」、「驗收（Acceptance Criteria）」三節。

## 介面 / 資料形狀

主要型別位於 `src/types/`：

- `Novel`、`WorldviewEntry`、`FactionSummary`、`OverallOutline`（`src/types/novel.ts`）
- `Character`、`Relationship`、`DriftFinding`（`src/types/character.ts`）
- `Chapter`、`ChapterBranch`、`Scene`（`src/types/chapter.ts`）
- `Faction`、`FactionSituationHistoryEntry`（`src/types/faction.ts`）
- `AiAdapter`、`AiInvokeInput`、`AiInvokeResult`、`AssembledContext`、`ResolveQuery`、`ResolveResult`（`src/types/ai.ts`）
- `AuditFinding`、`AuditResult`、`AuditIgnoreRecord`、`MuteWindow`（`src/types/audit.ts`）

`AiAdapter` 介面定義於 `src/services/ai/aiAdapter.ts`，CLI 子行程包裝於 `CliRunner` 介面，方便 adapter 注入測試 stub。

## 失敗模式

`src/services/ai/errors.ts` 集中錯誤類型：

- `CliUnavailableError` — CLI 不存在或無執行權限
- `CliExecutionError` — CLI 回非 0 exit code 或 stdout 超量
- `CliTimeoutError` — CLI 執行超時
- `UnknownRoleError` — 收到未列舉的 AI 職能

`src/services/files/errors.ts` 涵蓋檔案 I/O 失敗：

- `DuplicateNovelError`
- `SchemaValidationError`
- `MissingRelationshipTargetError`
- `EncodingError`

## 驗收（Acceptance Criteria）

對應 design.md 列點，分別由以下測試保證：

- 所有 service / adapter 都有對應 Vitest 單元測試（TDD）
- AiAdapter spawn mock 驗證 — `tests/services/ai/codexAdapter.test.ts` / `claudeAdapter.test.ts`
- AiResolver 4 層 fallback — `tests/services/ai/aiResolver.test.ts`
- ContextAssembler smart pickup + budget — `tests/services/ai/contextAssembler*.test.ts`
- ConsistencyAuditor 5 detector positive + negative — `tests/services/consistency/detectors/*.test.ts`
- HtmlExporter 兩格式 snapshot — `tests/services/export/templates/*.test.ts`（Stage E）
- 整合 golden-path — `tests/e2e/golden-path.test.ts`（Stage F）
- 程式碼層級檢查無 LLM endpoint — `tests/integration/no-llm-http.test.ts` + `eslint-plugin-local/no-llm-http.js`
- AiResolver UI 顯示來源 — `src/components/ai/SuggestionSourceBadge.vue`
